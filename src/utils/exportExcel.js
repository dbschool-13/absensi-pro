import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { getFilterDates, parseTimeStr, parseIndoDate } from "./exportHelpers";

export const generateExcel = async (
  rawData,
  filterTahun,
  filterBulan,
  filterMinggu,
  filterGuru,
  hariKerja,
  isNative = false,
) => {
  if (!rawData || rawData.guru.length === 0) {
    toast.error("Tidak ada data!");
    return null;
  }

  const dates = getFilterDates(
    filterTahun,
    filterBulan,
    filterMinggu,
    rawData.libur || [],
    hariKerja,
  );
  let targetGuru =
    filterGuru !== "all"
      ? rawData.guru.filter((g) => g.nip === filterGuru)
      : rawData.guru;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Kehadiran");

  const borderAll = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const centerAlign = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  // 1. Judul Laporan
  worksheet.mergeCells("A1:E1");
  worksheet.getCell(
    "A1",
  ).value = `Rekapitulasi Kehadiran (Bulan ${filterBulan} - Tahun ${filterTahun})`;
  worksheet.getCell("A1").font = { bold: true, size: 14 };

  // 2. Setup Header Dinamis
  let col = 3;
  worksheet.getCell(3, 1).value = "No.";
  worksheet.getCell(3, 2).value = "Nama";
  worksheet.mergeCells(3, 1, 5, 1);
  worksheet.mergeCells(3, 2, 5, 2);

  dates.forEach((tgl) => {
    const { dayName, fullDate } = parseIndoDate(tgl);

    // Baris 3: Hari
    worksheet.getCell(3, col).value = dayName;
    worksheet.mergeCells(3, col, 3, col + 1);
    // Baris 4: Tanggal
    worksheet.getCell(4, col).value = fullDate;
    worksheet.mergeCells(4, col, 4, col + 1);
    // Baris 5: Jam Datang / Pulang
    worksheet.getCell(5, col).value = "Jam Datang";
    worksheet.getCell(5, col + 1).value = "Jam Pulang";

    col += 2;
  });

  const labelTotalJam =
    filterMinggu !== "all" ? "Total Jam\nMinggu Ini" : "Total Jam\nBulan Ini";
  worksheet.getCell(3, col).value = labelTotalJam;
  worksheet.mergeCells(3, col, 5, col);

  worksheet.getCell(3, col + 1).value = "Kekurangan Jam";
  worksheet.mergeCells(3, col + 1, 5, col + 1);

  // Terapkan Style ke seluruh Header (Baris 3-5)
  for (let r = 3; r <= 5; r++) {
    for (let c = 1; c <= col + 1; c++) {
      const cell = worksheet.getCell(r, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };
      cell.border = borderAll;
      cell.alignment = centerAlign;
      cell.font = { bold: true };
    }
  }

  // 3. Isi Data Baris per Guru
  let currentRow = 6;
  targetGuru.forEach((guru, idx) => {
    const row = worksheet.getRow(currentRow);
    let totalMenitBulan = 0;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = `${guru.nama}\n${guru.nip}`;
    row.getCell(1).alignment = centerAlign;
    row.getCell(2).alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true,
    };
    row.getCell(1).border = borderAll;
    row.getCell(2).border = borderAll;

    let c = 3;
    dates.forEach((tgl) => {
      const cellDtg = row.getCell(c);
      const cellPlg = row.getCell(c + 1);
      cellDtg.border = borderAll;
      cellPlg.border = borderAll;
      cellDtg.alignment = centerAlign;
      cellPlg.alignment = centerAlign;

      const absen = rawData.absen.find(
        (a) => a.nip === guru.nip && a.tanggal === tgl,
      );
      if (absen && absen.jam_datang && absen.jam_datang !== "--:--") {
        const dtg = absen.jam_datang;
        const plg =
          absen.jam_pulang && absen.jam_pulang !== "--:--"
            ? absen.jam_pulang
            : "-";

        cellDtg.value = dtg;
        cellPlg.value = plg;

        let menitHarian = 0;
        if (plg !== "-") {
          menitHarian = parseTimeStr(plg) - parseTimeStr(dtg);
          totalMenitBulan += menitHarian;
        }

        // Target 8 jam = 480 menit
        const isMemenuhi = menitHarian >= 480;
        const fontColor = isMemenuhi ? "FF15803D" : "FFDC2626"; // Hijau / Merah Tailwind

        cellDtg.font = { color: { argb: fontColor }, bold: true };
        cellPlg.font = { color: { argb: fontColor }, bold: true };
      } else {
        cellDtg.value = "-";
        cellPlg.value = "-";
      }
      c += 2;
    });

    // Kalkulasi Total
    const totalJam = (totalMenitBulan / 60).toFixed(1);
    const targetJam = dates.length * 8;
    const kurang = Math.max(0, targetJam - parseFloat(totalJam));

    const cellTotal = row.getCell(c);
    cellTotal.value = totalJam;
    cellTotal.border = borderAll;
    cellTotal.alignment = centerAlign;
    cellTotal.font = { bold: true };

    const cellKurang = row.getCell(c + 1);
    cellKurang.value = kurang.toFixed(1);
    cellKurang.border = borderAll;
    cellKurang.alignment = centerAlign;
    if (kurang > 0) {
      cellKurang.font = { color: { argb: "FFDC2626" }, bold: true };
    }

    currentRow++;
  });

  // 4. Lebar Kolom
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 25;
  for (let i = 3; i < col; i++) worksheet.getColumn(i).width = 11;
  worksheet.getColumn(col).width = 14;
  worksheet.getColumn(col + 1).width = 14;

  // =========================================================================
  // 5. PENYELESAIAN (DUAL-PLATFORM: APK ANDROID & WEB BROWSER)
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();

  if (isNative) {
    // LOGIKA UNTUK HP (APK) -> Ubah Buffer ke Base64 agar bisa disimpan oleh Capacitor
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64String = window.btoa(binary);

    return base64String; // Kembalikan string base64 ke AdminDashboard.jsx
  } else {
    // LOGIKA UNTUK BROWSER WEB -> Download langsung seperti biasa
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Rekap_Kehadiran_${filterBulan}_${filterTahun}.xlsx`);
    toast.success("Excel berhasil diunduh!");
    return null;
  }
};

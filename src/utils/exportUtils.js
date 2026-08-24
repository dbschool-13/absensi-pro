import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import "jspdf-autotable";
import toast from "react-hot-toast";

// Helper: Filter Tanggal
const getFilterDates = (
  filterTahun,
  filterBulan,
  filterMinggu,
  liburArray = [],
  hariKerja = 6,
) => {
  let dates = [];
  const y = parseInt(filterTahun);
  const m = parseInt(filterBulan) - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let start = 1;
  let end = daysInMonth;
  if (filterMinggu !== "all") {
    const w = parseInt(filterMinggu);
    start = (w - 1) * 7 + 1;
    end = w * 7;
    if (end > daysInMonth) end = daysInMonth;
  }

  for (let day = start; day <= end; day++) {
    const date = new Date(y, m, day);
    const dd = String(day).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    const dateStr = `${dd}/${mm}/${y}`;

    // Cek apakah hari tersebut adalah weekend
    const dayOfWeek = date.getDay();
    const isWeekend =
      parseInt(hariKerja) === 5
        ? dayOfWeek === 0 || dayOfWeek === 6
        : dayOfWeek === 0;

    // Masukkan ke array jika BUKAN weekend dan BUKAN hari libur
    if (!isWeekend && !liburArray.includes(dateStr)) {
      dates.push(dateStr);
    }
  }
  return dates;
};

// Helper: Format Tanggal ke Hari
const parseIndoDate = (dateStr) => {
  const [d, m, y] = dateStr.split("/");
  const dateObj = new Date(y, parseInt(m) - 1, d);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return {
    dayName: days[dateObj.getDay()],
    fullDate: `${d} ${months[parseInt(m) - 1]} ${y}`,
  };
};

const parseTimeStr = (ts) => {
  if (!ts || ts === "--:--") return 0;
  const [h, m] = ts.split(":");
  return parseInt(h) * 60 + parseInt(m);
};

// Pembentuk Matriks Data
const prepareExportData = (
  rawData,
  filterTahun,
  filterBulan,
  filterMinggu,
  filterGuru,
  hariKerja,
) => {
  const dates = getFilterDates(
    filterTahun,
    filterBulan,
    filterMinggu,
    rawData.libur || [],
    hariKerja,
  );
  let targetGuru = rawData.guru;
  if (filterGuru !== "all")
    targetGuru = rawData.guru.filter((g) => g.nip === filterGuru);

  const exportRows = targetGuru.map((guru, idx) => {
    let totalMenitBulan = 0;
    let rowData = { No: idx + 1, Nama: guru.nama, NIP: guru.nip, daily: [] };

    dates.forEach((tgl) => {
      const absen = rawData.absen.find(
        (a) => a.nip === guru.nip && a.tanggal === tgl,
      );
      if (absen && absen.jam_datang && absen.jam_datang !== "--:--") {
        const dtg = absen.jam_datang;
        const plg =
          absen.jam_pulang && absen.jam_pulang !== "--:--"
            ? absen.jam_pulang
            : "-";

        let menitHarian = 0;
        if (plg !== "-") {
          menitHarian = parseTimeStr(plg) - parseTimeStr(dtg);
          totalMenitBulan += menitHarian;
        }
        const isMemenuhi = menitHarian >= 8 * 60;
        rowData.daily.push({
          datang: dtg,
          pulang: plg,
          isMemenuhi,
          hasData: true,
        });
      } else {
        rowData.daily.push({
          datang: "-",
          pulang: "-",
          isMemenuhi: false,
          hasData: false,
        });
      }
    });

    const totalJam = (totalMenitBulan / 60).toFixed(1);
    const targetJam = dates.length * 8;
    let kurang = targetJam - parseFloat(totalJam);
    if (kurang < 0) kurang = 0;

    rowData.TotalJam = totalJam;
    rowData.Kekurangan = kurang.toFixed(1);
    return rowData;
  });
  return { dates, exportRows };
};

// ==========================================
// EXPORT EXCEL
// ==========================================
export const generateExcel = (
  rawData,
  filterTahun,
  filterBulan,
  filterMinggu,
  filterGuru,
  hariKerja,
) => {
  if (rawData.guru.length === 0)
    return toast.error("Tidak ada data untuk diekspor!");

  const { dates, exportRows } = prepareExportData(
    rawData,
    filterTahun,
    filterBulan,
    filterMinggu,
    filterGuru,
    hariKerja,
  );
  const wsData = [];

  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: borderStyle,
    fill: { fgColor: { rgb: "F8FAFC" } },
  };
  const dataStyle = {
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: borderStyle,
  };

  wsData.push([
    {
      v: `Rekapitulasi Kehadiran (Bulan ${filterBulan} - Tahun ${filterTahun})`,
      s: { font: { bold: true, sz: 14 } },
    },
  ]);
  wsData.push([]);

  const row1 = [],
    row2 = [],
    row3 = [];
  const labelTotalJam =
    filterMinggu !== "all" ? "Total Jam\nMinggu Ini" : "Total Jam\nBulan Ini";

  row1.push({ v: "No.", s: headerStyle }, { v: "Nama", s: headerStyle });
  row2.push({ v: "", s: headerStyle }, { v: "", s: headerStyle });
  row3.push({ v: "", s: headerStyle }, { v: "", s: headerStyle });

  dates.forEach((tgl) => {
    const { dayName, fullDate } = parseIndoDate(tgl);
    row1.push({ v: dayName, s: headerStyle }, { v: "", s: headerStyle });
    row2.push({ v: fullDate, s: headerStyle }, { v: "", s: headerStyle });
    row3.push(
      { v: "Jam Datang", s: headerStyle },
      { v: "Jam Pulang", s: headerStyle },
    );
  });

  row1.push(
    { v: labelTotalJam, s: headerStyle },
    { v: "Kekurangan Jam", s: headerStyle },
  );
  row2.push({ v: "", s: headerStyle }, { v: "", s: headerStyle });
  row3.push({ v: "", s: headerStyle }, { v: "", s: headerStyle });

  wsData.push(row1, row2, row3);

  const merges = [
    { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 4, c: 1 } },
  ];

  let colIndex = 2;
  dates.forEach(() => {
    merges.push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 1 } });
    merges.push({ s: { r: 3, c: colIndex }, e: { r: 3, c: colIndex + 1 } });
    colIndex += 2;
  });

  merges.push({ s: { r: 2, c: colIndex }, e: { r: 4, c: colIndex } });
  merges.push({ s: { r: 2, c: colIndex + 1 }, e: { r: 4, c: colIndex + 1 } });

  exportRows.forEach((row) => {
    const rowArr = [];
    rowArr.push({ v: row.No, s: dataStyle });
    rowArr.push({
      v: `${row.Nama}\n${row.NIP}`,
      s: {
        ...dataStyle,
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
      },
    });

    row.daily.forEach((d) => {
      let textColor = d.hasData
        ? d.isMemenuhi
          ? "15803d"
          : "dc2626"
        : "000000";
      rowArr.push({
        v: d.datang,
        s: {
          ...dataStyle,
          font: { color: { rgb: textColor }, bold: d.hasData },
        },
      });
      rowArr.push({
        v: d.pulang,
        s: {
          ...dataStyle,
          font: { color: { rgb: textColor }, bold: d.hasData },
        },
      });
    });

    rowArr.push({ v: row.TotalJam, s: { ...dataStyle, font: { bold: true } } });
    let kurangColor = parseFloat(row.Kekurangan) > 0 ? "dc2626" : "000000";
    rowArr.push({
      v: row.Kekurangan,
      s: {
        ...dataStyle,
        font: {
          color: { rgb: kurangColor },
          bold: parseFloat(row.Kekurangan) > 0,
        },
      },
    });
    wsData.push(rowArr);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!merges"] = merges;

  const wscols = [{ wch: 5 }, { wch: 25 }];
  dates.forEach(() => {
    wscols.push({ wch: 11 }, { wch: 11 });
  });
  wscols.push({ wch: 14 }, { wch: 14 });
  ws["!cols"] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap_Kehadiran");
  XLSX.writeFile(wb, `Rekap_Kehadiran_${filterBulan}_${filterTahun}.xlsx`);
  toast.success("Berhasil mengunduh Excel!");
};

// ==========================================
// EXPORT PDF
// ==========================================
export const generatePDF = (
  rawData,
  filterTahun,
  filterBulan,
  filterMinggu,
  filterGuru,
  hariKerja,
) => {
  if (!rawData || rawData.guru.length === 0) {
    toast.error("Tidak ada data untuk diekspor!");
    return;
  }

  // Dapatkan daftar tanggal valid sesuai sistem hari kerja & libur
  const validDates = getFilterDates(
    filterTahun,
    filterBulan,
    filterMinggu,
    rawData.libur || [],
    hariKerja,
  );
  const totalHariKerjaTarget = validDates.length;

  let targetGuru = rawData.guru;
  if (filterGuru !== "all") {
    targetGuru = rawData.guru.filter((g) => g.nip === filterGuru);
  }

  // Hitung rekap masing-masing pegawai
  const rows = targetGuru.map((guru, idx) => {
    let totalHadir = 0;
    let totalMenitKerja = 0;

    validDates.forEach((tgl) => {
      const absen = rawData.absen.find(
        (a) => a.nip === guru.nip && a.tanggal === tgl,
      );
      if (absen && absen.jam_datang && absen.jam_datang !== "--:--") {
        totalHadir++;
        const dtg = absen.jam_datang;
        const plg =
          absen.jam_pulang && absen.jam_pulang !== "--:--"
            ? absen.jam_pulang
            : null;

        if (plg) {
          let menitHarian = parseTimeStr(plg) - parseTimeStr(dtg);
          if (menitHarian > 0) totalMenitKerja += menitHarian;
        }
      }
    });

    const totalJam = (totalMenitKerja / 60).toFixed(1);
    const tidakHadir = totalHariKerjaTarget - totalHadir;
    const tdkHadirFinal = tidakHadir < 0 ? 0 : tidakHadir;

    // Kekurangan jam dari total target (Total hari kerja * 8 Jam)
    const targetJamBulan = totalHariKerjaTarget * 8;
    let kurangJam = targetJamBulan - parseFloat(totalJam);
    if (kurangJam < 0) kurangJam = 0;

    // Persentase kehadiran
    const persentase =
      totalHariKerjaTarget > 0
        ? Math.round((totalHadir / totalHariKerjaTarget) * 100)
        : 0;
    const persentaseFinal = persentase > 100 ? 100 : persentase;

    return [
      idx + 1,
      guru.nama,
      guru.nip,
      `${totalHariKerjaTarget} Hari`,
      `${totalHadir} Hari`,
      `${tdkHadirFinal} Hari`,
      `${totalJam} Jam`,
      `${kurangJam.toFixed(1)} Jam`,
      `${persentaseFinal}%`,
    ];
  });

  const doc = new jsPDF("landscape", "mm", "a4");

  doc.setFontSize(14);
  doc.text("Laporan Rekapitulasi Kehadiran Pegawai", 14, 15);
  doc.setFontSize(10);
  const labelPeriode =
    filterMinggu !== "all" ? `(Minggu ke-${filterMinggu})` : "";
  doc.text(
    `Periode: Bulan ${filterBulan} Tahun ${filterTahun} ${labelPeriode}`,
    14,
    22,
  );

  const head = [
    [
      "No.",
      "Nama",
      "NIP",
      "Hari Kerja",
      "Jumlah Hadir",
      "Tidak Hadir",
      "Jumlah Jam",
      "Kekurangan Jam",
      "Persentase",
    ],
  ];

  autoTable(doc, {
    head: head,
    body: rows,
    startY: 28,
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { halign: "left", cellWidth: 50 },
      2: { cellWidth: 35 },
    },
    didParseCell: function (data) {
      // Berikan warna merah pada kolom kekurangan jam jika nilainya > 0
      if (data.section === "body" && data.column.index === 7) {
        if (parseFloat(data.cell.raw) > 0) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(`Rekap_Kehadiran_${filterBulan}_${filterTahun}.pdf`);
  toast.success("Berhasil mengunduh PDF!");
};

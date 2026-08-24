import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { getFilterDates, parseTimeStr } from "./exportHelpers";

export const generatePDF = (
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

  const validDates = getFilterDates(
    filterTahun,
    filterBulan,
    filterMinggu,
    rawData.libur || [],
    hariKerja,
  );
  const totalHariKerjaTarget = validDates.length;

  let targetGuru =
    filterGuru !== "all"
      ? rawData.guru.filter((g) => g.nip === filterGuru)
      : rawData.guru;

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
    const targetJamBulan = totalHariKerjaTarget * 8;
    let kurangJam = targetJamBulan - parseFloat(totalJam);
    const persentase =
      totalHariKerjaTarget > 0
        ? Math.round((totalHadir / totalHariKerjaTarget) * 100)
        : 0;

    return [
      idx + 1,
      guru.nama,
      guru.nip,
      `${totalHariKerjaTarget} Hari`,
      `${totalHadir} Hari`,
      `${tidakHadir < 0 ? 0 : tidakHadir} Hari`,
      `${totalJam} Jam`,
      `${kurangJam < 0 ? 0 : kurangJam.toFixed(1)} Jam`,
      `${persentase > 100 ? 100 : persentase}%`,
    ];
  });

  const doc = new jsPDF("landscape", "mm", "a4");
  doc.setFontSize(14);
  doc.text("Laporan Rekapitulasi Kehadiran Pegawai", 14, 15);
  doc.setFontSize(10);
  doc.text(
    `Periode: Bulan ${filterBulan} Tahun ${filterTahun} ${
      filterMinggu !== "all" ? "(Minggu ke-" + filterMinggu + ")" : ""
    }`,
    14,
    22,
  );

  autoTable(doc, {
    head: [
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
    ],
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
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { halign: "left", cellWidth: 50 },
      2: { cellWidth: 35 },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 7) {
        if (parseFloat(data.cell.raw) > 0) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // =========================================================================
  // PENYELESAIAN (DUAL-PLATFORM: APK ANDROID & WEB BROWSER)
  // =========================================================================
  if (isNative) {
    // LOGIKA UNTUK HP (APK) -> Ambil data base64 langsung dari jsPDF
    const pdfDataUri = doc.output("datauristring");

    // Outputnya berupa "data:application/pdf;base64,JVBERi0xLjMKJcf..."
    // Kita pisahkan (split) pakai koma, dan ambil bagian setelah koma (string base64-nya saja)
    const pdfBase64 = pdfDataUri.split(",")[1];

    return pdfBase64; // Kembalikan string base64 ke AdminDashboard.jsx
  } else {
    // LOGIKA UNTUK BROWSER WEB -> Download langsung
    doc.save(`Rekap_Kehadiran_${filterBulan}_${filterTahun}.pdf`);
    toast.success("Berhasil mengunduh PDF!");
    return null;
  }
};

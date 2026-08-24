import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem"; // Pastikan Directory diimpor
import { Share } from "@capacitor/share";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Filter, Calendar } from "lucide-react";
import axios from "axios";
import { GAS_API_URL } from "../services/api";
import toast from "react-hot-toast";
import { generateExcel } from "../utils/exportExcel";
import { generatePDF } from "../utils/exportPdf";
import { getFilterDates, parseTimeStr } from "../utils/exportHelpers";
import AdminBottomNav from "../components/AdminBottomNav";
import {
  showGlobalLoader,
  hideGlobalLoader,
} from "../components/PageTransitionLoader";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rawData, setRawData] = useState({ guru: [], absen: [] });

  // State Filter
  const d = new Date();
  const [filterTahun, setFilterTahun] = useState(String(d.getFullYear()));
  const [filterBulan, setFilterBulan] = useState(
    String(d.getMonth() + 1).padStart(2, "0"),
  );
  const [filterMinggu, setFilterMinggu] = useState("all");
  const [filterGuru, setFilterGuru] = useState("all");

  const userHariKerja = user?.sekolah?.hari_kerja || "1,2,3,4,5,6";

  const fetchAdminData = useCallback(async () => {
    showGlobalLoader();
    try {
      // 💡 PERBAIKAN SHARDING: Kirimkan sinyal bulan dan tahun yang difilter Admin
      const payload = {
        action: "get_admin_dashboard",
        tanggal: `01/${filterBulan}/${filterTahun}`,
        id_sekolah: user?.id_sekolah || user?.sekolah?.id_sekolah,
      };

      const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });

      if (res.data.status === "success") {
        setRawData(res.data.data);
      } else {
        toast.error("Gagal mengambil data dari server");
      }
    } catch (error) {
      toast.error("Gagal mengambil data dari server");
      console.error(error);
    } finally {
      hideGlobalLoader();
    }
    // 💡 PERBAIKAN: Masukkan filterBulan dan filterTahun ke dependency
  }, [user?.id_sekolah, user?.sekolah?.id_sekolah, filterBulan, filterTahun]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // --- LOGIKA UI REKAP RINGKAS (UNTUK TAMPILAN TABEL WEB) ---
  // const getWorkingDays = (
  //   year,
  //   month,
  //   weekStr,
  //   liburArray = [],
  //   hariKerjaStr = "1,2,3,4,5,6",
  // ) => {
  //   let count = 0;
  //   const y = parseInt(year);
  //   const m = parseInt(month) - 1;
  //   const daysInMonth = new Date(y, m + 1, 0).getDate();
  //   let start = 1;
  //   let end = daysInMonth;
  //   if (weekStr !== "all") {
  //     const w = parseInt(weekStr);
  //     start = (w - 1) * 7 + 1;
  //     end = w * 7;
  //     if (end > daysInMonth) end = daysInMonth;
  //   }

  //   const activeDaysArray = hariKerjaStr.toString().split(",").map(Number);

  //   for (let day = start; day <= end; day++) {
  //     const dd = String(day).padStart(2, "0");
  //     const mm = String(m + 1).padStart(2, "0");
  //     const dateStr = `${dd}/${mm}/${y}`;

  //     const dayOfWeek = new Date(y, m, day).getDay();
  //     const isOffDay = !activeDaysArray.includes(dayOfWeek);

  //     if (!isOffDay && !liburArray.includes(dateStr)) {
  //       count++;
  //     }
  //   }
  //   return count;
  // };

  // HAPUS FUNGSI getWorkingDays LAMA. KITA AKAN MENGGUNAKAN getFilterDates DARI utils/exportHelpers

  const rekapData = useMemo(() => {
    if (rawData.guru.length === 0) return [];

    // 1. Ambil HANYA tanggal yang valid berdasarkan filter (SAMA PERSIS DENGAN EXCEL/PDF)
    const validDates = getFilterDates(
      filterTahun,
      filterBulan,
      filterMinggu,
      rawData.libur || [],
      userHariKerja,
    );
    const hariKerjaTarget = validDates.length;

    let targetGuru = rawData.guru;
    if (filterGuru !== "all") {
      targetGuru = rawData.guru.filter((g) => g.nip === filterGuru);
    }

    return targetGuru.map((guru) => {
      let totalHadir = 0;
      let totalMenitKerja = 0;

      // 2. Loop HANYA pada tanggal yang valid
      validDates.forEach((tgl) => {
        // Cari absensi guru ini pada tanggal yang valid
        const absen = rawData.absen.find(
          (a) => a.nip === guru.nip && a.tanggal === tgl,
        );

        if (absen && absen.jam_datang && absen.jam_datang !== "--:--") {
          totalHadir++;

          const dtg = absen.jam_datang;
          // Asumsi jam pulang, jika tidak ada/kosong, tetap anggap null
          const plg =
            absen.jam_pulang && absen.jam_pulang !== "--:--"
              ? absen.jam_pulang
              : null;

          if (plg) {
            // Hitung menit harian berdasarkan jam datang dan pulang
            let menitHarian = parseTimeStr(plg) - parseTimeStr(dtg);
            if (menitHarian > 0) totalMenitKerja += menitHarian;
          }
        }
      });

      // 3. Kalkulasi hasil akhir (SAMA PERSIS DENGAN EXCEL/PDF)
      const totalJamFinal = (totalMenitKerja / 60).toFixed(1);
      const tidakHadir = hariKerjaTarget - totalHadir;
      // Hitung kekurangan jam kerja berdasarkan target 8 jam per hari
      const targetJamPeriode = hariKerjaTarget * 8;
      let kurangJam = targetJamPeriode - parseFloat(totalJamFinal);

      const persentase =
        hariKerjaTarget > 0
          ? Math.round((totalHadir / hariKerjaTarget) * 100)
          : 0;

      return {
        nip: guru.nip,
        nama: guru.nama,
        hari_kerja: hariKerjaTarget,
        hadir: totalHadir,
        tidak_hadir: tidakHadir < 0 ? 0 : tidakHadir,
        total_jam: totalJamFinal,
        kurang_jam: kurangJam < 0 ? 0 : kurangJam.toFixed(1), // Menambahkan parameter kurang jam agar tampil di tabel
        persentase: persentase > 100 ? 100 : persentase,
      };
    });
  }, [
    rawData,
    filterTahun,
    filterBulan,
    filterMinggu,
    filterGuru,
    userHariKerja,
  ]); // <-- Pastikan dependency lengkap

  const handleExportExcel = async () => {
    showGlobalLoader();
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const fileName = `Rekap_Excel_${filterBulan}_${filterTahun}.xlsx`;

      // PERBAIKAN 1: Tambahkan "await" karena generateExcel adalah fungsi async
      const base64Data = await generateExcel(
        rawData,
        filterTahun,
        filterBulan,
        filterMinggu,
        filterGuru,
        userHariKerja,
        Capacitor.isNativePlatform(),
      );

      if (Capacitor.isNativePlatform() && base64Data) {
        // PERBAIKAN 2: Gunakan Directory.Cache agar bebas dari pemblokiran keamanan Android
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: fileName,
          url: savedFile.uri,
          dialogTitle: "Simpan atau Bagikan Rekap Excel",
        });
      }
    } catch (error) {
      console.error("Error generating Excel:", error);
      // Munculkan error di HP agar kita tahu jika ada masalah lain
      alert("Gagal Excel: " + (error.message || JSON.stringify(error)));
    } finally {
      hideGlobalLoader();
    }
  };

  const handleExportPDF = async () => {
    showGlobalLoader();
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const fileName = `Rekap_PDF_${filterBulan}_${filterTahun}.pdf`;

      const base64Data = generatePDF(
        rawData,
        filterTahun,
        filterBulan,
        filterMinggu,
        filterGuru,
        userHariKerja,
        Capacitor.isNativePlatform(),
      );

      if (Capacitor.isNativePlatform() && base64Data) {
        // PERBAIKAN 2: Gunakan Directory.Cache
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: fileName,
          url: savedFile.uri,
          dialogTitle: "Simpan atau Bagikan Rekap PDF",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal PDF: " + (error.message || JSON.stringify(error)));
    } finally {
      hideGlobalLoader();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 pb-24">
      {/* Header Panel */}
      <div className="max-w-7xl mx-auto bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Rekapitulasi</h1>
          <p className="text-blue-200">Filter dinamis & Export Laporan</p>
        </div>
        <AdminBottomNav />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* PANEL FILTER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" /> Filter Laporan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Guru & Staf
              </label>
              <select
                value={filterGuru}
                onChange={(e) => setFilterGuru(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary outline-none"
              >
                <option value="all">-- Semua Guru & Staf --</option>
                {rawData.guru.map((g, idx) => (
                  <option key={idx} value={g.nip}>
                    {g.nama} ({g.nip})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Tahun
              </label>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary outline-none"
              >
                {[0, 1, 2].map((y) => {
                  const year = d.getFullYear() - y;
                  return (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Bulan
              </label>
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary outline-none"
              >
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Minggu Ke-
              </label>
              <select
                value={filterMinggu}
                onChange={(e) => setFilterMinggu(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary outline-none"
              >
                <option value="all">Semua Minggu (1 Bulan)</option>
                <option value="1">Minggu 1 (Tgl 1 - 7)</option>
                <option value="2">Minggu 2 (Tgl 8 - 14)</option>
                <option value="3">Minggu 3 (Tgl 15 - 21)</option>
                <option value="4">Minggu 4 (Tgl 22 - 28)</option>
                <option value="5">Minggu 5 (Tgl 29 - Selesai)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABEL REKAP UI */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Tabel Hasil Rekapan
            </h2>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportExcel}
                disabled={rawData.guru.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                <FileText className="w-4 h-4" /> Export Excel
              </button>

              <button
                onClick={handleExportPDF}
                disabled={rawData.guru.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-100">
                  <th className="p-4 font-bold whitespace-nowrap">
                    NIP / Nama Guru
                  </th>
                  <th className="p-4 font-bold text-center whitespace-nowrap">
                    Hari Kerja
                  </th>
                  <th className="p-4 font-bold text-center whitespace-nowrap">
                    Jml Hadir
                  </th>
                  <th className="p-4 font-bold text-center whitespace-nowrap">
                    Tdk Hadir
                  </th>
                  <th className="p-4 font-bold text-center whitespace-nowrap">
                    Jml Jam
                  </th>
                  <th className="p-4 font-bold text-center whitespace-nowrap">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      Tidak ada data yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  rekapData.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800">{item.nama}</p>
                        <p className="text-xs text-slate-500">{item.nip}</p>
                      </td>
                      <td className="p-4 text-center text-sm font-semibold text-slate-500">
                        {item.hari_kerja} Hari
                      </td>
                      <td className="p-4 text-center text-sm font-bold text-blue-600">
                        {item.hadir} Hari
                      </td>
                      <td className="p-4 text-center text-sm font-bold text-red-500">
                        {item.tidak_hadir} Hari
                      </td>
                      <td className="p-4 text-center text-sm font-bold text-slate-700">
                        {item.total_jam} Jam
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.persentase >= 80
                              ? "bg-green-100 text-green-700"
                              : item.persentase >= 50
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.persentase}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

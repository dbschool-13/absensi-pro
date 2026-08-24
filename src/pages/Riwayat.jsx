import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Calendar, Clock, History } from "lucide-react";
import axios from "axios";
import { GAS_API_URL } from "../services/api";
import GuruBottomNav from "../components/GuruBottomNav";
import {
  showGlobalLoader,
  hideGlobalLoader,
} from "../components/PageTransitionLoader";

export default function Riwayat() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [riwayatData, setRiwayatData] = useState([]);

  // Filter State
  const d = new Date();
  const [filterBulan, setFilterBulan] = useState(
    String(d.getMonth() + 1).padStart(2, "0"),
  );
  const [filterTahun, setFilterTahun] = useState(String(d.getFullYear()));

  const fetchRiwayat = useCallback(async () => {
    showGlobalLoader();
    try {
      // 💡 PERBAIKAN: Beritahu server bulan dan tahun yang sedang dicari
      // Kita "mengelabui" server dengan mengirimkan tanggal 01 di bulan/tahun yang difilter
      const payload = {
        action: "get_dashboard",
        nip: user.nip,
        tanggal: `01/${filterBulan}/${filterTahun}`,
        id_sekolah: user?.sekolah?.id_sekolah,
      };

      const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      if (res.data.status === "success") {
        setRiwayatData(res.data.data.riwayat || []);
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      hideGlobalLoader();
    }
    // 💡 PERBAIKAN: Masukkan filterBulan dan filterTahun ke dalam kurung siku di bawah ini
    // Agar setiap kali filter diganti, aplikasi otomatis meminta data baru ke server
  }, [user.nip, user?.sekolah?.id_sekolah, filterBulan, filterTahun]);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  // Filter Data berdasarkan Bulan & Tahun
  const filteredData = riwayatData.filter((item) => {
    // Format tanggal sheet: DD/MM/YYYY (contoh: 06/08/2026)
    if (!item.tanggal) return false;
    const [dd, mm, yyyy] = item.tanggal.split("/");
    return mm === filterBulan && yyyy === filterTahun;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header dengan Gradien Tema Dashboard */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-b-[2rem] shadow-lg text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Riwayat Absensi</h1>
            <p className="text-blue-100 text-xs">Rekap kehadiran bulanan</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Filter Area */}
        <div className="glass-panel bg-white p-3 mb-4 flex gap-3 shadow-sm border border-slate-100 rounded-xl">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Bulan
            </label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Tahun
            </label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
        </div>

        {/* List Data */}
        {filteredData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-600">
              Tidak ada riwayat absen
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Belum ada data untuk bulan ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {filteredData.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-bold text-slate-700 text-sm">
                      {item.tanggal}
                    </span>
                  </div>

                  {/* PERBAIKAN LOGIKA STATUS KERJA */}
                  {item.status_kerja === "Memenuhi Target" ? (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md uppercase">
                      Memenuhi
                    </span>
                  ) : item.status_kerja === "Belum Memenuhi Target" ? (
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md uppercase">
                      Kurang Jam
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">
                      Belum Selesai
                    </span>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">
                      Datang
                    </p>
                    <p className="text-sm font-bold flex items-center gap-1 text-slate-700">
                      <Clock className="w-3 h-3 text-blue-500" />{" "}
                      {item.jam_datang !== "--:--" ? item.jam_datang : "-"}
                    </p>
                  </div>
                  <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">
                      Pulang
                    </p>
                    <p className="text-sm font-bold flex items-center gap-1 text-slate-700">
                      <Clock className="w-3 h-3 text-orange-500" />{" "}
                      {item.jam_pulang !== "--:--" ? item.jam_pulang : "-"}
                    </p>
                  </div>
                  <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100 text-right">
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">
                      Total
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {item.total_jam}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <GuruBottomNav />
    </div>
  );
}

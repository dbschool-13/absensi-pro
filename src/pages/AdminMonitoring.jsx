import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { GAS_API_URL } from "../services/api";
import AdminBottomNav from "../components/AdminBottomNav";
import { Activity, Clock, Users, UserX, UserCheck } from "lucide-react";
import {
  showGlobalLoader,
  hideGlobalLoader,
} from "../components/PageTransitionLoader";
import GuruBottomNav from "../components/GuruBottomNav";

export default function AdminMonitoring() {
  const { user } = useAuth();
  const [pegawaiData, setPegawaiData] = useState([]);

  const getFormattedDateString = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Tambahkan parameter showLoadingUI agar kita bisa mengontrol kapan loader muncul
  const fetchMonitoring = useCallback(
    async (showLoadingUI = true) => {
      if (showLoadingUI) showGlobalLoader();

      try {
        const payload = {
          action: "get_monitoring",
          id_sekolah: user?.sekolah?.id_sekolah,
          tanggal: getFormattedDateString(),
        };

        const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        });

        if (res.data.status === "success") {
          setPegawaiData(res.data.data);
        }
      } catch (error) {
        console.error("Gagal memuat monitoring", error);
      } finally {
        if (showLoadingUI) hideGlobalLoader();
      }
    },
    [user?.sekolah?.id_sekolah],
  );

  // Polling Realtime 30 Detik
  useEffect(() => {
    // 1. Tarikan pertama: MUNCULKAN LOADER
    fetchMonitoring(true);

    // 2. Tarikan interval (setiap 30 detik): SEMBUNYIKAN LOADER (berjalan di background)
    const interval = setInterval(() => {
      fetchMonitoring(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchMonitoring]);

  const totalPegawai = pegawaiData.length;
  const sudahAbsen = pegawaiData.filter(
    (p) => p.status !== "Belum Absen",
  ).length;
  const belumAbsen = totalPegawai - sudahAbsen;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Panel Bergaya Premium (Sama dengan Riwayat & AdminDashboard) */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-6 sticky top-0 z-40 shadow-lg flex items-center justify-between text-white rounded-b-[2rem]">
        <div>
          <h1 className="font-bold text-xl leading-tight">Live Monitoring</h1>
          <p className="text-blue-200 text-xs mt-1 font-medium">
            Pantau Kehadiran Hari Ini
          </p>
        </div>
        <div className="p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl relative flex items-center justify-center border border-white/20 shadow-sm">
          <Activity className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-indigo-700 rounded-full animate-ping"></span>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-indigo-700 rounded-full"></span>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 -mt-4 relative z-30">
        {/* Ringkasan Status */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-white/80 backdrop-blur-lg p-2 rounded-3xl shadow-sm border border-slate-100">
          <div className="bg-slate-50 p-3 rounded-2xl text-center">
            <Users className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total
            </p>
            <p className="text-xl font-black text-slate-800">{totalPegawai}</p>
          </div>
          <div className="bg-green-50/70 p-3 rounded-2xl text-center border border-green-100/50">
            <UserCheck className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
              Hadir
            </p>
            <p className="text-xl font-black text-green-700">{sudahAbsen}</p>
          </div>
          <div className="bg-red-50/70 p-3 rounded-2xl text-center border border-red-100/50">
            <UserX className="w-5 h-5 mx-auto text-red-400 mb-1" />
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
              Belum
            </p>
            <p className="text-xl font-black text-red-600">{belumAbsen}</p>
          </div>
        </div>

        {/* Daftar Pegawai */}
        <div className="space-y-3">
          {pegawaiData.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                Belum ada data pegawai.
              </p>
            </div>
          ) : (
            pegawaiData.map((p, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">
                      {p.nama}
                    </h3>
                    <span className="inline-block mt-1 bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                      {p.role}
                    </span>
                  </div>
                  {p.status === "Sudah Pulang" ? (
                    <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                      Selesai
                    </span>
                  ) : p.status === "Sudah Datang" ? (
                    <span className="bg-green-100 text-green-700 text-[10px] uppercase font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                      Bekerja
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                      Belum Absen
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-2.5 border border-slate-100/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                      <Clock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Datang
                      </p>
                      <p className="text-xs font-black text-slate-700">
                        {p.jam_datang}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                      <Clock className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Pulang
                      </p>
                      <p className="text-xs font-black text-slate-700">
                        {p.jam_pulang}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {user?.role === "admin" ? <AdminBottomNav /> : <GuruBottomNav />}
    </div>
  );
}

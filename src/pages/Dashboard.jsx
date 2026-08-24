import { useState, useEffect, useCallback, useRef } from "react";
import { Network } from "@capacitor/network";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, CheckCircle2, AlertCircle, Map } from "lucide-react";
import GuruBottomNav from "../components/GuruBottomNav";
import axios from "axios";
import { GAS_API_URL } from "../services/api";
import AbsensiModal from "../components/AbsensiModal";
import toast from "react-hot-toast";
import {
  showGlobalLoader,
  hideGlobalLoader,
} from "../components/PageTransitionLoader"; // <-- TAMBAHKAN INI

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [absenType, setAbsenType] = useState("Datang");

  const getFormattedDateString = (date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Jam Realtime detik per detik
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = useCallback(
    async (showLoadingUI = true) => {
      if (!navigator.onLine) {
        if (showLoadingUI) hideGlobalLoader();
        return;
      }

      if (showLoadingUI) showGlobalLoader(); // <-- GUNAKAN GLOBAL LOADER

      try {
        const payload = {
          action: "get_dashboard",
          nip: user.nip,
          tanggal: getFormattedDateString(new Date()),
          id_sekolah: user?.sekolah?.id_sekolah,
        };

        const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        });

        if (res.data.status === "success") {
          setDashboardData(res.data.data);

          // JURUS SAKTI 2: Sinkronisasi diam-diam ke memori HP Guru
          if (res.data.data.setting?.logo_url) {
            localStorage.setItem(
              "saved_logo_url",
              res.data.data.setting.logo_url,
            );
          }
        }
      } catch (error) {
        if (error.code !== "ERR_NETWORK") {
          console.error("Gagal mengambil data dashboard:", error);
        }
      } finally {
        if (showLoadingUI) hideGlobalLoader(); // <-- MATIKAN GLOBAL LOADER
      }
    },
    [user.nip, user?.sekolah?.id_sekolah],
  );

  // Polling data realtime setiap 30 detik
  useEffect(() => {
    fetchDashboard(true);
    const pollingInterval = setInterval(() => {
      fetchDashboard(false);
    }, 15000);
    return () => clearInterval(pollingInterval);
  }, [fetchDashboard]);

  // ==========================================
  // LOGIKA SINKRONISASI OFFLINE OTOMATIS
  // ==========================================
  const isSyncing = useRef(false); // Penjaga agar tidak dobel sync

  const syncOfflineData = useCallback(async () => {
    // Cegah tumpang tindih jika sedang proses sinkronisasi
    if (isSyncing.current) return;

    const pendingStr = localStorage.getItem("pending_absensi");
    if (!pendingStr) return;

    let pending = [];
    try {
      pending = JSON.parse(pendingStr);
    } catch (e) {
      localStorage.removeItem("pending_absensi"); // Hapus jika data corrupt
      return;
    }

    if (!Array.isArray(pending) || pending.length === 0) return;

    // Pastikan internet benar-benar stabil sebelum mulai kirim
    const status = await Network.getStatus();
    if (!status.connected) return;

    isSyncing.current = true;
    showGlobalLoader(); // <-- MUNCULKAN BLUR SAAT SYNC OFFLINE MULAI

    let hasSuccess = false;
    let failedPayloads = [];

    for (const payload of pending) {
      try {
        const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          timeout: 10000,
        });

        // Sukses atau sudah diabsen (wajar)
        if (
          res.data.status === "success" ||
          (res.data.message &&
            res.data.message.includes("sudah melakukan absen"))
        ) {
          hasSuccess = true;
        } else {
          // Gagal karena alasan valid (di luar jam), jangan diulangi
          console.warn("Absen offline ditolak server:", res.data.message);
        }
      } catch (err) {
        // Gagal karena koneksi kembali putus di tengah jalan, tahan di antrean
        failedPayloads.push(payload);
      }
    }

    // Penentuan hasil akhir antrean
    if (failedPayloads.length > 0) {
      localStorage.setItem("pending_absensi", JSON.stringify(failedPayloads));
      toast.error("Koneksi belum stabil. Sisa data akan disinkronkan nanti.", {
        id: "sync-offline",
      });
    } else {
      localStorage.removeItem("pending_absensi");
      if (hasSuccess) {
        toast.success("Seluruh data absen offline berhasil dikirim!");
        fetchDashboard(true);
      }
    }

    hideGlobalLoader(); // <-- MATIKAN BLUR SAAT SELESAI
    isSyncing.current = false;
  }, [fetchDashboard]);

  // Listener Pemicu Sinkronisasi menggunakan Capacitor
  useEffect(() => {
    // 1. Cek langsung saat aplikasi dibuka
    syncOfflineData();

    // 2. Pasang pendengar jaringan Capacitor
    let networkListener;
    const setupListener = async () => {
      networkListener = await Network.addListener(
        "networkStatusChange",
        (status) => {
          if (status.connected) {
            syncOfflineData();
          }
        },
      );
    };
    setupListener();

    return () => {
      if (networkListener) networkListener.remove();
    };
  }, [syncOfflineData]);

  const openAbsenModal = (jenis) => {
    setAbsenType(jenis);
    setIsModalOpen(true);
  };

  const handleSuccessAbsen = () => {
    setIsModalOpen(false);
    fetchDashboard(true);
  };

  // ==========================================
  // LOGIKA VALIDASI HARI & JAM REALTIME AMAN
  // ==========================================
  const hariIni = dashboardData?.hari_ini || {
    jam_datang: "--:--",
    jam_pulang: "--:--",
    total_jam: "-",
    status_kerja: "-",
  };
  const todayStr = getFormattedDateString(currentTime);
  const todayDayIndex = currentTime.getDay();

  const currentJam = `${String(currentTime.getHours()).padStart(
    2,
    "0",
  )}:${String(currentTime.getMinutes()).padStart(2, "0")}`;

  const activeDaysStr =
    dashboardData?.setting?.hari_kerja ||
    user?.sekolah?.hari_kerja ||
    "1,2,3,4,5,6";
  const jamMulaiDatang =
    dashboardData?.setting?.jam_mulai_datang ||
    user?.sekolah?.jam_mulai_datang ||
    "00:00";
  const jamBatasDatang =
    dashboardData?.setting?.jam_batas_datang ||
    user?.sekolah?.jam_batas_datang ||
    "23:59";
  const jamMulaiPulang =
    dashboardData?.setting?.jam_mulai_pulang ||
    user?.sekolah?.jam_mulai_pulang ||
    "00:00";
  const jamBatasPulang =
    dashboardData?.setting?.jam_batas_pulang ||
    user?.sekolah?.jam_batas_pulang ||
    "23:59";

  const isWaktuDatang =
    currentJam >= jamMulaiDatang && currentJam <= jamBatasDatang;
  const isWaktuPulang =
    currentJam >= jamMulaiPulang && currentJam <= jamBatasPulang;

  const activeDaysArray = activeDaysStr.toString().split(",").map(Number);
  const isWorkingDay = activeDaysArray.includes(todayDayIndex);
  const holidayInfo = dashboardData?.libur?.find((l) => l.tanggal === todayStr);
  const isHoliday = !!holidayInfo;
  const isHariAktif = isWorkingDay && !isHoliday;

  const hariIndo = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ][todayDayIndex];
  const bulanIndo = [
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
  ][currentTime.getMonth()];
  const displayDate = `${hariIndo}, ${currentTime.getDate()} ${bulanIndo} ${currentTime.getFullYear()}`;

  // Status Kehadiran
  const sudahDatang = hariIni?.jam_datang && hariIni.jam_datang !== "--:--";
  const sudahPulang = hariIni?.jam_pulang && hariIni.jam_pulang !== "--:--";

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="glass-header px-4 py-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm">Selamat datang,</p>
            <h1 className="text-md font-bold text-white truncate max-w-[200px]">
              {dashboardData?.user?.nama_lengkap || user?.nama_lengkap}
            </h1>
            <p className="text-blue-200 text-xs">{user?.nip}</p>
          </div>

          {/* TAMPILAN LOGO SEKOLAH DINAMIS */}
          <div className="w-16 h-16 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
            {dashboardData?.setting?.logo_url || user?.sekolah?.logo_url ? (
              <img
                src={
                  dashboardData?.setting?.logo_url || user?.sekolah?.logo_url
                }
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Jika link gambar rusak/tidak valid, ganti dengan logo default sementara
                  e.target.onerror = null;
                  e.target.src =
                    "https://ui-avatars.com/api/?name=" +
                    (user?.sekolah?.nama_sekolah || "S") +
                    "&background=0D8ABC&color=fff&size=128";
                }}
              />
            ) : (
              <span className="font-bold text-white text-lg">
                {(user?.sekolah?.nama_sekolah || "S").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between border border-white/30">
          <div>
            <div className="flex items-center gap-2 text-white/90 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">{displayDate}</span>
            </div>
            <div className="flex items-center gap-2 text-white font-bold text-3xl tracking-wider">
              <Clock className="w-6 h-6" />
              <span>
                {String(currentTime.getHours()).padStart(2, "0")}:
                {String(currentTime.getMinutes()).padStart(2, "0")}
              </span>
              <span className="text-base text-blue-200 font-normal">
                {String(currentTime.getSeconds()).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="text-right">
            {isHoliday ? (
              <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider text-center block max-w-[100px] truncate">
                {holidayInfo.keterangan || "Libur"}
              </span>
            ) : !isWorkingDay ? (
              <span className="bg-slate-500 text-white text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                Akhir Pekan
              </span>
            ) : (
              <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                Hari Kerja
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KARTU KHUSUS KEPALA SEKOLAH */}
      {user?.role === "ks" && (
        <div
          onClick={() => navigate("/admin/monitoring")}
          className="mb-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-5 shadow-lg shadow-indigo-200 text-white flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
                Akses Eksekutif
              </span>
            </div>
            <h3 className="font-bold text-lg leading-tight">Live Monitoring</h3>
            <p className="text-indigo-100 text-xs">
              Pantau kehadiran guru saat ini
            </p>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
      )}

      <div className="p-4 -mt-4 relative z-10 space-y-4">
        <div className="glass-panel p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Absensi Hari Ini
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* === TOMBOL ABSEN DATANG === */}
            {!isHariAktif ? (
              <button
                disabled
                className="flex flex-col items-center justify-center p-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed opacity-70"
              >
                <Clock className="w-6 h-6 mb-1" />
                <span className="font-semibold text-sm">Libur</span>
              </button>
            ) : hariIni.jam_datang === "--:--" ? (
              isWaktuDatang ? (
                <button
                  onClick={() => openAbsenModal("Datang")}
                  className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all"
                >
                  <Clock className="w-6 h-6 mb-1" />
                  <span className="font-semibold text-sm">Absen Datang</span>
                </button>
              ) : (
                <button
                  disabled
                  className="flex flex-col items-center justify-center p-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
                >
                  <Clock className="w-6 h-6 mb-1 opacity-50" />
                  <span className="font-semibold text-sm text-center leading-tight">
                    Di Luar Jam
                    <br />
                    <span className="text-[9px] font-normal">
                      {jamMulaiDatang} - {jamBatasDatang}
                    </span>
                  </span>
                </button>
              )
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Jam Datang</p>
                <p className="text-lg font-bold text-blue-700">
                  {hariIni.jam_datang}
                </p>
              </div>
            )}

            {/* === TOMBOL ABSEN PULANG === */}
            {!isHariAktif ? (
              <button
                disabled
                className="flex flex-col items-center justify-center p-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed opacity-70"
              >
                <Map className="w-6 h-6 mb-1" />
                <span className="font-semibold text-sm">Libur</span>
              </button>
            ) : hariIni.jam_datang === "--:--" ? (
              <button
                disabled
                className="flex flex-col items-center justify-center p-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
              >
                <Map className="w-6 h-6 mb-1 opacity-50" />
                <span className="font-semibold text-sm text-center leading-tight">
                  Absen Pulang
                  <br />
                  <span className="text-[9px] font-normal">
                    Belum absen datang
                  </span>
                </span>
              </button>
            ) : hariIni.jam_pulang === "--:--" ? (
              isWaktuPulang ? (
                <button
                  onClick={() => openAbsenModal("Pulang")}
                  className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl shadow-md active:scale-95 transition-all"
                >
                  <Map className="w-6 h-6 mb-1" />
                  <span className="font-semibold text-sm">Absen Pulang</span>
                </button>
              ) : (
                <button
                  disabled
                  className="flex flex-col items-center justify-center p-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
                >
                  <Map className="w-6 h-6 mb-1 opacity-50" />
                  <span className="font-semibold text-sm text-center leading-tight">
                    Di Luar Jam
                    <br />
                    <span className="text-[9px] font-normal">
                      {jamMulaiPulang} - {jamBatasPulang}
                    </span>
                  </span>
                </button>
              )
            ) : (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Jam Pulang</p>
                <p className="text-lg font-bold text-orange-700">
                  {hariIni.jam_pulang}
                </p>
              </div>
            )}
          </div>

          {hariIni.total_jam !== "-" && (
            <div
              className={`p-3 mt-2 rounded-xl border flex items-center gap-3 ${
                hariIni.status_kerja === "Memenuhi Target"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {hariIni.status_kerja === "Memenuhi Target" ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <p className="text-[11px] font-bold uppercase">
                  {hariIni.status_kerja}
                </p>
                <p className="text-xs opacity-90">
                  Total waktu kerja: {hariIni.total_jam}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AbsensiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jenis={absenType}
        onSuccess={handleSuccessAbsen}
      />
      <GuruBottomNav />
    </div>
  );
}

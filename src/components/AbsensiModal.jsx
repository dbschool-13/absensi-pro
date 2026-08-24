import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { calculateDistance } from "../utils/haversine";
import { Geolocation } from "@capacitor/geolocation";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Network } from '@capacitor/network';
import {
  X,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Map,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { GAS_API_URL } from "../services/api";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { showGlobalLoader, hideGlobalLoader } from './PageTransitionLoader'; // <-- TAMBAHKAN INI

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function AbsensiModal({ isOpen, onClose, jenis, onSuccess }) {
  const { user } = useAuth();
  const sekolah = user?.sekolah;

  const latSekolah = parseFloat(sekolah?.latitude || 0);
  const lonSekolah = parseFloat(sekolah?.longitude || 0);
  const radiusSekolah = parseFloat(sekolah?.radius_meter || 50);

  const [userLoc, setUserLoc] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isLoadingLoc, setIsLoadingLoc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJam, setCurrentJam] = useState("");

  const getCurrentDateTime = () => {
    const d = new Date();
    const tanggal = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const jam = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return { tanggal, jam };
  };

  useEffect(() => {
    if (isOpen) {
      getLocation();
      const updateTime = () => setCurrentJam(getCurrentDateTime().jam);
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const getLocation = async () => {
    setIsLoadingLoc(true);
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setUserLoc({ lat, lon });
      setDistance(calculateDistance(lat, lon, latSekolah, lonSekolah));
    } catch (error) {
      toast.error("Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.");
    } finally {
      setIsLoadingLoc(false);
    }
  };

  // FUNGSI UNTUK TOMBOL REFRESH DI MODAL
  const handleRefresh = () => {
    getLocation();
    setCurrentJam(getCurrentDateTime().jam);
  };

  const isWithinRadius = distance !== null && distance <= radiusSekolah;
  const isTimeValid =
    jenis === "Datang"
      ? currentJam >= (sekolah?.jam_mulai_datang || "00:00") &&
        currentJam <= (sekolah?.jam_batas_datang || "23:59")
      : currentJam >= (sekolah?.jam_mulai_pulang || "00:00") &&
        currentJam <= (sekolah?.jam_batas_pulang || "23:59");

  const handleAbsenSubmit = async () => {
    if (!isWithinRadius)
      return toast.error("Anda berada di luar area sekolah!");
    if (!isTimeValid)
      return toast.error(`Belum masuk waktu absen ${jenis.toLowerCase()}`);

    setIsSubmitting(true);
    const { tanggal, jam } = getCurrentDateTime();

    const payload = {
      action: jenis === "Datang" ? "absen_datang" : "absen_pulang",
      nip: user.nip,
      tanggal,
      jam,
      lat: userLoc.lat,
      lon: userLoc.lon,
      jarak: distance,
      batas_mulai:
        jenis === "Datang"
          ? sekolah.jam_mulai_datang
          : sekolah.jam_mulai_pulang,
      batas_akhir:
        jenis === "Datang"
          ? sekolah.jam_batas_datang
          : sekolah.jam_batas_pulang,
      device_info: navigator.userAgent,
    };

    // FITUR BARU: OFFLINE TOLERANCE
    if (!navigator.onLine) {
      const pendingSyncs =
        JSON.parse(localStorage.getItem("pending_absensi")) || [];
      pendingSyncs.push(payload);
      localStorage.setItem("pending_absensi", JSON.stringify(pendingSyncs));

      toast.success(
        "Koneksi terputus! Absen disimpan di HP. Jangan tutup aplikasi, data akan dikirim otomatis saat sinyal pulih.",
        { duration: 5000 },
      );
      setIsSubmitting(false);
      onSuccess(); // Tutup modal, kembalikan ke dashboard
      return;
    }

    try {
      showGlobalLoader();
      const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        timeout: 10000
      });

      if (res.data.status === "success") {
        toast.success(res.data.message);
        onSuccess();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
      hideGlobalLoader();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      {/* Header Modal - DITAMBAHKAN TOMBOL REFRESH */}
      <div className="glass-header px-4 py-4 flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="font-bold text-lg leading-tight">
            Konfirmasi Absen {jenis}
          </h1>
          <p className="text-blue-100 text-xs">{sekolah?.nama_sekolah}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-white/20 rounded-full active:scale-95 transition-all"
            title="Refresh GPS"
          >
            <RefreshCw
              className={`w-5 h-5 text-white ${isLoadingLoc ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 rounded-full active:scale-95 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="glass-panel overflow-hidden shadow-sm">
          {/* Area Peta */}
          <div className="h-[250px] w-full bg-slate-200 relative z-0">
            {latSekolah !== 0 && (
              <MapContainer
                center={[latSekolah, lonSekolah]}
                zoom={17}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[latSekolah, lonSekolah]}>
                  <Popup>Pusat Sekolah</Popup>
                </Marker>
                <Circle
                  center={[latSekolah, lonSekolah]}
                  pathOptions={{
                    fillColor: "blue",
                    fillOpacity: 0.2,
                    color: "blue",
                    weight: 1,
                  }}
                  radius={radiusSekolah}
                />
                {userLoc && (
                  <Marker position={[userLoc.lat, userLoc.lon]}>
                    <Popup>Lokasi Anda</Popup>
                  </Marker>
                )}
              </MapContainer>
            )}
            {isLoadingLoc && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-slate-500">
                Jarak ke Sekolah:
              </span>
              <span className="font-bold text-lg text-slate-800">
                {isLoadingLoc
                  ? "..."
                  : distance !== null
                    ? `${distance} m`
                    : "-"}
              </span>
            </div>

            {!isLoadingLoc && distance !== null && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 mb-3 ${isWithinRadius ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
              >
                {isWithinRadius ? (
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">
                    {isWithinRadius
                      ? "Dalam Area Sekolah"
                      : "Di Luar Area Sekolah"}
                  </h3>
                </div>
              </div>
            )}

            {!isTimeValid && (
              <div className="p-3 rounded-xl border bg-orange-50 border-orange-200 text-orange-700 flex items-center gap-3">
                <Clock className="w-6 h-6 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Di Luar Jam Absen</h3>
                  <p className="text-xs opacity-90">
                    Jadwal {jenis}:{" "}
                    {jenis === "Datang"
                      ? `${sekolah?.jam_mulai_datang} - ${sekolah?.jam_batas_datang}`
                      : `${sekolah?.jam_mulai_pulang} - ${sekolah?.jam_batas_pulang}`}
                  </p>
                </div>
              </div>
            )}

            {isWithinRadius && isTimeValid && (
              <div className="p-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">
                    Lokasi & Waktu Valid
                  </h3>
                  <p className="text-xs opacity-90">
                    Anda dapat melakukan absensi sekarang.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 pb-6">
          <button
            disabled={
              !isWithinRadius || !isTimeValid || isLoadingLoc || isSubmitting
            }
            onClick={handleAbsenSubmit}
            className={`w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl shadow-md text-base font-bold transition-all active:scale-95 ${
              isWithinRadius && isTimeValid && !isLoadingLoc
                ? jenis === "Datang"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {jenis === "Datang" ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Map className="w-5 h-5" />
                )}
                Simpan Absen {jenis}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

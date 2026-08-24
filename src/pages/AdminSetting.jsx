import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  MapPin,
  Clock,
  CalendarX,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Users,
  SmartphoneNfc,
  Building2,
} from "lucide-react";
import axios from "axios";
import { GAS_API_URL } from "../services/api";
import toast from "react-hot-toast";
import AdminBottomNav from "../components/AdminBottomNav";

export default function AdminSetting() {
  const { user, syncData } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("umum");

  // State Setting Umum
  const [isSaving, setIsSaving] = useState(false);
  const [settingForm, setSettingForm] = useState({
    id_sekolah: user?.sekolah?.id_sekolah || "",
    nama_sekolah: user?.sekolah?.nama_sekolah || "",
    logo_url: user?.sekolah?.logo_url || "",
    latitude: user?.sekolah?.latitude || "",
    longitude: user?.sekolah?.longitude || "",
    radius_meter: user?.sekolah?.radius_meter || "",
    jam_mulai_datang: user?.sekolah?.jam_mulai_datang || "",
    jam_batas_datang: user?.sekolah?.jam_batas_datang || "",
    jam_mulai_pulang: user?.sekolah?.jam_mulai_pulang || "",
    jam_batas_pulang: user?.sekolah?.jam_batas_pulang || "",
    hari_kerja: user?.sekolah?.hari_kerja || "6",
  });

  const [activeDays, setActiveDays] = useState(() => {
    const hk = user?.sekolah?.hari_kerja || "1,2,3,4,5,6";
    return hk.toString().split(",").map(Number);
  });

  const toggleDay = (dayId) => {
    if (activeDays.includes(dayId)) {
      setActiveDays(activeDays.filter((id) => id !== dayId)); // Hapus jika sudah ada
    } else {
      setActiveDays([...activeDays, dayId].sort()); // Tambah & urutkan jika belum ada
    }
  };

  // State Hari Libur
  const [liburData, setLiburData] = useState([]);
  const [isLoadingLibur, setIsLoadingLibur] = useState(false);
  const [newLibur, setNewLibur] = useState({ tanggal: "", keterangan: "" });

  const [guruData, setGuruData] = useState([]);
  const [isLoadingGuru, setIsLoadingGuru] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedGuruToReset, setSelectedGuruToReset] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (activeTab === "libur") fetchLibur();
    if (activeTab === "guru") fetchGuru(); // Panggil data guru
  }, [activeTab]);

  const fetchGuru = async () => {
    setIsLoadingGuru(true);
    try {
      const res = await axios.post(
        GAS_API_URL,
        JSON.stringify({
          action: "get_guru_list",
          id_sekolah: user?.sekolah?.id_sekolah,
        }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );
      if (res.data.status === "success") setGuruData(res.data.data);
    } catch (error) {
      toast.error("Gagal mengambil data guru.");
    } finally {
      setIsLoadingGuru(false);
    }
  };

  // Fungsi Reset Perangkat
  // Dipanggil saat tombol "Reset HP" di tabel diklik
  const promptResetDevice = (guru) => {
    setSelectedGuruToReset(guru);
    setShowResetModal(true);
  };

  // Dipanggil saat tombol konfirmasi di dalam modal ditekan
  const confirmResetDevice = async () => {
    if (!selectedGuruToReset) return;
    setIsResetting(true);

    try {
      const res = await axios.post(
        GAS_API_URL,
        JSON.stringify({
          action: "reset_device",
          nip: selectedGuruToReset.nip,
        }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );

      if (res.data.status === "success") {
        toast.success(res.data.message);
        setShowResetModal(false);
        setSelectedGuruToReset(null);
        if (settingForm.logo_url !== undefined) {
          localStorage.setItem("saved_logo_url", settingForm.logo_url);
        }
        fetchGuru(); // Refresh tabel
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Gagal mereset perangkat.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleChange = (e) => {
    setSettingForm({ ...settingForm, [e.target.name]: e.target.value });
  };

  const handleSaveSetting = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        action: "update_setting",
        ...settingForm,
        hari_kerja: activeDays.join(","),
      };
      const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      if (res.data.status === "success") {
        toast.success(res.data.message);
        syncData(user.nip); // Memaksa AuthContext mengambil data terbaru diam-diam
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchLibur = async () => {
    setIsLoadingLibur(true);
    try {
      const res = await axios.post(
        GAS_API_URL,
        JSON.stringify({ action: "get_libur" }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );
      if (res.data.status === "success") setLiburData(res.data.data);
    } catch (error) {
      toast.error("Gagal mengambil data libur.");
    } finally {
      setIsLoadingLibur(false);
    }
  };

  const handleAddLibur = async (e) => {
    e.preventDefault();
    if (!newLibur.tanggal || !newLibur.keterangan)
      return toast.error("Harap isi semua kolom");

    // Ubah format YYYY-MM-DD dari input HTML ke DD/MM/YYYY
    const [y, m, d] = newLibur.tanggal.split("-");
    const formatIndo = `${d}/${m}/${y}`;

    try {
      const payload = {
        action: "add_libur",
        tanggal: formatIndo,
        keterangan: newLibur.keterangan,
      };
      const res = await axios.post(GAS_API_URL, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      if (res.data.status === "success") {
        toast.success(res.data.message);
        setNewLibur({ tanggal: "", keterangan: "" });
        fetchLibur();
      }
    } catch (error) {
      toast.error("Gagal menambah libur.");
    }
  };

  const handleDeleteLibur = async (id_libur) => {
    if (!window.confirm("Hapus tanggal libur ini?")) return;
    try {
      const res = await axios.post(
        GAS_API_URL,
        JSON.stringify({ action: "delete_libur", id_libur }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );
      if (res.data.status === "success") {
        toast.success(res.data.message);
        fetchLibur();
      }
    } catch (error) {
      toast.error("Gagal menghapus libur.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER BARU (Tanpa Tombol Back) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <h1 className="font-bold text-xl text-slate-800 leading-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Admin Mode • {user?.sekolah?.nama_sekolah}
        </p>
        <AdminBottomNav />
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        {/* TABS NAVIGATION */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("umum")}
            className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "umum"
                ? "bg-primary text-white shadow"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-4 h-4" /> Umum
          </button>
          <button
            onClick={() => setActiveTab("libur")}
            className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "libur"
                ? "bg-red-500 text-white shadow"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <CalendarX className="w-4 h-4" /> Libur
          </button>
          <button
            onClick={() => setActiveTab("guru")}
            className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === "guru"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" /> Guru
          </button>
        </div>

        {/* TAB 1: PENGATURAN UMUM */}
        {activeTab === "umum" && (
          <form
            onSubmit={handleSaveSetting}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Settings className="w-4 h-4 text-primary" /> Identitas Sekolah
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    ID Sekolah
                  </label>
                  <input
                    type="text"
                    name="id_sekolah"
                    value={settingForm.id_sekolah}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Nama Sekolah
                  </label>
                  <input
                    type="text"
                    name="nama_sekolah"
                    value={settingForm.nama_sekolah}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary outline-none"
                    required
                  />
                </div>
                {/* --- INPUT URL LOGO SEKOLAH --- */}
                <div className="md:col-span-3 mt-4 p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                    {settingForm.logo_url ? (
                      <img
                        src={settingForm.logo_url}
                        alt="Preview Logo"
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          (e.target.src =
                            "https://via.placeholder.com/150?text=Error")
                        }
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Link URL Logo Sekolah (Opsional)
                    </label>
                    <input
                      type="url"
                      name="logo_url"
                      value={settingForm.logo_url}
                      onChange={handleChange}
                      placeholder="https://contoh.com/logo-sekolah.png"
                      className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Tempelkan link gambar (PNG/JPG) dari Google Drive, Imgur,
                      atau website sekolah.
                    </p>
                  </div>
                </div>
                {/* --- TOGGLE 7 HARI KERJA --- */}
                <div className="md:col-span-3 mt-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-2">
                    Sistem Hari Kerja (Klik untuk Mengaktifkan)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 1, label: "Senin" },
                      { id: 2, label: "Selasa" },
                      { id: 3, label: "Rabu" },
                      { id: 4, label: "Kamis" },
                      { id: 5, label: "Jumat" },
                      { id: 6, label: "Sabtu" },
                      { id: 0, label: "Minggu" },
                    ].map((day) => {
                      const isActive = activeDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all active:scale-95 ${
                            isActive
                              ? "bg-blue-100 border-blue-500 text-blue-700 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <MapPin className="w-4 h-4 text-primary" /> Lokasi GPS & Radius
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    name="latitude"
                    value={settingForm.latitude}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    name="longitude"
                    value={settingForm.longitude}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Radius (Meter)
                  </label>
                  <input
                    type="number"
                    name="radius_meter"
                    value={settingForm.radius_meter}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Clock className="w-4 h-4 text-primary" /> Waktu Absensi (Format
                HH:MM)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Mulai Datang
                  </label>
                  <input
                    type="time"
                    name="jam_mulai_datang"
                    value={settingForm.jam_mulai_datang}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Batas Datang
                  </label>
                  <input
                    type="time"
                    name="jam_batas_datang"
                    value={settingForm.jam_batas_datang}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Mulai Pulang
                  </label>
                  <input
                    type="time"
                    name="jam_mulai_pulang"
                    value={settingForm.jam_mulai_pulang}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Batas Pulang
                  </label>
                  <input
                    type="time"
                    name="jam_batas_pulang"
                    value={settingForm.jam_batas_pulang}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-primary hover:bg-blue-700 text-white font-bold rounded-xl p-4 shadow flex justify-center items-center gap-2 active:scale-95 transition-all"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Simpan Pengaturan Umum
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: HARI LIBUR NASIONAL */}
        {activeTab === "libur" && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddLibur}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Pilih Tanggal Merah
                </label>
                <input
                  type="date"
                  value={newLibur.tanggal}
                  onChange={(e) =>
                    setNewLibur({ ...newLibur, tanggal: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                  required
                />
              </div>
              <div className="flex-[2] w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Keterangan Libur
                </label>
                <input
                  type="text"
                  placeholder="Cth: Hari Kemerdekaan"
                  value={newLibur.keterangan}
                  onChange={(e) =>
                    setNewLibur({ ...newLibur, keterangan: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg p-3 flex justify-center items-center gap-2 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" /> Tambah
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-100">
                    <th className="p-4 font-bold">Tanggal</th>
                    <th className="p-4 font-bold">Keterangan</th>
                    <th className="p-4 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingLibur ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-6 text-center text-slate-400"
                      >
                        Memuat...
                      </td>
                    </tr>
                  ) : liburData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-6 text-center text-slate-400"
                      >
                        Belum ada hari libur tersimpan.
                      </td>
                    </tr>
                  ) : (
                    liburData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4 font-semibold text-red-600">
                          {item.tanggal}
                        </td>
                        <td className="p-4 font-medium text-slate-700">
                          {item.keterangan}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteLibur(item.id_libur)}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* TAB 3: MANAJEMEN DATA GURU */}
        {activeTab === "guru" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">
                Daftar Guru & Status Perangkat
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-slate-500 text-xs border-b border-slate-100">
                    <th className="p-4 font-semibold uppercase">
                      Nama Guru / NIP
                    </th>
                    <th className="p-4 font-semibold text-center uppercase">
                      Status Login
                    </th>
                    <th className="p-4 font-semibold text-center uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingGuru ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-6 text-center text-slate-400"
                      >
                        Memuat Data...
                      </td>
                    </tr>
                  ) : guruData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-6 text-center text-slate-400"
                      >
                        Belum ada guru yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    guruData.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{g.nama}</p>
                          <p className="text-xs text-slate-500">{g.nip}</p>
                        </td>
                        <td className="p-4 text-center">
                          {g.is_bound ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                              <SmartphoneNfc className="w-3 h-3" /> Terkunci
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
                              Belum Login
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => promptResetDevice(g)} // <-- UBAH KE SINI
                            disabled={!g.is_bound}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              g.is_bound
                                ? "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            Reset HP
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* --- MODAL KONFIRMASI RESET PERANGKAT --- */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <SmartphoneNfc className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Reset Perangkat Guru?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tindakan ini akan melepaskan ikatan perangkat untuk akun{" "}
              <span className="font-semibold text-slate-700">
                {selectedGuruToReset?.nama}
              </span>{" "}
              ({selectedGuruToReset?.nip}). Guru yang bersangkutan harus
              melakukan login ulang dari perangkat baru.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={confirmResetDevice}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Ya, Reset"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

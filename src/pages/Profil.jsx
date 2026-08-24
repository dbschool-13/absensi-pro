import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  User as UserIcon,
  Building2,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import GuruBottomNav from "../components/GuruBottomNav";

export default function Profil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER PROFIL */}
      <div className="bg-primary px-4 pt-10 pb-20 text-center relative rounded-b-[40px] shadow-sm">
        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-3 flex items-center justify-center border-4 border-white/30 shadow-lg">
          <UserIcon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {user?.nama_lengkap}
        </h1>
        <p className="text-blue-100 text-sm bg-black/10 inline-block px-3 py-1 rounded-full">
          {user?.role?.toUpperCase()}
        </p>
      </div>

      <div className="px-4 -mt-12 relative z-10 space-y-4">
        {/* KARTU INFORMASI */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Informasi Akun
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">
                  NIP / ID Pegawai
                </p>
                <p className="font-bold text-slate-800 text-sm">{user?.nip}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">
                  Instansi Sekolah
                </p>
                <p className="font-bold text-slate-800 text-sm">
                  {user?.sekolah?.nama_sekolah}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: {user?.sekolah?.id_sekolah}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TOMBOL LOGOUT */}
        <button
          onClick={handleLogout}
          className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold rounded-2xl p-4 shadow-sm flex justify-center items-center gap-2 active:scale-95 transition-all mt-6"
        >
          <LogOut className="w-5 h-5" /> Keluar Aplikasi
        </button>

        <p className="text-center text-slate-400 text-xs mt-6">
          Versi Aplikasi 1.0
        </p>
      </div>

      {/* RENDER BOTTOM NAVIGATION */}
      <GuruBottomNav />
    </div>
  );
}

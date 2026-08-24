import { useLocation, useNavigate } from "react-router-dom";
import { FileText, Settings, LogOut, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AdminBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around items-center px-1 py-3 z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
      {/* 1. Tombol Live Monitoring (BARU) */}
      <button
        onClick={() => navigate("/admin/monitoring")}
        className={`flex flex-col items-center gap-1 w-[70px] transition-all active:scale-95 ${
          location.pathname === "/admin/monitoring"
            ? "text-primary"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-colors relative ${
            location.pathname === "/admin/monitoring" ? "bg-blue-50" : ""
          }`}
        >
          <Activity className="w-5 h-5" />
          {/* Titik merah kecil untuk kesan 'Live' */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </div>
        <span className="text-[9px] font-bold">Monitor</span>
      </button>

      {/* 2. Tombol Rekap Data */}
      <button
        onClick={() => navigate("/admin")}
        className={`flex flex-col items-center gap-1 w-[70px] transition-all active:scale-95 ${
          location.pathname === "/admin"
            ? "text-primary"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-colors ${
            location.pathname === "/admin" ? "bg-blue-50" : ""
          }`}
        >
          <FileText className="w-5 h-5" />
        </div>
        <span className="text-[9px] font-bold">Rekap</span>
      </button>

      {/* 3. Tombol Pengaturan */}
      <button
        onClick={() => navigate("/admin/setting")}
        className={`flex flex-col items-center gap-1 w-[70px] transition-all active:scale-95 ${
          location.pathname === "/admin/setting"
            ? "text-primary"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-colors ${
            location.pathname === "/admin/setting" ? "bg-blue-50" : ""
          }`}
        >
          <Settings className="w-5 h-5" />
        </div>
        <span className="text-[9px] font-bold">Setelan</span>
      </button>

      {/* 4. Tombol Keluar */}
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="flex flex-col items-center gap-1 w-[70px] text-red-400 hover:text-red-500 transition-all active:scale-95"
      >
        <div className="p-1.5 rounded-xl">
          <LogOut className="w-5 h-5" />
        </div>
        <span className="text-[9px] font-bold">Keluar</span>
      </button>
    </div>
  );
}

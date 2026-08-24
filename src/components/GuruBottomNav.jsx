import { useLocation, useNavigate } from "react-router-dom";
import { Home, History, User, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function GuruBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Deteksi apakah yang login adalah Kepala Sekolah
  const isKS = user?.role === "kepala sekolah";

  // Susun daftar menu secara dinamis
  const navItems = [
    { name: "Beranda", path: "/dashboard", icon: Home },
    { name: "Riwayat", path: "/riwayat", icon: History },
  ];

  // SISIPKAN MENU MONITORING JIKA DIA KEPALA SEKOLAH
  if (isKS) {
    navItems.push({
      name: "Monitoring",
      path: "/admin/monitoring",
      icon: Activity,
    });
  }

  navItems.push({ name: "Profil", path: "/profil", icon: User });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 flex justify-around p-3 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${
              isActive
                ? "text-primary scale-110 -translate-y-1"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                isActive ? "bg-blue-50" : "bg-transparent"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "fill-blue-100" : ""}`} />
            </div>
            <span
              className={`text-[10px] mt-1 font-bold ${
                isActive ? "text-primary" : "text-slate-500"
              }`}
            >
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

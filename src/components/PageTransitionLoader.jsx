import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// SISTEM COUNTER: Mencegah loader tertutup jika ada 2 API berjalan bersamaan
let requestCount = 0;

export const showGlobalLoader = () => {
  requestCount++;
  window.dispatchEvent(new Event("update-global-loader"));
};

export const hideGlobalLoader = () => {
  requestCount = Math.max(0, requestCount - 1); // Pastikan tidak minus
  window.dispatchEvent(new Event("update-global-loader"));
};

export default function PageTransitionLoader({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const logoUrl =
    localStorage.getItem("saved_logo_url") || user?.sekolah?.logo_url;
  const namaSekolah = user?.sekolah?.nama_sekolah || "S";

  // HANYA MENDENGARKAN STATUS PENARIKAN DATA, TIDAK ADA TIMER OTOMATIS
  useEffect(() => {
    const handleUpdate = () => {
      setIsLoading(requestCount > 0);
    };

    window.addEventListener("update-global-loader", handleUpdate);

    return () => {
      window.removeEventListener("update-global-loader", handleUpdate);
    };
  }, []);

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/30 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-24 h-24 bg-white/90 backdrop-blur-sm rounded-[2rem] shadow-2xl flex items-center justify-center p-3 mb-4 animate-pulse border border-white/50 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://ui-avatars.com/api/?name=" +
                    namaSekolah +
                    "&background=0D8ABC&color=fff&size=128";
                }}
              />
            ) : (
              <div className="w-full h-full bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-4xl">
                {namaSekolah.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="bg-white/90 px-4 py-1.5 rounded-full shadow-lg">
            <span className="text-primary font-bold tracking-wider text-xs animate-pulse">
              MEMUAT DATA...
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

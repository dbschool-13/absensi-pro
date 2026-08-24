import { useState, useEffect } from "react";
import { Share, PlusSquare, X } from "lucide-react";

export default function IOSInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Deteksi apakah perangkat ini adalah perangkat iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

    // 2. Deteksi apakah aplikasi SUDAH diinstal (berjalan sebagai PWA/Standalone)
    const isAppInstalled =
      window.navigator.standalone ||
      window.matchMedia("(display-mode: standalone)").matches;

    setIsIOS(isIOSDevice);
    setIsStandalone(isAppInstalled);

    // Jika ini iPhone, dan belum diinstal, dan belum ditutup manual oleh user hari ini
    if (
      isIOSDevice &&
      !isAppInstalled &&
      !localStorage.getItem("hide_ios_prompt")
    ) {
      // Kasih jeda 2 detik sebelum muncul agar tidak mengganggu loading awal
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleClose = () => {
    setShowPrompt(false);
    // Sembunyikan prompt ini selama 1 hari agar tidak menjengkelkan
    localStorage.setItem("hide_ios_prompt", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] bg-white rounded-2xl p-4 shadow-2xl border border-blue-100 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex gap-4 items-start">
        <div className="bg-blue-50 p-2 rounded-xl text-blue-600 shrink-0">
          <Share className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            Install Aplikasi di iPhone
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Install aplikasi ini di HP Anda agar lebih cepat. Ketuk ikon{" "}
            <strong className="text-slate-700">Bagikan (Share)</strong> di menu
            bawah Safari, lalu pilih:
          </p>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <PlusSquare className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700">
              Tambah ke Layar Utama
            </span>
          </div>
        </div>
      </div>

      {/* Segitiga panah ke bawah menunjuk ke tombol Share Safari */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-blue-100 rotate-45"></div>
    </div>
  );
}

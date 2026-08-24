import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { GAS_API_URL } from "../services/api";
import { Device } from "@capacitor/device";
import IOSInstallPrompt from "../components/IOSInstallPrompt";

export default function Login() {
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { user, login } = useAuth();

  // Auto redirect jika user sudah login (Auto Login) berdasarkan role
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin/monitoring");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!nip || !password) {
      return toast.error("NIP dan Password harus diisi!");
    }
    setIsLoading(true);

    try {
      // 2. Baca ID Unik Perangkat
      const deviceIdInfo = await Device.getId();
      const currentDeviceId = deviceIdInfo.identifier; // Ini adalah UUID hardware HP

      const response = await axios.post(
        GAS_API_URL,
        JSON.stringify({
          action: "login",
          nip: nip,
          password: password,
          device_id: currentDeviceId, // 3. Kirim ke Backend
        }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );

      const data = response.data;

      if (data.status === "success") {
        const userData = {
          ...data.data.user,
          sekolah: data.data.sekolah,
        };

        login(userData);
        toast.success(data.message);

        // Redirect berdasarkan role dari database
        if (userData.role === "admin") {
          navigate("/admin/monitoring");
        } else {
          navigate("/dashboard");
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Gagal terhubung ke server!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg border border-white/30">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Absensi<span className="text-blue-200">Pro</span>
          </h1>
          <p className="text-blue-100 text-sm">Portal Guru & Staf</p>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            Masuk ke Akun
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                NIP / ID Pegawai
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-800" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-primary focus:border-primary bg-white/50 backdrop-blur-sm transition-all"
                  placeholder="NIP / ID Pegawai"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-800" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-primary focus:border-primary bg-white/50 backdrop-blur-sm transition-all"
                  placeholder="Masukkan Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-primary transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-primary transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Masuk Sekarang
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/70 text-xs mt-8 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Versi 1.0
        </p>
      </div>

      <IOSInstallPrompt />
    </div>
  );
}

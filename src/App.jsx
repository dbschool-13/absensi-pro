import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Import Komponen & Halaman
import PageTransitionLoader from "./components/PageTransitionLoader";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Riwayat from "./pages/Riwayat";
import Profil from "./pages/Profil";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSetting from "./pages/AdminSetting";
import AdminMonitoring from "./pages/AdminMonitoring";

// Komponen Proteksi Rute (Berbasis Array allowedRoles)
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Jika belum login, tendang ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jika rute ini dibatasi untuk role tertentu, dan user tidak termasuk di dalamnya
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Jika dia admin tapi nyasar ke halaman guru
    if (user.role === "admin") {
      return <Navigate to="/admin/monitoring" replace />;
    }
    // Jika dia guru/ks tapi nyasar ke halaman khusus admin (seperti setting)
    return <Navigate to="/dashboard" replace />;
  }

  // Khusus Admin: Jangan biarkan admin masuk ke dashboard guru biasa
  if (!allowedRoles && user.role === "admin") {
    return <Navigate to="/admin/monitoring" replace />;
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PageTransitionLoader>
          <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Routes>
              {/* Rute Publik */}
              <Route path="/login" element={<Login />} />

              {/* Rute Guru, Pegawai & KS */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute allowedRoles={["guru", "kepala sekolah", "tendik"]}>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/riwayat"
                element={
                  <PrivateRoute allowedRoles={["guru", "kepala sekolah", "tendik"]}>
                    <Riwayat />
                  </PrivateRoute>
                }
              />
              {/* Profil bisa diakepala sekolahes semua orang (termasuk admin) */}
              <Route
                path="/profil"
                element={
                  <PrivateRoute>
                    <Profil />
                  </PrivateRoute>
                }
              />

              {/* ========================================= */}
              {/* Rute Admin & Kepala Sekolah (EKSEKUTIF) */}
              {/* ========================================= */}
              <Route
                path="/admin/monitoring"
                element={
                  <PrivateRoute allowedRoles={["admin", "kepala sekolah"]}>
                    <AdminMonitoring />
                  </PrivateRoute>
                }
              />

              {/* ========================================= */}
              {/* Rute KHUSUS Admin (KS Tidak Boleh Masuk) */}
              {/* ========================================= */}
              <Route
                path="/admin"
                element={
                  <PrivateRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/setting"
                element={
                  <PrivateRoute allowedRoles={["admin"]}>
                    <AdminSetting />
                  </PrivateRoute>
                }
              />

              {/* Rute Fallback (Jika URL tidak ditemukan) */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </PageTransitionLoader>
        <Toaster position="top-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}

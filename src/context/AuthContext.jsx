import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { GAS_API_URL } from "../services/api"; // <-- IMPORT DARI API.JS

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user_data");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      syncData(parsedUser.nip);
    } else {
      setLoading(false);
    }
  }, []);

  const syncData = async (nip) => {
    try {
      const response = await axios.post(
        GAS_API_URL,
        JSON.stringify({ action: "sync", nip: nip }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );

      const data = response.data;
      if (data.status === "success") {
        const updatedUser = {
          ...data.data.user,
          sekolah: data.data.sekolah,
        };
        localStorage.setItem("user_data", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Gagal sinkronisasi data:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    localStorage.setItem("user_data", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("user_data");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, syncData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

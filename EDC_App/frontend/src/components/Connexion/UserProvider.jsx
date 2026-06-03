import React, { createContext, useEffect, useState } from "react";
import api from "../../api/axios.js";
import { jwtDecode } from "jwt-decode";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

export const UserContext = createContext();

const refreshAuthToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return;

  try {
    const res = await api.post("/refresh-token", { refreshToken });
    if (res.data.token) localStorage.setItem("token", res.data.token);
  } catch (e) {
    console.error("Token refresh failed", e);
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const legacy = await api.get("/home");
        setUser(legacy.data.user);
      } catch (error) {
        console.error("Erreur recuperation utilisateur:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkTokenExpiration = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp - Date.now() / 1000 < 300) refreshAuthToken();
      } catch (_e) {
        // invalid token
      }
    };

    fetchUserData();
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser, selectedClient, setSelectedClient }}>
      {children}
    </UserContext.Provider>
  );
};

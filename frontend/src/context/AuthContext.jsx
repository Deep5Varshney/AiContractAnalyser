import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from "aws-amplify/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const userData = { ...currentUser, ...attributes };
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const logout = async () => {
    try {
      // 1. Retrieve current user identity BEFORE wiping storage
      const storedUser = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const userId = user?.userId || user?.username || storedUser?.id || storedUser?.email;

      if (userId) {
        await fetch("http://localhost:8000/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId }),
        });
      }

      // 2. Sign out of AWS Amplify
      await amplifySignOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      // 3. Clear session storage
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, checkUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
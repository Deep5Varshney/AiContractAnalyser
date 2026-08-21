import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  getCurrentUser, 
  fetchUserAttributes, 
  signIn as amplifySignIn, 
  signUp as amplifySignUp, 
  confirmSignUp as amplifyConfirmSignUp, 
  signOut as amplifySignOut 
} from "aws-amplify/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user info to PostgreSQL backend
  const syncUserWithBackend = async (currentUser, attributes) => {
    try {
      const payload = {
        id: currentUser.userId,
        email: attributes.email,
        name: attributes.name || attributes.email.split("@")[0],
      };

      const res = await fetch("http://localhost:8000/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Backend sync failed");
      }
    } catch (err) {
      console.error("Error syncing with backend:", err);
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({ ...currentUser, ...attributes });
      await syncUserWithBackend(currentUser, attributes);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await amplifySignIn({ username: email, password });
    await checkUser();
    return res;
  };

  const signup = async (email, password, name) => {
    return await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name: name || "",
        },
      },
    });
  };

  const verifyCode = async (email, confirmationCode) => {
    return await amplifyConfirmSignUp({
      username: email,
      confirmationCode,
    });
  };

  const logout = async () => {
    await amplifySignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifyCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
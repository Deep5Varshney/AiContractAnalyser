import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h3>Loading session...</h3>
      </div>
    );
  }

  // Check state OR storage fallback
  const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

  if (!user && !storedUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
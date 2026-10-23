import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Adjust path if necessary

export default function Navbar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <div className="brand-logo">AI</div>
        <div>
          <h1>AI Contract Analyzer</h1>
          <p>Smart Contract Analysis</p>
        </div>
      </div>

      <nav className="dashboard-nav">
        <Link to="/dashboard" className={isActive("/dashboard")}>Dashboard</Link>
        <Link to="/contracts" className={isActive("/contracts")}>My Contracts</Link>
        <a href="#insights" className={isActive("/insights")}>AI Insights</a>
        <Link to="/profile" className={isActive("/profile")}>Profile</Link>
      </nav>

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>
    </header>
  );
}
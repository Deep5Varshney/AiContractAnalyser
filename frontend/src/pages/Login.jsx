import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, signOut, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      // Clear any prior stale session before signing in
      try {
        await signOut();
      } catch {
        // Safe to ignore
      }

      const signInOutput = await signIn({
        username: email.trim(),
        password: password,
      });

      if (!signInOutput.isSignedIn && signInOutput.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setError("Account not verified yet. Please check your email for the confirmation code.");
        return;
      }

      let userId = email.trim();
      let userName = email.split("@")[0];

      try {
        const currentUser = await getCurrentUser();
        userId = currentUser.userId || currentUser.username || userId;
        const attributes = await fetchUserAttributes();
        if (attributes.name) userName = attributes.name;
      } catch (attrErr) {
        console.warn("Attribute retrieval warning:", attrErr);
      }

      const userData = {
        id: userId,
        email: email.trim(),
        name: userName,
      };

      if (rememberMe) {
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        sessionStorage.setItem("user", JSON.stringify(userData));
      }

      fetch("http://localhost:8000/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }).catch((err) => console.error("Database sync error:", err));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT SIDE */}
      <div className="auth-visual">
        <div className="gradient-orb orb-one"></div>
        <div className="gradient-orb orb-two"></div>
        <div className="gradient-orb orb-three"></div>
        <div className="grid-pattern"></div>

        <div className="visual-content">
          <div className="brand-mark">AI</div>
          <h1>
            Understand Your
            <br />
            Contracts.
            <br />
            <span>Smarter.</span>
          </h1>
          <p>
            Analyze contracts with AI and discover important
            clauses, risks and insights in seconds.
          </p>
          <div className="feature-list">
            <div className="feature-item">
              <span>✓</span>
              AI-powered contract analysis
            </div>
            <div className="feature-item">
              <span>✓</span>
              Identify potential risks
            </div>
            <div className="feature-item">
              <span>✓</span>
              Simple and easy-to-understand insights
            </div>
          </div>
        </div>
        <div className="visual-footer">AI Contract Analyzer</div>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <div className="mobile-brand">AI Contract Analyzer</div>
          <div className="auth-heading">
            <h2>Welcome Back! 👋</h2>
            <p>Sign in to continue analyzing your contracts.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="forgot-button"
                onClick={() => alert("Password reset feature coming soon!")}
              >
                Forgot password?
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <span className="loading-content">
                  <span className="spinner"></span>
                  Signing in...
                </span>
              ) : (
                "Login →"
              )}
            </button>
          </form>

          <div className="auth-switch">
            <span>Don't have an account?</span>
            <Link to="/signup">Create Account</Link>
          </div>

          <div className="secure-text">
            🔐 Your information is securely protected.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signIn, signOut, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkUser } = useAuth();

  const [email, setEmail] = useState(() => {
    return localStorage.getItem("remembered_email") || "";
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("remember_me_preference") === "true";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Read any redirect messages from Signup or ForgotPassword
  const successMessage = location.state?.message || "";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      // 1. Clear any prior stale session
      try {
        await signOut();
      } catch {
        // Safe to ignore
      }

      // 2. Authenticate with Cognito (Fails if either email or password is wrong)
      const signInOutput = await signIn({
        username: email.trim(),
        password: password,
      });

      if (!signInOutput.isSignedIn && signInOutput.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setError("Account not verified yet. Please check your email for the confirmation code.");
        return;
      }

      if (!signInOutput.isSignedIn) {
        setError("Invalid email or password.");
        return;
      }

      // 3. Fetch attributes
      let userId = email.trim();
      let userName = email.split("@")[0];

      try {
        const currentUser = await getCurrentUser();
        userId = currentUser.userId || currentUser.username || userId;
        const attributes = await fetchUserAttributes();
        if (attributes.name) userName = attributes.name;
      } catch (attrErr) {
        console.warn("Attribute warning:", attrErr);
      }

      const userData = {
        id: userId,
        email: email.trim(),
        name: userName,
      };

      // 4. Save to storage & manage Remember Me preferences
      if (rememberMe) {
        localStorage.setItem("remembered_email", email.trim());
        localStorage.setItem("remember_me_preference", "true");
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        localStorage.removeItem("remembered_email");
        localStorage.removeItem("remember_me_preference");
        sessionStorage.setItem("user", JSON.stringify(userData));
      }

      // 5. Sync with PostgreSQL backend (sets is_active=True)
      try {
        await fetch("http://localhost:8000/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
      } catch (dbErr) {
        console.error("DB Sync error:", dbErr);
      }

      // 6. Update global AuthContext state
      await checkUser();

      // 7. Route to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      if (err.name === "NotAuthorizedException" || err.name === "UserNotFoundException") {
        setError("Incorrect email or password.");
      } else {
        setError(err.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Visual left section */}
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

      {/* Form section */}
      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <div className="mobile-brand">AI Contract Analyzer</div>
          <div className="auth-heading">
            <h2>Welcome Back! 👋</h2>
            <p>Sign in to continue analyzing your contracts.</p>
          </div>

          {successMessage && (
            <div style={{ backgroundColor: "#e6fffa", color: "#234e52", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.9rem" }}>
              ✓ {successMessage}
            </div>
          )}

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

              <Link to="/forgot-password" className="forgot-button">
                Forgot password?
              </Link>
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
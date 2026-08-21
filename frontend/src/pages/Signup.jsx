import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp, confirmSignUp, signIn, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const { isSignUpComplete, nextStep } = await signUp({
        username: email.trim(),
        password: password,
        options: {
          userAttributes: {
            email: email.trim(),
            name: name.trim(),
          },
        },
      });

      if (!isSignUpComplete && nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setIsVerifying(true);
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!confirmationCode) {
      setError("Please enter the verification code.");
      return;
    }

    try {
      setLoading(true);

      // 1. Confirm code in Cognito
      await confirmSignUp({
        username: email.trim(),
        confirmationCode: confirmationCode.trim(),
      });

      // 2. Automatically sign in right away
      await signIn({
        username: email.trim(),
        password: password,
      });

      // 3. Fetch user details & sync to PostgreSQL backend
      let userId = email.trim();
      let userName = name.trim() || email.split("@")[0];

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

      sessionStorage.setItem("user", JSON.stringify(userData));

      fetch("http://localhost:8000/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }).catch((err) => console.error("PostgreSQL sync error:", err));

      // 4. Smooth redirect directly to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid verification code.");
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

          {!isVerifying ? (
            <>
              <div className="auth-heading">
                <h2>Create Your Account ✨</h2>
                <p>Create an account to start analyzing your contracts.</p>
              </div>

              <form onSubmit={handleSignup}>
                <div className="input-group">
                  <label htmlFor="name">Full Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

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
                      placeholder="Create a password"
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

                <div className="input-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? (
                    <span className="loading-content">
                      <span className="spinner"></span>
                      Creating account...
                    </span>
                  ) : (
                    "Create Account →"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-heading">
                <h2>Verify Your Email ✉️</h2>
                <p>We've sent a 6-digit confirmation code to <strong>{email}</strong>.</p>
              </div>

              <form onSubmit={handleConfirmCode}>
                <div className="input-group">
                  <label htmlFor="code">Confirmation Code</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔑</span>
                    <input
                      id="code"
                      type="text"
                      placeholder="Enter verification code"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {resendMessage && <div style={{ color: "#10b981", fontSize: "0.875rem", margin: "0.5rem 0" }}>{resendMessage}</div>}

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? (
                    <span className="loading-content">
                      <span className="spinner"></span>
                      Verifying & Logging In...
                    </span>
                  ) : (
                    "Confirm & Go to Dashboard →"
                  )}
                </button>
              </form>
            </>
          )}

          <div className="auth-switch">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </div>

          <div className="secure-text">
            🔐 Your information is securely protected.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
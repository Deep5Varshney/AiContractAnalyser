import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp, confirmSignUp } from "aws-amplify/auth";

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

  // Live password validation rules
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please meet all the password requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
        navigate("/login", { state: { message: "Account created! Please sign in." } });
      }
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        setError("An account with this email already exists. Please login instead.");
      } else {
        setError(err.message || "Unable to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!confirmationCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    try {
      setLoading(true);

      await confirmSignUp({
        username: email.trim(),
        confirmationCode: confirmationCode.trim(),
      });

      navigate("/login", { 
        state: { message: "Email verified successfully! Please log in with your credentials." } 
      });
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
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

                {/* Password Requirements Helper Box */}
                {password.length > 0 && (
                  <div style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginTop: "-8px",
                    marginBottom: "12px",
                    fontSize: "0.82rem",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px"
                  }}>
                    <div style={{ color: rules.length ? "#10b981" : "#64748b" }}>
                      {rules.length ? "✓" : "○"} At least 8 characters
                    </div>
                    <div style={{ color: rules.upper ? "#10b981" : "#64748b" }}>
                      {rules.upper ? "✓" : "○"} 1 uppercase letter (A-Z)
                    </div>
                    <div style={{ color: rules.lower ? "#10b981" : "#64748b" }}>
                      {rules.lower ? "✓" : "○"} 1 lowercase letter (a-z)
                    </div>
                    <div style={{ color: rules.number ? "#10b981" : "#64748b" }}>
                      {rules.number ? "✓" : "○"} 1 number (0-9)
                    </div>
                    <div style={{ color: rules.special ? "#10b981" : "#64748b", gridColumn: "span 2" }}>
                      {rules.special ? "✓" : "○"} 1 special character (!@#$%^&*)
                    </div>
                  </div>
                )}

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
                      Verifying...
                    </span>
                  ) : (
                    "Confirm & Proceed to Login →"
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
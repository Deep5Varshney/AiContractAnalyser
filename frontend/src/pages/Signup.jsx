import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";

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

  // State for Cognito Email Confirmation Step
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
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            name: name,
          },
        },
      });

      if (!isSignUpComplete && nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setIsVerifying(true);
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to create account."
      );
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
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode.trim(),
      });
      alert("Account verified successfully! Please sign in.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendSignUpCode({ username: email });
      setResendMessage("Verification code resent to your email.");
      setTimeout(() => setResendMessage(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
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

          <div className="brand-mark">
            AI
          </div>

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

        <div className="visual-footer">
          AI Contract Analyzer
        </div>

      </div>


      {/* RIGHT SIDE */}
      <div className="auth-form-section">

        <div className="auth-form-wrapper">

          <div className="mobile-brand">
            AI Contract Analyzer
          </div>

          {!isVerifying ? (
            <>
              <div className="auth-heading">

                <h2>
                  Create Your Account ✨
                </h2>

                <p>
                  Create an account to start analyzing your contracts.
                </p>

              </div>


              <form onSubmit={handleSignup}>

                {/* FULL NAME */}
                <div className="input-group">

                  <label htmlFor="name">
                    Full Name
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      👤
                    </span>

                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />

                  </div>

                </div>


                {/* EMAIL */}
                <div className="input-group">

                  <label htmlFor="email">
                    Email Address
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      ✉
                    </span>

                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                  </div>

                </div>


                {/* PASSWORD */}
                <div className="input-group">

                  <label htmlFor="password">
                    Password
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      🔒
                    </span>

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
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>

                  </div>

                </div>


                {/* CONFIRM PASSWORD */}
                <div className="input-group">

                  <label htmlFor="confirmPassword">
                    Confirm Password
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      🔒
                    </span>

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                    >
                      {showConfirmPassword ? "🙈" : "👁"}
                    </button>

                  </div>

                </div>


                {/* ERROR */}
                {error && (
                  <div className="auth-error">
                    {error}
                  </div>
                )}


                {/* SIGNUP BUTTON */}
                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
                >

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
            /* CODE VERIFICATION SCREEN */
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
                  {loading ? "Verifying..." : "Confirm & Activate Account →"}
                </button>

                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={handleResend}
                    style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    Didn't receive code? Resend Code
                  </button>
                </div>
              </form>
            </>
          )}

          {/* LOGIN SWITCH */}
          <div className="auth-switch">

            <span>
              Already have an account?
            </span>

            <Link to="/login">
              Login
            </Link>

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
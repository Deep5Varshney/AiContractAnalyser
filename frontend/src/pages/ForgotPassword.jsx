import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Request Code, 2: Submit New Password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Live password validation rules
  const rules = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);

  // Step 1: Request Reset Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      const output = await resetPassword({ username: email.trim() });
      const { nextStep } = output;

      if (nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        setStep(2);
      }
    } catch (err) {
      if (err.name === "UserNotFoundException") {
        setError("No account found with this email address.");
      } else if (err.name === "LimitExceededException") {
        setError("Attempt limit exceeded. Please try again later.");
      } else {
        setError(err.message || "Failed to send reset code.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!code.trim() || !newPassword || !confirmNewPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please meet all password requirements below.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code.trim(),
        newPassword: newPassword,
      });

      navigate("/login", {
        state: { message: "Password reset successful! Please log in with your new password." },
      });
    } catch (err) {
      // Handles Cognito error when new password matches an existing/previous password
      if (
        err.name === "InvalidPasswordException" &&
        err.message?.toLowerCase().includes("previous")
      ) {
        setError("New password cannot be the same as your previously used password.");
      } else if (err.name === "CodeMismatchException") {
        setError("Invalid verification code. Please check and try again.");
      } else if (err.name === "ExpiredCodeException") {
        setError("Verification code has expired. Please request a new one.");
      } else {
        setError(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left visual side */}
      <div className="auth-visual">
        <div className="gradient-orb orb-one"></div>
        <div className="gradient-orb orb-two"></div>
        <div className="gradient-orb orb-three"></div>
        <div className="grid-pattern"></div>

        <div className="visual-content">
          <div className="brand-mark">AI</div>
          <h1>
            Secure Access.
            <br />
            <span>Always Protected.</span>
          </h1>
          <p>Reset your password and regain immediate access to your contracts.</p>
        </div>
        <div className="visual-footer">AI Contract Analyzer</div>
      </div>

      {/* Right form side */}
      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <div className="mobile-brand">AI Contract Analyzer</div>

          {step === 1 ? (
            <>
              <div className="auth-heading">
                <h2>Reset Password 🔑</h2>
                <p>Enter your email address to receive a recovery code.</p>
              </div>

              <form onSubmit={handleRequestCode}>
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
                      required
                    />
                  </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? (
                    <span className="loading-content">
                      <span className="spinner"></span>
                      Sending Code...
                    </span>
                  ) : (
                    "Send Verification Code →"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-heading">
                <h2>Set New Password 🔒</h2>
                <p>Enter the code sent to <strong>{email}</strong> and create a new password.</p>
              </div>

              <form onSubmit={handleResetPassword}>
                <div className="input-group">
                  <label htmlFor="code">Verification Code</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔑</span>
                    <input
                      id="code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
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
                {newPassword.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginTop: "-8px",
                      marginBottom: "12px",
                      fontSize: "0.82rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px",
                    }}
                  >
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
                  <label htmlFor="confirmNewPassword">Confirm New Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="confirmNewPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
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
                      Updating Password...
                    </span>
                  ) : (
                    "Reset Password & Login →"
                  )}
                </button>
              </form>
            </>
          )}

          <div className="auth-switch">
            <span>Remember your password?</span>
            <Link to="/login">Back to Login</Link>
          </div>

          <div className="secure-text">
            🔐 Your information is securely protected.
          </div>
        </div>
      </div>
    </div>
  );
}
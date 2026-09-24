


import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Replace with your deployed API Gateway invoke URL
const API_BASE_URL = "https://xxxx.execute-api.ap-south-1.amazonaws.com/dev";
const S3_BUCKET_NAME = "ai-contract-vault-prod";

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recentContracts, setRecentContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  const userId = user?.userId || user?.username || user?.id;

  // Fetch real contracts from PostgreSQL via API Gateway
  const fetchRecentContracts = async () => {
    if (!userId) return;
    try {
      setLoadingContracts(true);
      const res = await fetch(`${API_BASE_URL}/contracts?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentContracts(data.slice(0, 5)); // Show top 5 recent
      }
    } catch (err) {
      console.error("Failed to fetch recent contracts:", err);
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    fetchRecentContracts();
  }, [userId]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
      navigate("/login", { replace: true });
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMessage("");
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");

    if (!validTypes.includes(file.type) && !isDocx) {
      setErrorMessage("Only PDF and DOCX documents are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds the maximum limit of 10MB.");
      return;
    }

    setSelectedFile(file);
    setStatusMessage("");
  };

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  // Drag-and-drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select or drop a contract document first.");
      return;
    }
    if (!userId) {
      setErrorMessage("User authentication missing. Please log in again.");
      return;
    }

    setUploading(true);
    setErrorMessage("");

    try {
      // Step 1: Request S3 Presigned URL from API Gateway
      setStatusMessage("Requesting secure upload authorization...");
      const presignedRes = await fetch(`${API_BASE_URL}/contracts/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: selectedFile.name,
          file_type: selectedFile.type || "application/octet-stream",
          user_id: userId
        })
      });

      if (!presignedRes.ok) throw new Error("Failed to obtain upload URL.");
      const { upload_url, s3_key } = await presignedRes.json();

      // Step 2: Stream Document Directly to Amazon S3
      setStatusMessage("Uploading document directly to Amazon S3...");
      const s3UploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream"
        },
        body: selectedFile
      });

      if (!s3UploadRes.ok) throw new Error("Direct S3 upload failed.");

      // Step 3: Trigger Textract Extraction & Postgres Record
      setStatusMessage("Extracting text and analyzing contract...");
      const contractId = crypto.randomUUID();
      const processRes = await fetch(`${API_BASE_URL}/contracts/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId,
          user_id: userId,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          bucket_name: S3_BUCKET_NAME,
          s3_key: s3_key
        })
      });

      if (!processRes.ok) throw new Error("Document processing request failed.");

      setStatusMessage("Contract successfully analyzed!");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchRecentContracts();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred during contract upload.");
      setStatusMessage("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* ================= NAVBAR ================= */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="brand-logo">AI</div>
          <div>
            <h1>AI Contract Analyzer</h1>
            <p>Smart Contract Analysis</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/dashboard" className="active">Dashboard</Link>
          <Link to="/contracts">My Contracts</Link>
          <a href="#insights">AI Insights</a>
          <Link to="/profile">Profile</Link>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="dashboard-content">
        {/* ================= HERO SECTION ================= */}
        <section className="dashboard-hero">
          <div className="hero-badge">
            ✨ AI-Powered Contract Intelligence
          </div>
          <h2>
            Understand your contracts.
            <br />
            <span>Make smarter decisions.</span>
          </h2>
          <p>
            Upload your contract and let AI identify important clauses,
            potential risks and key insights in seconds.
          </p>
          <div className="hero-document">📄</div>
        </section>

        {/* ================= ANALYZE SECTION ================= */}
        <section className="analyze-section">
          <div className="section-heading">
            <h2>Analyze a Contract</h2>
            <p>Upload your document to get an AI-powered analysis.</p>
          </div>

          <div
            className={`upload-card ${isDragging ? "drag-active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">↑</div>
            <h3>Drop your contract here</h3>
            <p>or choose a file from your computer</p>

            <label className="choose-file-btn">
              Choose File
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                hidden
              />
            </label>

            <p className="file-info">
              PDF, DOC or DOCX · Maximum file size 10MB
            </p>

            {/* ERROR DISPLAY */}
            {errorMessage && (
              <p style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                ⚠️ {errorMessage}
              </p>
            )}

            {/* SELECTED FILE PREVIEW */}
            {selectedFile && (
              <div className="selected-file" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📄</span>
                <strong>{selectedFile.name}</strong>
                <span style={{ fontSize: "0.8rem", color: "#718096" }}>
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#e53e3e" }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* ANALYZE BUTTON */}
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!selectedFile || uploading}
              style={{ opacity: !selectedFile || uploading ? 0.7 : 1, cursor: uploading ? "not-allowed" : "pointer" }}
            >
              {uploading ? statusMessage : "Analyze Contract →"}
            </button>

            {/* STATUS / SUCCESS NOTIFICATION */}
            {statusMessage && !uploading && (
              <div className="analysis-message">
                <h3>✓ Completed</h3>
                <p>{statusMessage}</p>
              </div>
            )}
          </div>
        </section>

        {/* ================= FEATURE CARDS ================= */}
        <section className="feature-grid" id="insights">
          <div className="feature-card">
            <div className="feature-icon yellow">⚠️</div>
            <h3>Risk Analysis</h3>
            <p>Identify potential risks and important contract clauses.</p>
            <a href="#risk">Explore Risks →</a>
          </div>

          <div className="feature-card">
            <div className="feature-icon blue">🤖</div>
            <h3>AI Insights</h3>
            <p>Get simple, easy-to-understand insights from your contracts.</p>
            <a href="#ai-insights">View Insights →</a>
          </div>
        </section>

        {/* ================= RECENT CONTRACTS (DYNAMIC) ================= */}
        <section className="recent-contracts">
          <div className="recent-header">
            <div>
              <h2>Recent Contracts</h2>
              <p>Your recently analyzed documents</p>
            </div>
            <Link to="/contracts">View All →</Link>
          </div>

          <div className="recent-list">
            {loadingContracts ? (
              <p style={{ textAlign: "center", padding: "1rem", color: "#718096" }}>Loading recent contracts...</p>
            ) : recentContracts.length > 0 ? (
              recentContracts.map((contract) => (
                <div className="recent-contract" key={contract.id}>
                  <div className="contract-left">
                    <div className="contract-icon">📄</div>
                    <div>
                      <h3>{contract.file_name}</h3>
                      <p>{new Date(contract.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div
                    className="contract-status"
                    style={{
                      color:
                        contract.status === "ANALYZED"
                          ? "#38a169"
                          : contract.status === "FAILED"
                          ? "#e53e3e"
                          : "#d69e2e"
                    }}
                  >
                    {contract.status === "ANALYZED" && "✓ Analyzed"}
                    {contract.status === "PROCESSING" && "⏳ Processing"}
                    {contract.status === "FAILED" && "✕ Failed"}
                  </div>

                  <Link to={`/contracts?id=${contract.id}`}>View</Link>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#718096" }}>
                No contracts uploaded yet. Upload your first contract above.
              </div>
            )}
          </div>
        </section>

        {/* ================= BOTTOM INFO ================= */}
        <section className="dashboard-bottom">
          <div>
            🔒
            <h3>Your documents stay secure</h3>
            <p>Your contract information is handled securely.</p>
          </div>
          <div>
            ⚡
            <h3>Fast AI Analysis</h3>
            <p>Understand important contract details quickly.</p>
          </div>
          <div>
            💡
            <h3>Simple Insights</h3>
            <p>Complex legal terms explained in simple language.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
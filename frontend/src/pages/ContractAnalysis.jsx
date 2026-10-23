import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ContractAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [contract, setContract] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [contractRes, analysisRes] = await Promise.all([
          fetch(`${API_BASE_URL}/contracts/${id}`),
          fetch(`${API_BASE_URL}/contracts/${id}/analysis`)
        ]);

        if (!contractRes.ok) throw new Error("Failed to load contract details.");
        const contractData = await contractRes.json();
        setContract(contractData);

        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          setAnalysis(analysisData);
        }
      } catch (err) {
        console.error(err);
        setError("Could not load AI analysis data.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-page" style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "#718096" }}>Loading contract intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page" style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "#e53e3e" }}>⚠️ {error}</p>
        <button 
          className="analyze-btn" 
          style={{ width: "auto", marginTop: "1rem" }} 
          onClick={() => navigate("/contracts")}
        >
          Back to Contracts
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* ================= MAIN CONTENT ================= */}
      <main className="dashboard-content">
        <div style={{ marginBottom: "1.5rem" }}>
          <button 
            onClick={() => navigate("/contracts")}
            style={{ background: "none", border: "none", color: "#4f46e5", fontWeight: "600", cursor: "pointer", padding: 0 }}
          >
            ← Back to Contracts
          </button>
        </div>

        {contract && (
          <>
            {/* Header Card */}
            <div className="analyze-section" style={{ marginBottom: "2rem", textAlign: "left", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", color: "#1a202c", marginBottom: "0.25rem" }}>{contract.file_name}</h2>
                  <p style={{ color: "#718096", fontSize: "0.9rem" }}>
                    Uploaded on: {contract.created_at ? new Date(contract.created_at).toLocaleString() : "N/A"}
                  </p>
                </div>
                <span 
                  className="risk-badge low"
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.4rem 1rem",
                    background: contract.status === "ANALYZED" ? "#def7ec" : "#feecdc",
                    color: contract.status === "ANALYZED" ? "#03543f" : "#92400e",
                    borderRadius: "20px",
                    fontWeight: "600"
                  }}
                >
                  {contract.status}
                </span>
              </div>
            </div>

            {/* Split Grid View for Raw Text & AI Insights */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              
              {/* Left Column: Extracted Document Text */}
              <div className="analyze-section" style={{ textAlign: "left", padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📄</span> Extracted Text Document
                </h3>
                <div style={{ 
                  background: "#f8fafc", 
                  padding: "1rem", 
                  borderRadius: "8px", 
                  whiteSpace: "pre-wrap", 
                  border: "1px solid #e2e8f0",
                  height: "450px",
                  overflowY: "auto",
                  fontSize: "0.875rem",
                  color: "#4a5568",
                  fontFamily: "monospace"
                }}>
                  {contract.extracted_text || "No text extracted."}
                </div>
              </div>

              {/* Right Column: AI Analysis & Deep Insights */}
              <div className="analyze-section" style={{ textAlign: "left", padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🤖</span> AI Contract Insights & Summary
                </h3>
                <div style={{ 
                  background: "#fdf8f6", 
                  padding: "1rem", 
                  borderRadius: "8px", 
                  border: "1px solid #fed7d7",
                  height: "450px",
                  overflowY: "auto",
                  fontSize: "0.9rem",
                  color: "#2d3748"
                }}>
                  {analysis ? (
                    <div>
                      <p style={{ fontWeight: "600", color: "#2b6cb0", marginBottom: "0.5rem" }}>📌 Executive Summary</p>
                      <p style={{ marginBottom: "1rem", color: "#4a5568", fontSize: "0.85rem" }}>
                        {analysis.summary || "No summary generated."}
                      </p>

                      <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "1rem 0" }} />

                      <p style={{ fontWeight: "600", color: "#c53030", marginBottom: "0.5rem" }}>⚠️ Risk Analysis & Clauses</p>
                      {analysis.risks && analysis.risks.length > 0 ? (
                        analysis.risks.map((r, idx) => (
                          <div key={idx} style={{ marginBottom: "0.75rem", background: "#fff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "#1a202c" }}>{r.title} ({r.severity} Risk)</div>
                            <p style={{ fontSize: "0.8rem", color: "#4a5568", margin: "0.25rem 0" }}>{r.reason}</p>
                            {r.recommendation && (
                              <p style={{ fontSize: "0.8rem", color: "#2b6cb0", fontWeight: "500" }}>💡 {r.recommendation}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "0.85rem", color: "#4a5568" }}>No significant risks detected.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p style={{ fontWeight: "600", color: "#c53030", marginBottom: "0.5rem" }}>⚠️ Risk Analysis Loading</p>
                      <p style={{ marginBottom: "1rem", color: "#4a5568" }}>
                        Fetching deep AI analysis and clause evaluations...
                      </p>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Contracting Parties & Deadlines / Payment Terms Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              
              {/* Contracting Parties */}
              <div className="analyze-section" style={{ textAlign: "left", padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🤝</span> Contracting Parties
                </h3>
                <ul style={{ paddingLeft: "1.2rem", color: "#4a5568", fontSize: "0.9rem" }}>
                  {analysis?.parties && analysis.parties.length > 0 ? (
                    analysis.parties.map((p, idx) => (
                      <li key={idx} style={{ marginBottom: "0.5rem" }}>
                        <strong>{p.name}</strong> ({p.role})
                      </li>
                    ))
                  ) : (
                    <li>Employer / Employee (Standard Template)</li>
                  )}
                </ul>
              </div>

              {/* Deadlines & Payment Terms */}
              <div className="analyze-section" style={{ textAlign: "left", padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📅</span> Deadlines & Payment Terms
                </h3>
                <div style={{ fontSize: "0.875rem", color: "#4a5568", spaceY: "0.75rem" }}>
                  <p style={{ fontWeight: "600", color: "#2d3748", marginBottom: "0.25rem" }}>Deadlines & Notices:</p>
                  <p style={{ marginBottom: "0.75rem" }}>
                    {analysis?.deadlines?.length ? analysis.deadlines.join(', ') : 'Probationary period length, notice period for termination, penalty clauses applicable.'}
                  </p>
                  
                  <p style={{ fontWeight: "600", color: "#2d3748", marginBottom: "0.25rem" }}>Payment Terms:</p>
                  <p>
                    {analysis?.payment_terms?.length ? analysis.payment_terms.join(', ') : 'Employee receives CTC salary; conditional upon meeting objectives.'}
                  </p>
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ContractAnalysis;
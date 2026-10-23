import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ContractAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [contract, setContract] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("analysis");
  const [compareFile, setCompareFile] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [compareError, setCompareError] = useState("");
  // Chat States
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm your AI legal assistant. Ask me anything about this contract." }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || chatLoading) return;

    const userMessage = inputQuery.trim();
    setInputQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/contracts/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage })
      });

      if (!res.ok) throw new Error("Failed to get chat response.");
      const data = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Sorry, I encountered an error answering your question." }]);
    } finally {
      setChatLoading(false);
    }
  };

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

  const handleCompareSubmit = async (e) => {
  e.preventDefault();
  if (!compareFile) return;

  setComparing(true);
  setCompareError("");

  const formData = new FormData();
  formData.append("file", compareFile);

  try {
    const res = await fetch(`${API_BASE_URL}/contracts/${id}/compare`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Comparison failed.");
    }

    const data = await res.json();
    setComparisonData(data);
  } catch (err) {
    console.error(err);
    setCompareError(err.message || "Failed to compare contract versions.");
  } finally {
    setComparing(false);
  }
};

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
          {/* Tab Switcher */}
          <div style={{ display: "flex", background: "#edf2f7", padding: "4px", borderRadius: "20px" }}>
            <button
              onClick={() => setActiveTab("analysis")}
              style={{
                padding: "6px 16px",
                borderRadius: "16px",
                border: "none",
                background: activeTab === "analysis" ? "#ffffff" : "transparent",
                color: activeTab === "analysis" ? "#4f46e5" : "#4a5568",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: activeTab === "analysis" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              Analysis & Summary
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                padding: "6px 16px",
                borderRadius: "16px",
                border: "none",
                background: activeTab === "chat" ? "#ffffff" : "transparent",
                color: activeTab === "chat" ? "#4f46e5" : "#4a5568",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: activeTab === "chat" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              💬 AI Contract Chat
            </button>
            <button
            onClick={() => setActiveTab("compare")}
            style={{
              padding: "6px 16px",
              borderRadius: "16px",
              border: "none",
              background: activeTab === "compare" ? "#ffffff" : "transparent",
              color: activeTab === "compare" ? "#4f46e5" : "#4a5568",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: activeTab === "compare" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            🔄 Version Comparison
          </button>
          </div>
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

            {/* ================= TAB VIEW 1: ANALYSIS & INSIGHTS ================= */}
            {activeTab === "analysis" && (
              <>
              {/* Download Executive Report Button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                  <a
                    href={`${API_BASE_URL}/contracts/${id}/export/docx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: "#10b981",
                      color: "#ffffff",
                      padding: "0.6rem 1.25rem",
                      borderRadius: "8px",
                      fontWeight: "600",
                      textDecoration: "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      fontSize: "0.9rem"
                    }}
                  >
                    📥 Download Executive Report (.docx)
                  </a>
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
                    <div style={{ fontSize: "0.875rem", color: "#4a5568" }}>
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

            {/* ================= TAB VIEW 2: AI CONTRACT CHAT ================= */}
            {activeTab === "chat" && (
              <div className="analyze-section" style={{ textAlign: "left", padding: "2rem", display: "flex", flexDirection: "column", height: "600px" }}>
                <h3 style={{ marginBottom: "1rem", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>💬</span> Chat with Contract Intelligence
                </h3>
                
                {/* Message History Box */}
                <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.5rem", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {messages.map((msg, index) => (
                    <div key={index} style={{ 
                          alignSelf: msg.role === "user" ? "flex-end" : "flex-start", 
                          maxWidth: "85%", 
                          background: msg.role === "user" ? "#4f46e5" : "#ffffff", 
                          color: msg.role === "user" ? "#ffffff" : "#1a202c", 
                          padding: "1rem 1.25rem", 
                          borderRadius: "12px", 
                          border: msg.role === "assistant" ? "1px solid #e2e8f0" : "none", 
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          lineHeight: "1.6"
                        }}>
                          {msg.role === "user" ? (
                            <p style={{ fontSize: "0.9rem", margin: 0 }}>{msg.content}</p>
                          ) : (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          )}
                        </div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: "flex-start", background: "#ffffff", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <p style={{ fontSize: "0.9rem", color: "#718096", margin: 0 }}>Thinking and reviewing contract clauses...</p>
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask a question about termination clauses, payment terms, penalties, etc..."
                    style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e0", outline: "none", fontSize: "0.9rem" }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    style={{ padding: "0.75rem 1.5rem", background: "#4f46e5", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* ================= TAB VIEW 3: CONTRACT VERSION COMPARISON ================= */}
            {activeTab === "compare" && (
              <div className="analyze-section" style={{ textAlign: "left", padding: "2rem" }}>
                <h3 style={{ marginBottom: "0.5rem", color: "#2d3748" }}>
                  🔄 Compare with Revised Contract (V2)
                </h3>
                <p style={{ color: "#718096", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  Upload a redlined or updated draft to analyze clause-by-clause changes and legal impact.
                </p>

                {/* File Upload Box */}
                <form onSubmit={handleCompareSubmit} style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setCompareFile(e.target.files[0])}
                    style={{ padding: "0.5rem", border: "1px solid #cbd5e0", borderRadius: "8px", background: "#fff" }}
                  />
                  <button
                    type="submit"
                    disabled={!compareFile || comparing}
                    style={{
                      padding: "0.6rem 1.5rem",
                      background: "#4f46e5",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: comparing ? "not-allowed" : "pointer"
                    }}
                  >
                    {comparing ? "Analyzing Differences..." : "Compare Versions"}
                  </button>
                </form>

                {compareError && (
                  <p style={{ color: "#e53e3e", fontSize: "0.9rem", marginBottom: "1rem" }}>⚠️ {compareError}</p>
                )}

                {/* Comparison Results Cards */}
                {comparisonData && (
                  <div>
                    <div style={{ background: "#ebf8ff", border: "1px solid #bee3f8", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                      <h4 style={{ color: "#2b6cb0", margin: 0 }}>
                        Comparing: <strong>{comparisonData.v1_file_name} (V1)</strong> ↔ <strong>{comparisonData.v2_file_name} (V2)</strong>
                      </h4>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {comparisonData.changes && comparisonData.changes.length > 0 ? (
                        comparisonData.changes.map((change, idx) => (
                          <div key={idx} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            
                            {/* Header Badge */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                              <h4 style={{ margin: 0, color: "#1a202c" }}>{change.clause_topic || "Clause Revision"}</h4>
                              <span style={{
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "12px",
                                background: change.type === "ADDED" ? "#def7ec" : change.type === "REMOVED" ? "#fde8e8" : "#feecdc",
                                color: change.type === "ADDED" ? "#03543f" : change.type === "REMOVED" ? "#9b1c1c" : "#92400e"
                              }}>
                                {change.type}
                              </span>
                            </div>

                            {/* Side-by-side Old vs New Text */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                              <div style={{ background: "#fff5f5", padding: "0.75rem", borderRadius: "6px", border: "1px solid #fed7d7" }}>
                                <p style={{ fontSize: "0.75rem", fontWeight: "700", color: "#c53030", margin: "0 0 0.25rem 0" }}>V1 (Original):</p>
                                <p style={{ fontSize: "0.85rem", color: "#2d3748", margin: 0, whiteSpace: "pre-wrap" }}>{change.old_text || "N/A (New Clause Added)"}</p>
                              </div>
                              <div style={{ background: "#f0fff4", padding: "0.75rem", borderRadius: "6px", border: "1px solid #c6f6d5" }}>
                                <p style={{ fontSize: "0.75rem", fontWeight: "700", color: "#2f855a", margin: "0 0 0.25rem 0" }}>V2 (Revised):</p>
                                <p style={{ fontSize: "0.85rem", color: "#2d3748", margin: 0, whiteSpace: "pre-wrap" }}>{change.new_text || "N/A (Clause Removed)"}</p>
                              </div>
                            </div>

                            {/* AI Legal Explanation */}
                            <div style={{ background: "#f7fafc", padding: "0.75rem 1rem", borderRadius: "6px", borderLeft: "4px solid #4f46e5" }}>
                              <p style={{ fontSize: "0.85rem", color: "#2d3748", margin: 0 }}>
                                💡 <strong>Legal Impact:</strong> {change.significance}
                              </p>
                            </div>

                          </div>
                        ))
                      ) : (
                        <p style={{ color: "#718096" }}>No significant differences detected between the two documents.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ContractAnalysis;
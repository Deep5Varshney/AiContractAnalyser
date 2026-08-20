import { useState } from "react";
import { Link } from "react-router-dom";

function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setSelectedFile(file);
      setAnalysisStarted(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      alert("Please select a contract file first.");
      return;
    }

    setAnalysisStarted(true);
  };

  return (
    <div className="dashboard-page">

      <header className="dashboard-header">
        <div>
          <h1>AI Contract Analyzer</h1>
          <p>Analyze and understand your contracts with AI.</p>
        </div>

        <Link to="/profile" className="profile-link">
          Profile
        </Link>
      </header>

      <main className="dashboard-content">

        <section className="welcome-section">
          <h2>Welcome back 👋</h2>
          <p>
            Upload a contract and let AI analyze the important details for you.
          </p>
        </section>

        <section className="upload-card">
          <h2>Analyze a Contract</h2>

          <p>
            Upload your contract document to get an AI-powered analysis.
          </p>

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />

          {selectedFile && (
            <p>
              Selected file: <strong>{selectedFile.name}</strong>
            </p>
          )}

          <button type="button" onClick={handleAnalyze}>
            Analyze Contract
          </button>

          {analysisStarted && (
            <div className="analysis-message">
              <h3>Analysis Started ✅</h3>
              <p>
                Your contract is ready to be analyzed.
              </p>
            </div>
          )}
        </section>

        <section className="dashboard-cards">

          <div className="dashboard-card">
            <h3>📄 My Contracts</h3>
            <p>View your previously analyzed contracts.</p>
          </div>

          <div className="dashboard-card">
            <h3>⚠️ Risk Analysis</h3>
            <p>Identify potential risks and important clauses.</p>
          </div>

          <div className="dashboard-card">
            <h3>🤖 AI Insights</h3>
            <p>Get easy-to-understand insights from your contracts.</p>
          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;
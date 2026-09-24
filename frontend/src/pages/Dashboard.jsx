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

          <Link to="/dashboard" className="active">
            Dashboard
          </Link>

          {/* ONLY ONE MY CONTRACTS */}
          <Link to="/contracts">
            My Contracts
          </Link>

          <a href="#insights">
            AI Insights
          </a>

          <Link to="/profile">
            Profile
          </Link>

        </nav>

        <button className="logout-btn">
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

          <div className="hero-document">
            📄
          </div>

        </section>


        {/* ================= ANALYZE SECTION ================= */}
        <section className="analyze-section">

          <div className="section-heading">
            <h2>Analyze a Contract</h2>

            <p>
              Upload your document to get an AI-powered analysis.
            </p>
          </div>


          <div className="upload-card">

            <div className="upload-icon">
              ↑
            </div>

            <h3>
              Drop your contract here
            </h3>

            <p>
              or choose a file from your computer
            </p>


            {/* FILE INPUT */}
            <label className="choose-file-btn">

              Choose File

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                hidden
              />

            </label>


            <p className="file-info">
              PDF, DOC or DOCX · Maximum file size 10MB
            </p>


            {/* SELECTED FILE */}
            {selectedFile && (
              <div className="selected-file">

                <span>📄</span>

                <strong>
                  {selectedFile.name}
                </strong>

              </div>
            )}


            {/* ANALYZE BUTTON */}
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
            >
              Analyze Contract →
            </button>


            {/* ANALYSIS MESSAGE */}
            {analysisStarted && (
              <div className="analysis-message">

                <h3>
                  ✓ Analysis Started
                </h3>

                <p>
                  Your contract is ready to be analyzed.
                </p>

              </div>
            )}

          </div>

        </section>


        {/* </main>
        ================= FEATURE CARDS =================
        <section className="feature-grid" id="insights">


          {/* RISK ANALYSIS */}
          {/* <div className="feature-card">

            <div className="feature-icon yellow">
              ⚠️
            </div>

            <h3>
              Risk Analysis
            </h3>

            <p>
              Identify potential risks and important contract clauses.
            </p> */} */}

            {/* <a href="#risk">
              Explore Risks →
            </a>

          </div>


          {/* AI INSIGHTS */}
          {/* <div className="feature-card">

            <div className="feature-icon blue"> */}
              {/* 🤖
            </div>

            <h3>
              AI Insights
            </h3>

            <p>
              Get simple, easy-to-understand insights from your contracts.
            </p>

            <a href="#ai-insights">
              View Insights →
            </a> */} */}

          {/* </div>

        </section>


        {/* ================= RECENT CONTRACTS ================= */}
        {/* <section className="recent-contracts">

          <div className="recent-header">

            <div>
              <h2>
                Recent Contracts
              </h2>

              <p>
                Your recently analyzed documents */}
              {/* </p>
            </div> */}

            {/* <Link to="/contracts">
              View All →
            </Link>

          </div>


          <div className="recent-list"> */} */}


            {/* CONTRACT 1 */}
            {/* <div className="recent-contract">

              <div className="contract-left">

                <div className="contract-icon">
                  📄
                </div>

                <div>
                  <h3>
                    Employment Agreement.pdf
                  </h3>

                  <p>
                    Analyzed today
                  </p>
                </div>

              </div>

              <div className="contract-status">
                ✓ Analyzed
              </div> */}

              {/* <Link to="/contracts">
                View
              </Link>

            </div> */}


            {/* CONTRACT 2
            <div className="recent-contract">

              <div className="contract-left">

                <div className="contract-icon">
                  📄
                </div>

                // /
              {/* //     <h3>
              //       Internship Contract.pdf
              //     </h3>

              //     <p>
              //       Analyzed yesterday
              //     </p>
              //   </div>

              // </div>

              // <div className="contract-status">
              //   ✓ Analyzed
              // </div>

              // <Link to="/contracts">
                View
              </Link>

            </div> */} */}


            {/* CONTRACT 3
            <div className="recent-contract">

              <div className="contract-left">

                <div className="contract-icon">
                  📄
                </div>

                <div>
                  <h3>
                    Service Agreement.docx
                  </h3>

                  <p>
                    Analyzed 2 days ago */}
                  {/* </p>
                </div>

              </div>

              <div className="contract-status">
                ✓ Analyzed
              </div>

              <Link to="/contracts">
                View
              </Link>

            </div>

          </div>

        </section> */}


        {/* ================= BOTTOM INFO ================= */}
        <section className="dashboard-bottom">

          <div>
            🔒
            <h3>
              Your documents stay secure
            </h3>

            <p>
              Your contract information is handled securely.
            </p>
          </div>


          <div>
            ⚡
            <h3>
              Fast AI Analysis
            </h3>

            <p>
              Understand important contract details quickly.
            </p>
          </div>


          <div>
            💡
            <h3>
              Simple Insights
            </h3>

            <p>
              Complex legal terms explained in simple language.
            </p>
          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "https://xxxx.execute-api.ap-south-1.amazonaws.com/dev";

function MyContracts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.userId || user?.username || user?.id;

  // Load user's contracts from PostgreSQL via API Gateway
  useEffect(() => {
    const fetchContracts = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/contracts?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setContracts(data);
        }
      } catch (err) {
        console.error("Error fetching contracts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [userId]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const name = contract.file_name || "";
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || (contract.status || "All") === filter;
      return matchesSearch && matchesFilter;
    });
  }, [contracts, search, filter]);

  const getStatusClass = (status) => {
    if (status === "ANALYZED") return "low";
    if (status === "PROCESSING") return "medium";
    return "high";
  };

  return (
    <div className="my-contracts-page">
      {/* Header */}
      <div className="contracts-heading">
        <div>
          <h1>My Contracts</h1>
          <p>View and manage your previously analyzed contracts.</p>
        </div>

        <button
          className="upload-contract-btn"
          onClick={() => navigate("/dashboard")}
        >
          + Upload Contract
        </button>
      </div>

      {/* Search + Filter */}
      <div className="contracts-toolbar">
        <div className="search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          {["All", "ANALYZED", "PROCESSING", "FAILED"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item === "ANALYZED"
                ? "Analyzed"
                : item === "PROCESSING"
                ? "Processing"
                : item === "FAILED"
                ? "Failed"
                : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="contracts-list">
        <div className="contracts-list-header">
          <span>Contract</span>
          <span>Status</span>
          <span>Upload Date</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
            Loading contracts...
          </div>
        ) : filteredContracts.length > 0 ? (
          filteredContracts.map((contract) => (
            <div className="contract-row" key={contract.id}>
              <div className="contract-info">
                <div className="file-icon">📄</div>
                <div>
                  <h3>{contract.file_name}</h3>
                  <p>{contract.file_type || "Document"}</p>
                </div>
              </div>

              <div>
                <span className={`risk-badge ${getStatusClass(contract.status)}`}>
                  {contract.status}
                </span>
              </div>

              <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                {new Date(contract.created_at).toLocaleDateString()}
              </div>

              <div className="contract-actions">
                <button onClick={() => navigate(`/analysis/${contract.id}`)}>
                  View Analysis →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-contracts">
            <div>📂</div>
            <h3>No contracts found</h3>
            <p>Upload a contract from your dashboard to see it listed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyContracts;
import { useMemo, useState } from "react";

function MyContracts() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // Temporary frontend data.
  // Backend connect hone ke baad yahin API data aayega.
  const contracts = [
    {
      id: 1,
      name: "Employment Agreement.pdf",
      date: "Analyzed today",
      risk: "Low Risk",
      score: 32,
    },
    {
      id: 2,
      name: "Internship Contract.pdf",
      date: "Analyzed yesterday",
      risk: "Medium Risk",
      score: 54,
    },
    {
      id: 3,
      name: "Service Agreement.docx",
      date: "Analyzed 2 days ago",
      risk: "High Risk",
      score: 78,
    },
    {
      id: 4,
      name: "Freelance Agreement.pdf",
      date: "Analyzed 5 days ago",
      risk: "Low Risk",
      score: 28,
    },
  ];

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch = contract.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || contract.risk === filter;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const getRiskClass = (risk) => {
    if (risk === "Low Risk") return "low";
    if (risk === "Medium Risk") return "medium";
    return "high";
  };

  return (
    <div className="my-contracts-page">

      {/* Header */}
      <div className="contracts-heading">
        <div>
          <h1>My Contracts</h1>
          <p>
            View and manage your previously analyzed contracts.
          </p>
        </div>

        <button className="upload-contract-btn">
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
          {["All", "Low Risk", "Medium Risk", "High Risk"].map(
            (item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>

      {/* Contracts */}
      <div className="contracts-list">

        <div className="contracts-list-header">
          <span>Contract</span>
          <span>Risk Score</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {filteredContracts.length > 0 ? (
          filteredContracts.map((contract) => (
            <div className="contract-row" key={contract.id}>

              <div className="contract-info">
                <div className="file-icon">📄</div>

                <div>
                  <h3>{contract.name}</h3>
                  <p>{contract.date}</p>
                </div>
              </div>

              <div className={`risk-score ${getRiskClass(contract.risk)}`}>
                {contract.score}
              </div>

              <div>
                <span
                  className={`risk-badge ${getRiskClass(
                    contract.risk
                  )}`}
                >
                  {contract.risk}
                </span>
              </div>

              <div className="contract-actions">
                <button>View Analysis →</button>
                <button className="download-btn">
                  ↓
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="no-contracts">
            <div>📂</div>
            <h3>No contracts found</h3>
            <p>
              Try changing your search or filter.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}

export default MyContracts;
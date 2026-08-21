import { useState } from "react";

function Profile() {
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: "Bhoomika Mittal",
    email: "bhoomika@example.com",
    phone: "+91 98765 43210",
    company: "AI Contract Analyzer",
    role: "Contract Analyst",
  });

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = () => {
    setEditing(false);
    alert("Profile updated successfully!");
  };

  return (
    <div className="profile-page">

      {/* HEADER */}
      <div className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your account information and preferences.</p>
        </div>

        {!editing ? (
          <button
            className="edit-profile-btn"
            onClick={() => setEditing(true)}
          >
            ✎ Edit Profile
          </button>
        ) : (
          <div className="profile-header-actions">
            <button
              className="cancel-profile-btn"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>

            <button
              className="save-profile-btn"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        )}
      </div>


      {/* PROFILE MAIN */}
      <div className="profile-layout">

        {/* LEFT PROFILE CARD */}
        <div className="profile-card profile-summary">

          <div className="profile-avatar">
            {profile.name.charAt(0)}
          </div>

          <h2>{profile.name}</h2>

          <p className="profile-role">
            {profile.role}
          </p>

          <p className="profile-email">
            {profile.email}
          </p>

          <div className="profile-divider"></div>

          <div className="profile-stat">
            <span>Contracts Analyzed</span>
            <strong>12</strong>
          </div>

          <div className="profile-stat">
            <span>Member Since</span>
            <strong>2026</strong>
          </div>

        </div>


        {/* RIGHT DETAILS */}
        <div className="profile-card profile-details">

          <div className="profile-section-title">
            <div>
              <h2>Personal Information</h2>
              <p>Update your personal and account details.</p>
            </div>
          </div>


          <div className="profile-form">

            {/* NAME */}
            <div className="profile-field">
              <label>Full Name</label>

              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                />
              ) : (
                <div className="profile-value">
                  {profile.name}
                </div>
              )}
            </div>


            {/* EMAIL */}
            <div className="profile-field">
              <label>Email Address</label>

              {editing ? (
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                />
              ) : (
                <div className="profile-value">
                  {profile.email}
                </div>
              )}
            </div>


            {/* PHONE */}
            <div className="profile-field">
              <label>Phone Number</label>

              {editing ? (
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                />
              ) : (
                <div className="profile-value">
                  {profile.phone}
                </div>
              )}
            </div>


            {/* COMPANY */}
            <div className="profile-field">
              <label>Organization</label>

              {editing ? (
                <input
                  type="text"
                  name="company"
                  value={profile.company}
                  onChange={handleChange}
                />
              ) : (
                <div className="profile-value">
                  {profile.company}
                </div>
              )}
            </div>


            {/* ROLE */}
            <div className="profile-field">
              <label>Role</label>

              {editing ? (
                <input
                  type="text"
                  name="role"
                  value={profile.role}
                  onChange={handleChange}
                />
              ) : (
                <div className="profile-value">
                  {profile.role}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>


      {/* SECURITY SECTION */}
      <div className="profile-card security-card">

        <div className="security-icon">
          🔒
        </div>

        <div className="security-content">
          <h2>Account Security</h2>

          <p>
            Your account and contract information are protected
            with secure authentication.
          </p>
        </div>

        <button className="change-password-btn">
          Change Password
        </button>

      </div>


      {/* PREFERENCES */}
      <div className="profile-card preferences-card">

        <div>
          <h2>Preferences</h2>
          <p>
            Manage how you interact with the Contract Analyzer.
          </p>
        </div>

        <div className="preference-row">

          <div>
            <strong>Email Notifications</strong>
            <span>
              Receive updates about your contract analysis.
            </span>
          </div>

          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider"></span>
          </label>

        </div>


        <div className="preference-row">

          <div>
            <strong>AI Insights</strong>
            <span>
              Get intelligent insights and risk recommendations.
            </span>
          </div>

          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider"></span>
          </label>

        </div>

      </div>

    </div>
  );
}

export default Profile;
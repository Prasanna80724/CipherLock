import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css";
import { FaStickyNote, FaLink, FaLock, FaSignOutAlt, FaUserSlash } from "react-icons/fa";

const Menu = () => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [authCheck, setAuthCheck] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const saved = localStorage.getItem("Safe-notes");
        if (!saved) {
          navigate("/", { replace: true });
          return;
        }
        
        const parsed = JSON.parse(saved);
        if (!parsed || !parsed.ciphertext || !parsed.iv) {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Invalid stored passkey:", err);
        navigate("/", { replace: true });
      }
    };
    checkAuth();
  }, [navigate, authCheck]);

  const handleLogout = () => {
    localStorage.removeItem("Safe-notes");
    navigate("/", { replace: true });
  };

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!confirmDelete) return;

    setDeleting(true);

    // Clear localStorage immediately
    localStorage.removeItem("Safe-notes");

    const deleteRequest = indexedDB.deleteDatabase("SafeNotesDB");

    deleteRequest.onsuccess = () => {
      console.log("SafeNotesDB deleted successfully.");
      setDeleting(false);
      // Force a complete page reload
      window.location.reload();
    };

    deleteRequest.onerror = (e) => {
      console.error("Error deleting SafeNotesDB:", e);
      setDeleting(false);
      alert("Failed to delete account data.");
      // Still reload since localStorage was cleared
      window.location.reload();
    };

    deleteRequest.onblocked = () => {
      setDeleting(false);
      alert("Please close other tabs using CipherLock and try again.");
    };
  };

  return (
    <div className="menu-wrapper">
      <div className="menu-left">
        <div className="menu-header">CipherLock</div>
        <div className="menu-subtext">
          Secure your thoughts, protect your privacy with encrypted notes, links and passwords.
        </div>

        <div className="menu-grid">
          <div className="menu-card" onClick={() => navigate("/notes")}>
            <FaStickyNote className="menu-icon" />
            <h3>Notes</h3>
          </div>

          <div className="menu-card" onClick={() => navigate("/links")}>
            <FaLink className="menu-icon" />
            <h3>Links</h3>
          </div>

          <div className="menu-card" onClick={() => navigate("/passwords")}>
            <FaLock className="menu-icon" />
            <h3>Passwords</h3>
          </div>

          <div className="menu-card" onClick={handleLogout}>
            <FaSignOutAlt className="menu-icon" />
            <h3>Logout</h3>
          </div>

          <div className="menu-card delete-card" onClick={handleDeleteAccount}>
            <FaUserSlash className="menu-icon" />
            <h3>{deleting ? "Deleting..." : "Delete Account"}</h3>
          </div>
        </div>
      </div>

      <div className="menu-image">
        <img src="/private-data.png" alt="Secure Vault" />
      </div>
    </div>
  );
};

export default Menu;
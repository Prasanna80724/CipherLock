import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css";
import { FaStickyNote, FaLink, FaLock, FaSignOutAlt, FaUserSlash } from "react-icons/fa";


const Menu = () => {
  const navigate = useNavigate();

  // Add authentication check on component mount
  useEffect(() => {
    const checkAuth = () => {
      const localVal = localStorage.getItem("Safe-notes");
      if (!localVal || localVal === "0" || localVal.length < 4) {
        navigate("/", { replace: true });
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("Safe-notes"); // Changed from setItem to removeItem
    navigate("/", { replace: true });
  };

 const handleDeleteAccount = () => {
  // Delete the IndexedDB database
  const deleteRequest = indexedDB.deleteDatabase("SafeNotesDB");

  deleteRequest.onsuccess = () => {
    console.log("SafeNotesDB deleted successfully.");
    localStorage.removeItem("Safe-notes");
    navigate("/", { replace: true });
  };

  deleteRequest.onerror = (e) => {
    console.error("Error deleting SafeNotesDB:", e);
    alert("Failed to delete account data.");
  };

  deleteRequest.onblocked = () => {
    alert("Please close other tabs using the app and try again.");
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
            <h3>Delete Account</h3>
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
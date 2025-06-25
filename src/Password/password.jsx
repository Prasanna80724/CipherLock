import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./password.css"; // reuse link.css styling
import { initializeDB } from '../db';
import { FaSearch, FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";

const Passwords = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [passwords, setPasswords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);

  const encryptText = (text, key) => {
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }
    return btoa(encrypted);
  };

  const decryptText = (encryptedText, key) => {
    try {
      const decoded = atob(encryptedText);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode ^ keyChar);
      }
      return decrypted;
    } catch {
      return '';
    }
  };

  const getEncryptionKey = () => {
    const localVal = localStorage.getItem("Safe-notes");
    return typeof localVal === "string" && localVal.length > 0 ? localVal : "default-key";
  };

  useEffect(() => {
    const localVal = localStorage.getItem("Safe-notes");
    if (!localVal || localVal === "0" || localVal.length < 4) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    initializeDB(() => {
      setDbReady(true);
      loadPasswords();
    }, () => setDbError(true));
  }, []);

  const loadPasswords = () => {
    const db = window.data_base;
    if (!db) return;

    const tx = db.transaction("passwords", "readonly");
    const store = tx.objectStore("passwords");
    const request = store.getAll();

    request.onsuccess = () => {
      const key = getEncryptionKey();
      const decrypted = request.result.map(entry => ({
        ...entry,
        title: decryptText(entry.title, key),
        password: decryptText(entry.password, key)
      }));
      setPasswords(decrypted);
    };

    request.onerror = () => {
      setPasswords([]);
    };
  };

  const handleAddPassword = () => {
    if (!title.trim() || !password.trim()) return;
    const db = window.data_base;
    const key = getEncryptionKey();
    const tx = db.transaction("passwords", "readwrite");
    const store = tx.objectStore("passwords");

    const newEntry = {
      id: editingEntry ? editingEntry.id : Date.now().toString(),
      title: encryptText(title.trim(), key),
      password: encryptText(password.trim(), key),
      createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString()
    };

    const request = editingEntry ? store.put(newEntry) : store.add(newEntry);
    request.onsuccess = () => {
      loadPasswords();
      closeModal();
    };
    request.onerror = () => {
      alert('Failed to save password.');
    };
  };

  const handleEditPassword = (entry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setPassword(entry.password);
    setShowModal(true);
  };

  const handleDeletePassword = (id) => {
    if (!window.confirm("Are you sure?")) return;
    const db = window.data_base;
    const tx = db.transaction("passwords", "readwrite");
    const store = tx.objectStore("passwords");
    store.delete(id).onsuccess = loadPasswords;
  };

  const closeModal = () => {
    setShowModal(false);
    setTitle("");
    setPassword("");
    setEditingEntry(null);
  };

  const filtered = passwords.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.password.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="notes-container">
      <div className="navbar">
        <h1>CipherLock</h1>
        <nav>
          <span className={`nav-item ${location.pathname === '/menu' ? 'active' : ''}`} onClick={() => navigate('/menu')}>Home</span>
          <span className={`nav-item ${location.pathname === '/links' ? 'active' : ''}`} onClick={() => navigate('/links')}>Links</span>
          <span className={`nav-item ${location.pathname === '/notes' ? 'active' : ''}`} onClick={() => navigate('/notes')}>Notes</span>
          <span className={`nav-item ${location.pathname === '/passwords' ? 'active' : ''}`} onClick={() => navigate('/passwords')}>Passwords</span>
        </nav>
      </div>

      <div className="notes-content">
        <div className="notes-header">
          <h2 className="notes-title">Passwords ({filtered.length})
            {!dbReady && <span style={{ fontSize: '14px', color: '#666' }}> - Loading...</span>}
            {dbError && <span style={{ fontSize: '14px', color: '#f44336' }}> - Database Error</span>}
          </h2>
          <button className="add-note-btn" onClick={() => setShowModal(true)} disabled={!dbReady}>
            <FaPlus /> Add Password
          </button>
        </div>

        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search Password..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="notes-grid">
          {!dbReady ? (
            <div className="empty-state"><p>Initializing database...</p></div>
          ) : dbError ? (
            <div className="empty-state"><p>Database error. Please refresh the page.</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No passwords stored. Click "Add Password".</p></div>
          ) : (
            filtered.map((entry) => (
              <div key={entry.id} className="note-card">
                <div className="note-header">
                  <h3 className="note-title">{entry.title}</h3>
                  <div className="note-actions">
                    <button className="note-action-btn edit" onClick={() => handleEditPassword(entry)}><FaEdit /></button>
                    <button className="note-action-btn delete" onClick={() => handleDeletePassword(entry.id)}><FaTrash /></button>
                  </div>
                </div>
                <p className="note-description">{entry.password}</p>
                <span className="note-date">{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEntry ? 'Edit Password' : 'Add Password'}</h3>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="title">Title (e.g., Gmail)</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter site/app name..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <textarea
                  id="password"
                  placeholder="Enter the password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="modal-textarea"
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeModal}>Cancel</button>
              <button className="save-btn" onClick={handleAddPassword} disabled={!title.trim() || !password.trim()}>
                {editingEntry ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Passwords;

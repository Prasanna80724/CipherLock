import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./password.css";
import { initializeDB } from '../db';
import { FaSearch, FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";

// AES utilities
const getKeyMaterial = async (password) => {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
};

const getAESKey = async (password, salt) => {
  const keyMaterial = await getKeyMaterial(password);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const encryptText = async (text, password) => {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await getAESKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + salt.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(salt, iv.length);
  combined.set(new Uint8Array(encrypted), iv.length + salt.length);
  return btoa(String.fromCharCode(...combined));
};

const decryptText = async (base64Data, password) => {
  try {
    const data = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const salt = data.slice(12, 28);
    const encrypted = data.slice(28);
    const key = await getAESKey(password, salt);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '';
  }
};

const getEncryptionKey = () => {
  const localVal = localStorage.getItem("Safe-notes");
  return typeof localVal === "string" && localVal.length > 0 ? localVal : "default-key";
};

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

  const loadPasswords = async () => {
    const db = window.data_base;
    if (!db) return;

    const tx = db.transaction("passwords", "readonly");
    const store = tx.objectStore("passwords");
    const request = store.getAll();

    request.onsuccess = async () => {
      const key = getEncryptionKey();
      const decrypted = await Promise.all(
        request.result.map(async entry => ({
          ...entry,
          title: await decryptText(entry.title, key),
          password: await decryptText(entry.password, key)
        }))
      );
      setPasswords(decrypted);
    };

    request.onerror = () => setPasswords([]);
  };

const handleAddPassword = async () => {
  if (!title.trim() || !password.trim()) return;

  const key = getEncryptionKey();
  const encryptedTitle = await encryptText(title.trim(), key);
  const encryptedPassword = await encryptText(password.trim(), key);

  const db = window.data_base;
  const tx = db.transaction("passwords", "readwrite");
  const store = tx.objectStore("passwords");

  const newEntry = {
    id: editingEntry ? editingEntry.id : Date.now().toString(),
    title: encryptedTitle,
    password: encryptedPassword,
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

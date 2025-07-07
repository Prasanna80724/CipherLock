import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./link.css";
import { initializeDB } from '../db';
import { FaSearch, FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";

// AES Utility Functions
const getKeyMaterial = async (password) => {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
};

const getAESKey = async (password, salt) => {
  const keyMaterial = await getKeyMaterial(password);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
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
  } catch (e) {
    console.error("AES decryption failed", e);
    return "";
  }
};

const getEncryptionKey = () => {
  const localVal = localStorage.getItem("Safe-notes");
  return typeof localVal === "string" && localVal.length > 0 ? localVal : "default-key";
};

const Link = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [links, setLinks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingLink, setEditingLink] = useState(null);
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
      loadLinks();
    }, () => setDbError(true));
  }, []);

  const loadLinks = async () => {
    const db = window.data_base;
    if (!db) return;

    const tx = db.transaction("links", "readonly");
    const store = tx.objectStore("links");
    const request = store.getAll();

    request.onsuccess = async () => {
      const encryptedLinks = request.result || [];
      const key = getEncryptionKey();

      const decryptedLinks = await Promise.all(
        encryptedLinks.map(async (link) => ({
          ...link,
          title: await decryptText(link.title, key),
          description: await decryptText(link.description, key),
        }))
      );

      setLinks(decryptedLinks);
    };

    request.onerror = () => setLinks([]);
  };

  const handleAddLink = async () => {
    if (!title.trim() || !description.trim()) return;

    const key = getEncryptionKey();
    const encryptedTitle = await encryptText(title.trim(), key);
    const encryptedDescription = await encryptText(description.trim(), key);

    const newLink = {
      id: editingLink ? editingLink.id : Date.now().toString(),
      title: encryptedTitle,
      description: encryptedDescription,
      createdAt: editingLink ? editingLink.createdAt : new Date().toISOString(),
    };

    const db = window.data_base;
    const tx = db.transaction("links", "readwrite");
    const store = tx.objectStore("links");
    const request = editingLink ? store.put(newLink) : store.add(newLink);

    request.onsuccess = () => {
      loadLinks();
      closeModal();
    };

    request.onerror = () => {
      alert("Failed to save link.");
    };
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
    setTitle(link.title);
    setDescription(link.description);
    setShowModal(true);
  };

  const handleDeleteLink = (linkId) => {
    if (!window.confirm("Are you sure?")) return;
    const db = window.data_base;
    const tx = db.transaction("links", "readwrite");
    const store = tx.objectStore("links");
    const request = store.delete(linkId);

    request.onsuccess = () => loadLinks();
    request.onerror = () => alert("Failed to delete");
  };

  const closeModal = () => {
    setShowModal(false);
    setTitle("");
    setDescription("");
    setEditingLink(null);
  };

  const filteredLinks = links.filter((link) =>
    link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.description.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2 className="notes-title">
            Links ({filteredLinks.length})
            {!dbReady && <span style={{ fontSize: '14px', color: '#666' }}> - Loading...</span>}
            {dbError && <span style={{ fontSize: '14px', color: '#f44336' }}> - Database Error</span>}
          </h2>
          <button className="add-note-btn" onClick={() => setShowModal(true)} disabled={!dbReady}>
            <FaPlus /> Add Link
          </button>
        </div>

        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search Link here..."
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
          ) : filteredLinks.length === 0 ? (
            <div className="empty-state"><p>No links found. Click "Add Link" to create your first one.</p></div>
          ) : (
            filteredLinks.map((link) => (
              <div key={link.id} className="note-card">
                <div className="note-header">
                  <h3 className="note-title">{link.title}</h3>
                  <div className="note-actions">
                    <button className="note-action-btn edit" onClick={() => handleEditLink(link)}><FaEdit /></button>
                    <button className="note-action-btn delete" onClick={() => handleDeleteLink(link.id)}><FaTrash /></button>
                  </div>
                </div>
                <p className="note-description">{link.description}</p>
                <span className="note-date">{new Date(link.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLink ? 'Edit Link' : 'Add Link'}</h3>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter link title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div className="input-group">
                <label htmlFor="description">URL / Description</label>
                <textarea
                  id="description"
                  placeholder="Enter the URL or link description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="modal-textarea"
                  rows="5"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeModal}>Cancel</button>
              <button className="save-btn" onClick={handleAddLink} disabled={!title.trim() || !description.trim()}>
                {editingLink ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Link;

import React, { useState, useEffect } from "react";
import { useNavigate ,useLocation} from "react-router-dom";
import "./Notes.css";
import { initializeDB } from '../db';
import { FaSearch, FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";



const Notes = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingNote, setEditingNote] = useState(null);
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
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  };

  const getEncryptionKey = () => {
    let localVal = localStorage.getItem("Safe-notes");
    if (typeof localVal === "string" && localVal.length > 0) return localVal;
    return "default-key";
  };

  useEffect(() => {
    const checkAuth = () => {
      const localVal = localStorage.getItem("Safe-notes");
      if (!localVal || localVal === "0" || localVal.length < 4) {
        navigate("/", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
     initializeDB(() => {
       setDbReady(true);
       loadNotes();
     }, () => setDbError(true));
   }, []);
 

  const loadNotes = () => {
    const db = window.data_base;
    if (!db) return;

    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const request = store.getAll();

    request.onsuccess = async () => {
      const encryptedNotes = request.result || [];
      const key = getEncryptionKey();

      const decryptedNotes = encryptedNotes.map(note => {
        return {
          ...note,
          title: decryptText(note.title, key),
          description: decryptText(note.description, key)
        };
      });
      setNotes(decryptedNotes);
    };

    request.onerror = () => {
      setNotes([]);
    };
  };

  const handleAddNote = () => {
    if (!title.trim() || !description.trim()) return;
    const db = window.data_base;
    const key = getEncryptionKey();
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");

    const newNote = {
      id: editingNote ? editingNote.id : Date.now().toString(),
      title: encryptText(title.trim(), key),
      description: encryptText(description.trim(), key),
      createdAt: editingNote ? editingNote.createdAt : new Date().toISOString()
    };

    const request = editingNote ? store.put(newNote) : store.add(newNote);
    request.onsuccess = () => {
      loadNotes();
      closeModal();
    };
    request.onerror = () => {
      alert('Failed to save note.');
    };
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setDescription(note.description);
    setShowModal(true);
  };

  const handleDeleteNote = (noteId) => {
    if (!window.confirm("Are you sure?")) return;
    const db = window.data_base;
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");
    const request = store.delete(noteId);

    request.onsuccess = () => loadNotes();
    request.onerror = () => alert("Failed to delete");
  };

  const closeModal = () => {
    setShowModal(false);
    setTitle("");
    setDescription("");
    setEditingNote(null);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="notes-container">
     <div className="navbar">
  <h1>CipherLock</h1>
  <nav>
    <span
      className={`nav-item ${location.pathname === '/menu' ? 'active' : ''}`}
      onClick={() => navigate('/menu')}
    >
      Home
    </span>
    <span
      className={`nav-item ${location.pathname === '/links' ? 'active' : ''}`}
      onClick={() => navigate('/links')}
    >
      Links
    </span>
    <span
      className={`nav-item ${location.pathname === '/notes' ? 'active' : ''}`}
    >
      Notes
    </span>
    <span
      className={`nav-item ${location.pathname === '/passwords' ? 'active' : ''}`}
      onClick={() => navigate('/passwords')}
    >
      Passwords
    </span>
  </nav>
</div>


      <div className="notes-content">
        <div className="notes-header">
          <h2 className="notes-title">
            Notes ({filteredNotes.length})
            {!dbReady && <span style={{ fontSize: '14px', color: '#666' }}> - Loading...</span>}
            {dbError && <span style={{ fontSize: '14px', color: '#f44336' }}> - Database Error</span>}
          </h2>
          <button className="add-note-btn" onClick={() => setShowModal(true)} disabled={!dbReady}>
            <FaPlus /> Add Note
          </button>
        </div>

        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search Note here..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="notes-grid">
          {!dbReady ? (
            <div className="empty-state">
              <p>Initializing database...</p>
            </div>
          ) : dbError ? (
            <div className="empty-state">
              <p>Database error. Please refresh the page.</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-state">
              <p>No notes found. Click "Add Note" to create your first note.</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="note-card">
                <div className="note-header">
                  <h3 className="note-title">{note.title}</h3>
                  <div className="note-actions">
                    <button className="note-action-btn edit" onClick={() => handleEditNote(note)}>
                      <FaEdit />
                    </button>
                    <button className="note-action-btn delete" onClick={() => handleDeleteNote(note.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <p className="note-description">{note.description}</p>
                <span className="note-date">{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingNote ? 'Edit Note' : 'Add Note'}</h3>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div className="input-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Enter note description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="modal-textarea"
                  rows="5"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeModal}>Cancel</button>
              <button className="save-btn" onClick={handleAddNote} disabled={!title.trim() || !description.trim()}>
                {editingNote ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;

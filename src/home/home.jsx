import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { initializeDB } from '../db';
import { deriveKey, encryptData, decryptData } from "../utils/crypto";


const Home = () => {
  const [input, setInput] = useState("");
  const [valid, setValid] = useState(true);
  const [showSection, setShowSection] = useState("loading");
  const [isNewPasskey, setIsNewPasskey] = useState(false);
  const navigate = useNavigate();

 

  const onInputChange = (ev) => {
    setInput(ev.target.value);
    setValid(!(ev.target.value >= 1000 && ev.target.value <= 9999));
  };

  const checkPasskey = () => {
  const db = window.data_base;
  if (!db) {
    console.error("Database not initialized yet.");
    return;
  }

  const tx = db.transaction("passkey", "readonly");
  const store = tx.objectStore("passkey");

  store.count().onsuccess = (event) => {
    const count = event.target.result;

    if (count === 0) {
      // No passkey in DB: this is a new user
      setIsNewPasskey(true);
      setShowSection("set");
    } else {
      // Passkey exists in DB, check localStorage now
      const localVal = localStorage.getItem("Safe-notes");
      if (!localVal) {
        setShowSection("set");
        return;
      }

      try {
        const parsed = JSON.parse(localVal);

        store.openCursor().onsuccess = async (e) => {
          const cursor = e.target.result;
          if (!cursor) {
            setShowSection("set");
            return;
          }

          try {
            const key = await deriveKey(input); // input is empty at first
            const decrypted = await decryptData(key, cursor.value.ciphertext, cursor.value.iv);
            if (decrypted === input) {
              navigate("/menu");
            } else {
              setShowSection("set");
            }
          } catch {
            setShowSection("set");
          }
        };
      } catch (err) {
        console.error("Corrupt Safe-notes in localStorage");
        setShowSection("set");
      }
    }
  };
};


const handleSetPasskey = async () => {
  const db = window.data_base;
  if (!db) return alert("Database not ready");

  const key = await deriveKey(input);
  const { ciphertext, iv } = await encryptData(key, input);

  if (isNewPasskey) {
    const tx = db.transaction("passkey", "readwrite");
    const store = tx.objectStore("passkey");
    await store.clear();
    store.add({ id: Date.now(), ciphertext, iv });
    localStorage.setItem("Safe-notes", JSON.stringify({ ciphertext, iv }));
    navigate("/menu");
  } else {
    const tx = db.transaction("passkey", "readonly");
    const store = tx.objectStore("passkey");
    const request = store.openCursor();

    request.onsuccess = async (e) => {
      const cursor = e.target.result;
      if (!cursor) return alert("Incorrect Passkey");

      try {
        const stored = cursor.value;
        const decrypted = await decryptData(key, stored.ciphertext, stored.iv);
        if (decrypted === input) {
          localStorage.setItem("Safe-notes", JSON.stringify({ ciphertext, iv }));
          navigate("/menu");
        } else {
          alert("Incorrect Passkey");
        }
      } catch {
        alert("Incorrect Passkey");
      }
    };
  }
};


  useEffect(() => {
    initializeDB(
      () => {
        console.log("DB initialized successfully");
        checkPasskey();
      },
      () => {
        alert("Failed to initialize database.");
      }
    );
  }, []);

  return (
    <div className="hero-section-wrapper">
      <div className="navbar">
        <h1>CipherLock</h1>
      </div>

      <div className="hero-section">
        <div className="hero-text">
          <h2>Secure Your Thoughts with CipherLock</h2>
          <p>
            Protect your privacy with encrypted notes, links, and password
            storage directly in your browser.
          </p>

          {showSection === "set" && (
            <div className="passkey-section">
              <h2>{isNewPasskey ? "Set Passkey" : "Enter Passkey"}</h2>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d*"
                value={input}
                onChange={onInputChange}
                placeholder="4-digit passkey"
              />
              <button disabled={valid} onClick={handleSetPasskey}>
                {isNewPasskey ? "Set" : "Unlock"}
              </button>
            </div>
          )}
        </div>

        <div className="hero-image">
          <img src="/lock-banner.png" alt="Secure illustration" />
        </div>
      </div>
    </div>
  );
};

export default Home;
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import LockImage from "../assets/lock-banner.png";

const home = () => {
  let db = window.data_base;
  const [input, setInput] = useState("");
  const [valid, setValid] = useState(true);
  const [showSection, setShowSection] = useState("loading");
  const [isNewPasskey, setIsNewPasskey] = useState(false);
  const navigate = useNavigate();

  const characters1 =
    "T7P36LlcJK9jRkmrn5yFpMbGa1SWidswzOhVI0DZt NxCHoYBQ8uUAv4eg2EXfq";
  const characters2 =
    "AL9n2TS57RaIJgx8uqdXvYezMCpU1syH0wcKGNWE ikQO4Zlhbm3jD6tPVFrofB";

  const generateString = (length) => {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters1.charAt(
        Math.floor(Math.random() * characters1.length)
      );
    }
    return result;
  };

  const encrypt = (input, chars) => {
    return [...input].map((char, i) => {
      const x = chars.indexOf(char);
      return x === -1 ? char : chars[(x + i) % chars.length];
    });
  };

  const dcrypt = (array, chars) => {
    return [...array].map((char, i) => {
      const x = chars.indexOf(char);
      return x === -1
        ? char
        : chars[(chars.length + x - (i % chars.length)) % chars.length];
    });
  };

  const onInputChange = (ev) => {
    setInput(ev.target.value);
    setValid(!(ev.target.value >= 1000 && ev.target.value <= 9999));
  };

  const checkPasskey = () => {
    const tx = db.transaction("passkey", "readonly");
    const store = tx.objectStore("passkey");

    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        setIsNewPasskey(true);
        setShowSection("set");
      } else {
        const localVal = localStorage.getItem("Safe-notes");
        if (!localVal) {
          setShowSection("set");
          return;
        }
        const localValue = dcrypt(localVal, characters2);
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) {
            setShowSection("set");
            return;
          }
          const stored = dcrypt(cursor.value.text, characters1);
          if (stored.join("") === localValue.join("")) {
            navigate("/menu");
          } else {
            setShowSection("set");
          }
        };
      }
    };
  };

  const handleSetPasskey = () => {
    if (isNewPasskey) {
      const tx = db.transaction("passkey", "readwrite");
      const store = tx.objectStore("passkey");
      store.clear();

      const encrypted1 = encrypt(input, characters1);
      const encrypted2 = encrypt(input, characters2);

      store.add({ id: generateString(10), text: encrypted1.join("") });
      localStorage.setItem("Safe-notes", encrypted2.join(""));
      navigate("/menu");
    } else {
      const tx = db.transaction("passkey", "readonly");
      const store = tx.objectStore("passkey");
      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          alert("Incorrect Passkey");
          return;
        }
        const stored = dcrypt(cursor.value.text, characters1);
        if (stored.join("") === input) {
          const encrypted2 = encrypt(input, characters2);
          localStorage.setItem("Safe-notes", encrypted2.join(""));
          navigate("/menu");
        } else {
          alert("Incorrect Passkey");
        }
      };
    }
  };

  useEffect(() => {
    const dbName = window.dbnewName || "SafeNotesDB";
    const dbVersion = window.dbVer || 1;

    const request = indexedDB.open("SafeNotesDB", 3);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("passkey")) {
        db.createObjectStore("passkey", { keyPath: "id" });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      window.data_base = db;
      checkPasskey();
    };

    request.onerror = (e) => {
      console.error("IndexedDB open error:", e.target.error);
      alert("Error opening IndexedDB: " + e.target.error.message);
    };
  }, []);

  return (
    <div className="hero-section-wrapper">
      {/* Navbar */}
      <div className="navbar">
        <h1>CipherLock</h1>
      </div>

      {/* Hero Section */}
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
          <img src={LockImage} alt="Secure illustration" />
        </div>
      </div>
    </div>
  );
};

export default home;

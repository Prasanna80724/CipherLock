import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import LockImage from "../assets/lock-banner.png";
import { initializeDB } from '../db';

const Home = () => {
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
      result += characters1.charAt(Math.floor(Math.random() * characters1.length));
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
    const db = window.data_base;
    if (!db) {
      console.error("Database not initialized yet.");
      return;
    }

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
    const db = window.data_base;
    if (!db) {
      alert("Database not ready");
      return;
    }

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
          <img src={LockImage} alt="Secure illustration" />
        </div>
      </div>
    </div>
  );
};

export default Home;

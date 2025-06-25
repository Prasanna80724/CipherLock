export function initializeDB(onSuccess, onError) {
  const request = indexedDB.open("SafeNotesDB", 3); // ✅ bump version!

  request.onupgradeneeded = (e) => {
    const db = e.target.result;

    if (!db.objectStoreNames.contains("notes")) {
      db.createObjectStore("notes", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("links")) {
      db.createObjectStore("links", { keyPath: "id" }); // ✅ ensure this exists
    }
    if (!db.objectStoreNames.contains("passwords")) {
      db.createObjectStore("passwords", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("passkey")) {
      db.createObjectStore("passkey", { keyPath: "id" });
    }
  };

  request.onsuccess = (e) => {
    window.data_base = e.target.result;
    if (onSuccess) onSuccess();
  };

  request.onerror = (e) => {
    console.error("DB open failed:", e);
    if (onError) onError();
  };
}

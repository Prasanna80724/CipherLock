// Session length in minutes
const SESSION_MINUTES = 30;
const KEY = 'cipherlock-session-expires';

// Start / renew a session
export function startSession() {
  const expiresAt = Date.now() + SESSION_MINUTES * 60_000;
  localStorage.setItem(KEY, String(expiresAt));
}

// True = still valid, False = expired / not set
export function sessionIsValid() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  return Date.now() < Number(raw);
}

// Force logout: clear token + redirect
export function endSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem('Safe-notes'); // your passkey
  window.location.replace('/');         // back to landing / login
}

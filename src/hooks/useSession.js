import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Session utilities
const SESSION_MINUTES = 30;
const SESSION_KEY = 'cipherlock-session-expires';
const AUTH_KEY = 'Safe-notes';

export function startSession() {
  const expiresAt = Date.now() + SESSION_MINUTES * 60_000;
  sessionStorage.setItem(SESSION_KEY, String(expiresAt));
}

export function sessionIsValid() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  return Date.now() < Number(raw);
}

export function isAuthenticated() {
  const sessionVal = sessionStorage.getItem(AUTH_KEY);
  return sessionVal && sessionVal !== "0" && sessionVal.length >= 4;
}

export function endSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  window.location.replace('/');
}

// Main hook
export default function useSession() {
  const navigate = useNavigate();
  const hasCheckedAuth = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Skip if already checked
    if (hasCheckedAuth.current) return;
    
    // Check authentication first
    if (!isAuthenticated()) {
      hasCheckedAuth.current = true;
      navigate("/", { replace: true });
      return;
    }

    // Check session validity
    if (!sessionIsValid()) {
      endSession();
      return;
    }

    hasCheckedAuth.current = true;

    // Start session timer
    startSession();

    // Periodic session check
    intervalRef.current = setInterval(() => {
      if (!sessionIsValid() || !isAuthenticated()) {
        endSession();
      }
    }, 60000); // Check every minute

    // Activity-based session renewal
    const renewSession = () => {
      if (isAuthenticated() && sessionIsValid()) {
        startSession();
      } else {
        endSession();
      }
    };

    // Session cleanup on page unload
    const handleUnload = () => {
      // Don't end session on regular page unload - only on inactivity timeout
      // This prevents losing session when refreshing or navigating
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, renewSession, { passive: true });
    });

    window.addEventListener('focus', renewSession);
    window.addEventListener('beforeunload', handleUnload);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, renewSession);
      });
      
      window.removeEventListener('focus', renewSession);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [navigate]);

  return {
    isAuthenticated: isAuthenticated(),
    isSessionValid: sessionIsValid(),
    endSession,
    startSession
  };
}
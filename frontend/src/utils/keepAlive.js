/**
 * keepAlive.js
 * Pings the backend every 14 minutes to prevent Render free-tier cold starts.
 * Import and call startKeepAlive() once at the app entry point (main.jsx).
 */
import { getApiBaseUrl } from "./config";

let intervalId = null;

export const startKeepAlive = () => {
  if (intervalId) return; // already running

  const ping = () => {
    fetch(`${getApiBaseUrl()}/api/teams`, { method: "HEAD" })
      .catch(() => {}); // silently ignore — fire & forget
  };

  ping(); // immediate ping on first load
  intervalId = setInterval(ping, 14 * 60 * 1000); // every 14 minutes
};

export const stopKeepAlive = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

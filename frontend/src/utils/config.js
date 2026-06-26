export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    if (window.location.port === "5173") {
      return "http://localhost:8080";
    }
  }
  let path = window.location.pathname;
  if (path.endsWith("/index.html") || path.endsWith("/index.php")) {
    path = path.substring(0, path.lastIndexOf("/"));
  }
  if (path.endsWith("/")) {
    path = path.substring(0, path.length - 1);
  }
  return window.location.origin + path;
};

export const getWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://localhost:8080";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
};


export const getFullUrl = (url) => {
  if (!url) return url;
  if (url.startsWith("http://localhost:8080")) {
    return url.replace("http://localhost:8080", getApiBaseUrl());
  }
  if (url.startsWith("/")) {
    return `${getApiBaseUrl()}${url}`;
  }
  return url;
};

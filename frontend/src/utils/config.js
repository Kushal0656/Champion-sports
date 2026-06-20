export const getApiBaseUrl = () => {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : window.location.origin;
};

export const getWsBaseUrl = () => {
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

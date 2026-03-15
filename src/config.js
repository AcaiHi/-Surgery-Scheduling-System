export const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : `http://${window.location.hostname}:8080`;

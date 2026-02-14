export const getApiBaseUrl = () => {
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      "http://localhost:8000"
    );
  }
  return "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();

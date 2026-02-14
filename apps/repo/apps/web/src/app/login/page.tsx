"use client";

import { useState } from "react";
import { api, authStore } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("runner@jogmania.com");
  const [password, setPassword] = useState("supersecret");
  const [status, setStatus] = useState<string | null>(null);

  const handleRegister = async () => {
    setStatus("Registering...");
    try {
      await api.register({ email, password });
      setStatus("Registered. You can log in now.");
    } catch (err) {
      setStatus(`Register failed: ${(err as Error).message}`);
    }
  };

  const handleLogin = async () => {
    setStatus("Logging in...");
    try {
      const token = await api.login({ email, password });
      authStore.setToken(token.access_token);
      setStatus("Logged in. Token stored.");
    } catch (err) {
      setStatus(`Login failed: ${(err as Error).message}`);
    }
  };

  return (
    <main className="arcade-panel p-8">
      <h2 className="text-2xl font-semibold">Login Console</h2>
      <p className="mt-2 text-white/70">
        Authenticate to unlock runs, quests, and exports.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm">
          Email
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Password
          <input
            type="password"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="arcade-button" onClick={handleLogin}>
          Login
        </button>
        <button
          className="rounded-lg border border-white/20 px-4 py-2"
          onClick={handleRegister}
        >
          Register
        </button>
      </div>

      {status && <p className="mt-4 text-sm text-arcade-cyan">{status}</p>}
    </main>
  );
}

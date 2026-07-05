"use client";

import { useState } from "react";

interface Props {
  onSave: (token: string) => Promise<void>;
}

export default function SetupScreen({ onSave }: Props) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(token.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect with that token");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="k-screen k-setup">
      <div className="k-setup-card">
        <h2>Kiosk Setup</h2>
        <p>
          This iPad isn&apos;t registered yet. Paste the device token from the admin
          panel (Kiosk Devices → Add Device) to activate it.
        </p>
        <input
          className="k-input"
          type="text"
          placeholder="ksk_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {error && <p className="k-error">{error}</p>}
        <button
          className="k-btn k-btn-primary k-btn-lg"
          onClick={handleSave}
          disabled={!token.trim() || saving}
        >
          {saving ? "Connecting…" : "Activate Kiosk"}
        </button>
      </div>
    </div>
  );
}

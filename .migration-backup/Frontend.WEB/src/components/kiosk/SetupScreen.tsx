"use client";

import { useState } from "react";

interface Props {
  onSave: (token: string) => Promise<void>;
}

export default function SetupScreen({ onSave }: Props) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Accepts either a raw token ("ksk_...") or a full setup link
  // ("https://.../kiosk?token=ksk_...") and extracts the token.
  const extractToken = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/ksk_[A-Za-z0-9]+/);
    if (match) return match[0];
    try {
      const url = new URL(trimmed);
      const fromUrl = url.searchParams.get("token");
      if (fromUrl) return fromUrl.trim();
    } catch {
      // not a URL — fall through and use the raw input
    }
    return trimmed;
  };

  const handleSave = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(extractToken(token));
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
          This iPad isn&apos;t registered yet. Paste the device token or the full
          setup link from the admin panel (Kiosk Devices → Add Device) to
          activate it.
        </p>
        <input
          className="k-input"
          type="text"
          placeholder="ksk_... or setup link"
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

"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";

function Logo() {
  return (
    <div className="w-14 h-14 rounded-full bg-brandOrange flex items-center justify-center mx-auto mb-4">
      <span className="text-navy font-medium text-lg">GF</span>
    </div>
  );
}

export function ResumeGate({ children }: { children: React.ReactNode }) {
  const { gate, startNew, unlockWithPassword, resumePermission, openFile } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wantPassword, setWantPassword] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (gate.kind === "checking") {
    return <p className="text-sm text-[#5f5e5a]">Checking for a saved file…</p>;
  }

  if (gate.kind === "unlocked") {
    return <>{children}</>;
  }

  const canBegin = confirmed && (!wantPassword || (pw1.length >= 8 && pw1 === pw2));

  const handleBegin = async () => {
    if (!canBegin) return;
    setBusy(true);
    await startNew(wantPassword ? pw1 : null);
    setBusy(false);
  };

  const handleUnlock = async () => {
    setBusy(true);
    await unlockWithPassword(pw);
    setBusy(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <Logo />
        <h1 className="text-xl font-medium text-navy">Before you begin</h1>
        <p className="text-xs text-[#5f5e5a] mt-1">GiftFlow™ by Academy of Life Planning</p>
      </div>

      {gate.kind === "needs_permission" && (
        <div className="card mb-3">
          <div className="text-sm font-medium mb-1">Continue where you left off</div>
          <div className="text-xs text-[#5f5e5a] mb-3">{gate.fileName}</div>
          <button onClick={() => resumePermission()} className="btn-primary w-full">
            Resume GiftFlow
          </button>
        </div>
      )}

      {gate.kind === "needs_password" && (
        <div className="card mb-3">
          <div className="text-sm font-medium mb-1">Enter your password</div>
          <div className="text-xs text-[#5f5e5a] mb-3">{gate.fileName}</div>
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            className="w-full mb-2"
          />
          {gate.error && <div className="text-xs text-red-700 mb-2">{gate.error}</div>}
          <button onClick={handleUnlock} disabled={busy} className="btn-primary w-full">
            {busy ? "Checking…" : "Unlock"}
          </button>
        </div>
      )}

      {gate.kind === "no_file" && (
        <>
          <div className="card mb-3 text-sm leading-relaxed">
            <p className="mb-3">
              GiftFlow helps you keep a clear, evidence-linked record of lifetime gifts, income and expenditure —
              tax year by tax year — so nothing needs reconstructing later. Before you start, please note:
            </p>
            <ul className="space-y-1.5 mb-3">
              <li className="flex items-start gap-2"><span className="text-green-700">✓</span> Your household data is stored on this device only</li>
              <li className="flex items-start gap-2"><span className="text-green-700">✓</span> No data is stored on AoLP servers</li>
              <li className="flex items-start gap-2"><span className="text-green-700">✓</span> You can start a new, empty file at any time</li>
            </ul>
            <div className="rounded-md p-3 mb-3" style={{ background: "#fdf6e3", border: "1px solid #f0e0a8" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "#8a6d1a" }}>Important — please read before continuing</div>
              <div className="text-xs" style={{ color: "#6b5417" }}>
                GiftFlow helps you organise information, understand your records and prepare evidence. It does{" "}
                <strong>not</strong> determine your tax liability or provide legal, tax or regulated financial
                advice. Tax treatment depends on individual circumstances and may change. Seek appropriately
                qualified professional advice where necessary.
              </div>
            </div>
            <div className="flex gap-4 text-xs mb-1">
              <a href="https://www.academyoflifeplanning.com/privacy" target="_blank" rel="noreferrer" className="underline text-navy">Privacy Notice →</a>
              <a href="https://www.academyoflifeplanning.com/disclaimer" target="_blank" rel="noreferrer" className="underline text-navy">Full Disclaimer →</a>
            </div>
          </div>

          <div className="card mb-3">
            <label className="flex items-start gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={wantPassword} onChange={(e) => setWantPassword(e.target.checked)} className="!w-auto mt-0.5" />
              <span>
                Secure this file with a password
                <div className="text-xs text-[#5f5e5a] font-normal mt-0.5">
                  Encrypts your household data on this device. Only you can access it. Optional — you can add
                  this later from within the app if you skip it now.
                </div>
              </span>
            </label>
            {wantPassword && (
              <div className="mt-3 space-y-2">
                <input type="password" placeholder="Choose a password" value={pw1} onChange={(e) => setPw1(e.target.value)} className="w-full" />
                <input type="password" placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full" />
                <div className="text-[11px] text-[#5f5e5a]">
                  At least 8 characters. There is no way to recover this password if it&apos;s lost.
                </div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-[#5f5e5a] mb-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="!w-auto mt-0.5" />
            I confirm I have read and understood the above, and acknowledge that GiftFlow does not provide
            regulated tax or legal advice.
          </label>

          <button onClick={handleBegin} disabled={!canBegin || busy} className="btn-primary w-full mb-3">
            {busy ? "Setting up…" : "Begin my record →"}
          </button>

          <div className="card">
            <div className="text-sm font-medium mb-3">Or open an existing file</div>
            <button onClick={() => fileInputRef.current?.click()} className="w-full">
              Choose a file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])}
            />
          </div>
        </>
      )}
    </div>
  );
}

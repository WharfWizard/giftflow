"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useView } from "@/lib/view";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/household", label: "Household" },
  { href: "/screening", label: "Estate screening" },
  { href: "/gifts", label: "Gifts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/income", label: "Income and expenditure" },
  { href: "/print", label: "Evidence pack" },
];

export function Header() {
  const { saveStatus, saveNow, gate, record, lock, protectedFile, addPasswordNow } = useStore();
  const { viewMode, setViewMode } = useView();
  const unlocked = gate.kind === "unlocked";
  const [showProtect, setShowProtect] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const submitProtect = async () => {
    if (pw1.length < 8) { alert("Choose a password of at least 8 characters."); return; }
    if (pw1 !== pw2) { alert("Passwords don't match."); return; }
    await addPasswordNow(pw1);
    setShowProtect(false);
    setPw1(""); setPw2("");
  };

  return (
    <header className="border-b border-[#e5e0d3] bg-white">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brandOrange flex items-center justify-center text-navy font-medium text-xs">
            GF
          </div>
          <span className="font-medium text-navy">GiftFlow</span>
        </div>

        {unlocked && (
          <nav className="hidden md:flex gap-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-sm text-navy hover:text-brandOrange">
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 text-xs">
          {unlocked && record.household.people.length > 0 && (
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="!text-xs !py-1">
              <option value="household">Household, combined</option>
              {record.household.people.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}&apos;s view</option>
              ))}
            </select>
          )}
          {unlocked && !protectedFile && (
            <button onClick={() => setShowProtect((v) => !v)} className="!py-1 !px-3">
              🔓 Add password
            </button>
          )}
          {unlocked && (
            <>
              <span className="text-[#5f5e5a]">
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Not saved yet"}
              </span>
              <button onClick={() => saveNow()} className="!py-1 !px-3">Save</button>
              {protectedFile && (
                <button onClick={() => lock()} className="!py-1 !px-3" title="Lock and require the password again">
                  Lock
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showProtect && (
        <div className="max-w-4xl mx-auto px-6 pb-3">
          <div className="card">
            <div className="text-sm font-medium mb-2">Add password protection</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="password" placeholder="Choose a password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
              <input type="password" placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowProtect(false)} className="flex-1">Cancel</button>
              <button onClick={submitProtect} className="btn-primary flex-1">Encrypt this file</button>
            </div>
          </div>
        </div>
      )}

      {unlocked && (
        <nav className="md:hidden flex gap-3 px-6 pb-2 overflow-x-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-xs text-navy whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

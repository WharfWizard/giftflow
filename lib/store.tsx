"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { GiftFlowRecord, emptyRecord, normalizeRecord } from "./types";
import {
  attemptResume,
  autosave,
  explicitSave,
  reacquirePermission,
  createNewFile,
  readFileAsText,
  parseOpenedFile,
  clearStoredHandle,
} from "./storage";
import { newEnvelopeAndKey, unlockEnvelope, encryptWithKey, EncryptedEnvelope } from "./crypto";

interface Vault {
  key: CryptoKey;
  salt: string;
}

type GateState =
  | { kind: "checking" }
  | { kind: "no_file" }
  | { kind: "needs_permission"; fileName: string }
  | { kind: "needs_password"; fileName: string; envelope: EncryptedEnvelope; error?: string }
  | { kind: "unlocked" };

interface StoreContextValue {
  record: GiftFlowRecord;
  update: (fn: (r: GiftFlowRecord) => GiftFlowRecord) => void;
  saveStatus: "idle" | "saving" | "saved";
  gate: GateState;
  protectedFile: boolean;
  startNew: (password: string | null) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  resumePermission: () => Promise<void>;
  openFile: (file: File) => Promise<void>;
  saveNow: () => Promise<void>;
  lock: () => void;
  addPasswordNow: (password: string) => Promise<void>;
  resetToWelcome: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<GiftFlowRecord>(() => emptyRecord());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [gate, setGate] = useState<GateState>({ kind: "checking" });
  const [protectedFile, setProtectedFile] = useState(false);
  const vaultRef = useRef<Vault | null>(null);
  const initialised = useRef(false);

  const enterUnlocked = useCallback((r: GiftFlowRecord, vault: Vault | null) => {
    vaultRef.current = vault;
    setProtectedFile(!!vault);
    setRecord(normalizeRecord(r));
    setGate({ kind: "unlocked" });
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    attemptResume().then((s) => {
      if (s.status === "no_file") setGate({ kind: "no_file" });
      else if (s.status === "needs_permission") setGate({ kind: "needs_permission", fileName: s.fileName });
      else if (s.status === "needs_password") setGate({ kind: "needs_password", fileName: s.fileName, envelope: s.envelope });
      else enterUnlocked(s.record, null); // ready_plain — no password needed, load straight in
    });
  }, [enterUnlocked]);

  const persist = useCallback((next: GiftFlowRecord, immediate: boolean) => {
    setSaveStatus("saving");
    const vault = vaultRef.current;
    const write = (payload: unknown) => {
      if (immediate) explicitSave(payload).then(() => setSaveStatus("saved"));
      else autosave(payload, () => setSaveStatus("saved"));
    };
    if (vault) {
      encryptWithKey(next, vault.key, vault.salt).then(write);
    } else {
      write(next);
    }
  }, []);

  const update = useCallback(
    (fn: (r: GiftFlowRecord) => GiftFlowRecord) => {
      setRecord((prev) => {
        const next = fn(prev);
        next.lastModified = new Date().toISOString();
        persist(next, false);
        return next;
      });
    },
    [persist]
  );

  const startNew = useCallback(
    async (password: string | null) => {
      const fresh = emptyRecord();
      if (password) {
        const { envelope, key, salt } = await newEnvelopeAndKey(fresh, password);
        await createNewFile(envelope);
        enterUnlocked(fresh, { key, salt });
      } else {
        await createNewFile(fresh);
        enterUnlocked(fresh, null);
      }
    },
    [enterUnlocked]
  );

  const unlockWithPassword = useCallback(
    async (password: string) => {
      if (gate.kind !== "needs_password") return;
      const result = await unlockEnvelope<GiftFlowRecord>(gate.envelope, password);
      if (!result) {
        setGate({ ...gate, error: "That password doesn't match this file." });
        return;
      }
      enterUnlocked(result.data, { key: result.key, salt: result.salt });
    },
    [gate, enterUnlocked]
  );

  const resumePermission = useCallback(async () => {
    const s = await reacquirePermission();
    if (s.status === "no_file") setGate({ kind: "no_file" });
    else if (s.status === "needs_permission") setGate({ kind: "needs_permission", fileName: s.fileName });
    else if (s.status === "needs_password") setGate({ kind: "needs_password", fileName: s.fileName, envelope: s.envelope });
    else enterUnlocked(s.record, null);
  }, [enterUnlocked]);

  const openFile = useCallback(
    async (file: File) => {
      const text = await readFileAsText(file);
      const parsed = parseOpenedFile(text);
      if (parsed.kind === "envelope") {
        setGate({ kind: "needs_password", fileName: file.name, envelope: parsed.envelope });
      } else if (parsed.kind === "plain") {
        enterUnlocked(parsed.record, null);
      } else {
        alert("This doesn't look like a GiftFlow file.");
      }
    },
    [enterUnlocked]
  );

  const saveNow = useCallback(async () => {
    persist(record, true);
  }, [record, persist]);

  const lock = useCallback(() => {
    vaultRef.current = null;
    setRecord(emptyRecord());
    setProtectedFile(false);
    setGate({ kind: "checking" });
    attemptResume().then((s) => {
      if (s.status === "no_file") setGate({ kind: "no_file" });
      else if (s.status === "needs_permission") setGate({ kind: "needs_permission", fileName: s.fileName });
      else if (s.status === "needs_password") setGate({ kind: "needs_password", fileName: s.fileName, envelope: s.envelope });
      else enterUnlocked(s.record, null);
    });
  }, [enterUnlocked]);

  const addPasswordNow = useCallback(
    async (password: string) => {
      const { key, salt } = await newEnvelopeAndKey(record, password);
      vaultRef.current = { key, salt };
      setProtectedFile(true);
      persist(record, true);
    },
    [record, persist]
  );

  const resetToWelcome = useCallback(async () => {
    await clearStoredHandle();
    vaultRef.current = null;
    setRecord(emptyRecord());
    setProtectedFile(false);
    setGate({ kind: "no_file" });
  }, []);

  return (
    <StoreContext.Provider
      value={{ record, update, saveStatus, gate, protectedFile, startNew, unlockWithPassword, resumePermission, openFile, saveNow, lock, addPasswordNow, resetToWelcome }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

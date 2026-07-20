"use client";

// Local-first persistence. See GiftFlow_Specification_v2.md section 8.
// Password protection is optional (see ResumeGate) — this layer just
// persists whatever payload it's given, encrypted envelope or plain
// record, without caring which.

import { GiftFlowRecord } from "./types";
import { EncryptedEnvelope, isEncryptedEnvelope } from "./crypto";

const DB_NAME = "giftflow-handles";
const STORE_NAME = "handles";
const HANDLE_KEY = "current-file";

type FSFileHandle = FileSystemFileHandle;

function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeHandle(handle: FSFileHandle): Promise<void> {
  const db = await openHandleDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStoredHandle(): Promise<FSFileHandle | null> {
  try {
    const db = await openHandleDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// Forgets the connected file entirely, distinct from locking. Locking
// re-prompts for the same file's password; this clears the handle so the
// welcome screen offers a genuine fresh start — a new household, or
// opening a different file. Nothing on disk is touched or deleted.
export async function clearStoredHandle(): Promise<void> {
  try {
    const db = await openHandleDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Nothing to clear — fine.
  }
}

export type ResumeState =
  | { status: "no_file" }
  | { status: "needs_permission"; fileName: string }
  | { status: "needs_password"; fileName: string; envelope: EncryptedEnvelope }
  | { status: "ready_plain"; fileName: string; record: GiftFlowRecord };

function tryParse(text: string): { envelope: EncryptedEnvelope } | { plainRecord: GiftFlowRecord } | null {
  try {
    const parsed = JSON.parse(text);
    if (isEncryptedEnvelope(parsed)) return { envelope: parsed };
    if (parsed && parsed.formatVersion === 1 && parsed.household) return { plainRecord: parsed as GiftFlowRecord };
    return null;
  } catch {
    return null;
  }
}

function resumeStateFromParsed(fileName: string, parsed: ReturnType<typeof tryParse>): ResumeState {
  if (!parsed) return { status: "no_file" };
  if ("envelope" in parsed) return { status: "needs_password", fileName, envelope: parsed.envelope };
  return { status: "ready_plain", fileName, record: parsed.plainRecord };
}

export async function attemptResume(): Promise<ResumeState> {
  if (!hasFileSystemAccess()) return { status: "no_file" };
  const handle = await getStoredHandle();
  if (!handle) return { status: "no_file" };
  try {
    const permission = await (handle as any).queryPermission({ mode: "readwrite" });
    if (permission !== "granted") return { status: "needs_permission", fileName: handle.name };
    const file = await handle.getFile();
    const text = await file.text();
    return resumeStateFromParsed(handle.name, tryParse(text));
  } catch {
    return { status: "no_file" };
  }
}

export async function reacquirePermission(): Promise<ResumeState> {
  const handle = await getStoredHandle();
  if (!handle) return { status: "no_file" };
  try {
    const permission = await (handle as any).requestPermission({ mode: "readwrite" });
    if (permission !== "granted") return { status: "needs_permission", fileName: handle.name };
    const file = await handle.getFile();
    const text = await file.text();
    return resumeStateFromParsed(handle.name, tryParse(text));
  } catch {
    return { status: "no_file" };
  }
}

export async function createNewFile(payload: unknown): Promise<boolean> {
  if (!hasFileSystemAccess()) return false;
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: "giftflow-household.json",
      types: [{ description: "GiftFlow record", accept: { "application/json": [".json"] } }],
    });
    await storeHandle(handle);
    await writeToHandle(handle, payload);
    return true;
  } catch {
    return false;
  }
}

async function writeToHandle(handle: FSFileHandle, payload: unknown): Promise<void> {
  const writable = await (handle as any).createWritable();
  await writable.write(JSON.stringify(payload));
  await writable.close();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function autosave(payload: unknown, onSaved?: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const handle = await getStoredHandle();
    if (handle) {
      try {
        await writeToHandle(handle, payload);
        onSaved?.();
      } catch {
        // Permission likely lapsed; user will be prompted next explicit Save.
      }
    }
  }, 1500);
}

export async function explicitSave(payload: unknown): Promise<boolean> {
  if (debounceTimer) clearTimeout(debounceTimer);
  const handle = await getStoredHandle();
  if (handle) {
    try {
      await writeToHandle(handle, payload);
      return true;
    } catch {
      downloadPayload(payload);
      return true;
    }
  }
  downloadPayload(payload);
  return true;
}

export function downloadPayload(payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "giftflow-household.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function parseOpenedFile(
  text: string
): { kind: "envelope"; envelope: EncryptedEnvelope } | { kind: "plain"; record: GiftFlowRecord } | { kind: "invalid" } {
  const parsed = tryParse(text);
  if (!parsed) return { kind: "invalid" };
  if ("envelope" in parsed) return { kind: "envelope", envelope: parsed.envelope };
  return { kind: "plain", record: parsed.plainRecord };
}

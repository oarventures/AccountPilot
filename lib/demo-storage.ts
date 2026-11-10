import type { Demo } from "./strategy";
const DB = "accountpilot-local-demo";
const STORE = "workspace";
const LEGACY = "accountpilot.demo.v1";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Browser storage unavailable."));
    request.onblocked = () =>
      reject(new Error("Close older AccountPilot tabs and retry."));
  });
}
export async function loadDemo(): Promise<unknown | null> {
  const db = await openDatabase();
  try {
    const saved = await new Promise<unknown>((resolve, reject) => {
      const request = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .get("current");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    if (saved !== null) return saved;
    const old = localStorage.getItem(LEGACY);
    return old ? JSON.parse(old) : null;
  } finally {
    db.close();
  }
}
let pending: Promise<void> = Promise.resolve();
export function storeDemo(data: Demo): Promise<void> {
  const task = pending.catch(() => {}).then(() => writeDemo(data));
  pending = task;
  return task;
}
async function writeDemo(data: Demo): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(data, "current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("Browser save was interrupted."));
    });
  } finally {
    db.close();
  }
}

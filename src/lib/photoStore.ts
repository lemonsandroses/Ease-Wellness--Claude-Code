/**
 * Meal photos held on the device.
 *
 * Uploading needs an account, but taking the photo does not, and a photo that
 * disappears the moment you tap Save is worse than no photo button at all —
 * especially when the sheet promises "this one stays on the device". It now
 * does: the downscaled JPEG is written here, keyed by meal id, and uploaded
 * the first time a session exists.
 *
 * IndexedDB rather than localStorage: these are 100-300KB binaries, and
 * localStorage would mean base64 (a third bigger again) inside a ~5MB quota
 * shared with every other key the app owns.
 */

const DB_NAME = "ease-photos";
const DB_VERSION = 1;
const STORE = "pending";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Every call is wrapped: IndexedDB is unavailable in private mode on some
 * browsers and can throw on quota. A photo that cannot be cached must never
 * take the meal down with it — the macros are the part that matters.
 */
async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  try {
    const db = await open();
    return await new Promise<T>((resolve) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(fallback);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return fallback;
  }
}

export function putPhoto(mealId: string, blob: Blob): Promise<unknown> {
  return withStore("readwrite", (s) => s.put(blob, mealId), null);
}

export function getPhoto(mealId: string): Promise<Blob | null> {
  return withStore<Blob | null>("readonly", (s) => s.get(mealId), null);
}

export function dropPhoto(mealId: string): Promise<unknown> {
  return withStore("readwrite", (s) => s.delete(mealId), null);
}

export function pendingIds(): Promise<string[]> {
  return withStore<string[]>("readonly", (s) => s.getAllKeys(), []).then((keys) =>
    (keys as unknown[]).filter((k): k is string => typeof k === "string"),
  );
}

/** Wipe everything. Called from the erase-my-data path, which must leave
 *  nothing behind — photographs of someone's meals included. */
export async function clearPhotos(): Promise<void> {
  await withStore("readwrite", (s) => s.clear(), null);
}

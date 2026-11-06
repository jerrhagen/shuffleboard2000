// All lagring ligger här: spelarna i IndexedDB på den här enheten, valen i localStorage.
// Ska spelarna delas mellan telefoner är det den här modulen som byts ut.

export interface Player {
  id: string;
  name: string;
  /** JPEG som data-URL, null om spelaren saknar foto. */
  photo: string | null;
  active: boolean;
  createdAt: number;
}

const DB = 'shuffleboard2000';
const STORE = 'players';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadPlayers(): Promise<Player[]> {
  const players = await run<Player[]>('readonly', (store) => store.getAll());
  return players.sort((a, b) => a.createdAt - b.createdAt);
}

export function savePlayer(player: Player): Promise<IDBValidKey> {
  return run('readwrite', (store) => store.put(player));
}

export function deletePlayer(id: string): Promise<undefined> {
  return run('readwrite', (store) => store.delete(id));
}

export function readSetting(key: string, fallback: string): string {
  try {
    return localStorage.getItem(`sb2000.${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(`sb2000.${key}`, value);
  } catch {
    // Valet gäller bara den här gången om lagringen är avstängd.
  }
}

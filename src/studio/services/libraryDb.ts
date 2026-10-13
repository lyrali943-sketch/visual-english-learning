/**
 * Local poster library (IndexedDB).
 *
 * Posters live on this device only — they are never uploaded anywhere and do
 * not sync between devices. Photos are stored as JPEG data URLs inside the
 * record; IndexedDB (unlike localStorage) can comfortably hold several MB.
 */

import type { LibraryRecord, Poster } from '../types/poster'

const DB_NAME = 'visual-english-studio'
const DB_VERSION = 1
const STORE_POSTERS = 'posters'

let dbPromise: Promise<IDBDatabase> | null = null

function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (!isStorageAvailable()) {
    return Promise.reject(new Error('This browser does not support local storage (IndexedDB).'))
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_POSTERS)) {
          const store = db.createObjectStore(STORE_POSTERS, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('The local library could not be opened.'))
    })
  }
  return dbPromise
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_POSTERS, mode)
        const request = action(tx.objectStore(STORE_POSTERS))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(new Error('The local library request failed.'))
      }),
  )
}

export async function listLibraryRecords(): Promise<LibraryRecord[]> {
  const records = await runTransaction<LibraryRecord[]>('readonly', (store) => store.getAll())
  return records.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getLibraryRecord(id: string): Promise<LibraryRecord | null> {
  const record = await runTransaction<LibraryRecord | undefined>('readonly', (store) => store.get(id))
  return record ?? null
}

export async function savePosterToLibrary(poster: Poster, thumbnailDataUrl: string): Promise<LibraryRecord> {
  const record: LibraryRecord = {
    id: poster.id,
    title: poster.content.title,
    subtitle: poster.content.subtitle,
    theme: poster.theme,
    mode: poster.mode,
    difficulty: poster.difficulty,
    source: poster.source,
    createdAt: poster.createdAt,
    updatedAt: poster.updatedAt,
    thumbnailDataUrl,
    poster,
  }
  await runTransaction('readwrite', (store) => store.put(record))
  return record
}

export async function deleteLibraryRecord(id: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(id))
}

export async function clearLibrary(): Promise<void> {
  await runTransaction('readwrite', (store) => store.clear())
}

export interface StorageEstimate {
  usageBytes: number
  quotaBytes: number
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const estimate = await navigator.storage.estimate()
    if (typeof estimate.usage !== 'number' || typeof estimate.quota !== 'number') return null
    return { usageBytes: estimate.usage, quotaBytes: estimate.quota }
  } catch {
    return null
  }
}

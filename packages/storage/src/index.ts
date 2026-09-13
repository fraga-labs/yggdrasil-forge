// ── INICIO: @yggdrasil-forge/storage ──
// Storage backends for Yggdrasil Forge.
// 3.1 — interface StorageAdapter movida a @common en hardening-1 (DT-21).
// Implementacións concretas permanecen aquí.

export { MemoryStorage } from './MemoryStorage.js'
export { LocalStorageAdapter } from './LocalStorageAdapter.js'
export type { LocalStorageAdapterOptions } from './LocalStorageAdapter.js'
export { IndexedDBAdapter } from './IndexedDBAdapter.js'
export type { IndexedDBAdapterOptions } from './IndexedDBAdapter.js'
export { SessionStorageAdapter } from './SessionStorageAdapter.js'
export type { SessionStorageAdapterOptions } from './SessionStorageAdapter.js'
export { FileSystemAdapter } from './FileSystemAdapter.js'
export type { FileSystemAdapterOptions } from './FileSystemAdapter.js'
export { ScopedStorage } from './ScopedStorage.js'

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.1.2'
// ── FIN: @yggdrasil-forge/storage ──

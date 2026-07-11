"use client";

// All per-user state (progress, bookmarks, reader settings) lives in
// localStorage — the app has no backend or database by design.

export interface Progress {
  chapter: number;
  block: number;
  /** 0..1 across the whole book */
  percent: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  chapter: number;
  block: number;
  chapterTitle: string;
  snippet: string;
  createdAt: number;
}

export interface ReaderSettings {
  fontSize: number; // px
  theme: "light" | "sepia" | "dark";
}

const PREFIX = "bookstore:";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or blocked; reading still works without persistence
  }
}

export function getProgress(bookId: string): Progress | null {
  return read<Progress>(`progress:${bookId}`);
}

export function saveProgress(bookId: string, progress: Progress): void {
  write(`progress:${bookId}`, progress);
}

export function getBookmarks(bookId: string): Bookmark[] {
  return read<Bookmark[]>(`bookmarks:${bookId}`) ?? [];
}

export function saveBookmarks(bookId: string, bookmarks: Bookmark[]): void {
  write(`bookmarks:${bookId}`, bookmarks);
}

export function getSettings(): ReaderSettings {
  return read<ReaderSettings>("settings") ?? { fontSize: 18, theme: "light" };
}

export function saveSettings(settings: ReaderSettings): void {
  write("settings", settings);
}

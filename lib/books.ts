import fs from "fs";
import path from "path";
import { parseMarkdown, Block } from "./markdown";

export interface ChapterRef {
  id?: string;
  chapter_number?: number;
  title: string;
  file: string;
}

export interface BookManifest {
  id?: string;
  title: string;
  author?: string;
  author_note?: string;
  description?: string;
  synopsis?: string;
  language?: string;
  chapters: ChapterRef[];
}

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  description: string;
  chapterCount: number;
}

export interface ChapterContent {
  id: string;
  title: string;
  blocks: Block[];
}

export interface BookData {
  id: string;
  title: string;
  author: string;
  description: string;
  chapters: ChapterContent[];
}

const BOOKS_DIR = path.join(process.cwd(), "Books");

function readManifest(bookDir: string): BookManifest | null {
  const manifestPath = path.join(BOOKS_DIR, bookDir, "book.json");
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as BookManifest;
    if (!manifest.title || !Array.isArray(manifest.chapters)) {
      console.warn(`Skipping ${bookDir}: manifest missing required fields`);
      return null;
    }
    // Some manifests use a slightly different schema (e.g. no top-level id/author,
    // chapters keyed by chapter_number instead of id) — normalize with fallbacks
    // instead of rejecting the whole book.
    manifest.id = manifest.id ?? bookDir;
    manifest.author = manifest.author ?? manifest.author_note ?? "";
    manifest.description = manifest.description ?? manifest.synopsis ?? "";
    manifest.chapters = manifest.chapters.map((ch, i) => ({
      ...ch,
      id: ch.id ?? String(ch.chapter_number ?? i + 1).padStart(2, "0"),
    }));
    return manifest;
  } catch (err) {
    console.warn(`Skipping ${bookDir}: cannot read manifest (${err})`);
    return null;
  }
}

export function getAllBooks(): BookSummary[] {
  if (!fs.existsSync(BOOKS_DIR)) return [];
  return fs
    .readdirSync(BOOKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readManifest(entry.name))
    .filter((m): m is BookManifest => m !== null)
    .map((m) => ({
      id: m.id!,
      title: m.title,
      author: m.author!,
      description: m.description!,
      chapterCount: m.chapters.length,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getBook(id: string): BookData | null {
  // ids come from the URL; keep reads inside the Books directory
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const manifest = readManifest(id);
  if (!manifest) return null;

  const chapters: ChapterContent[] = [];
  for (const ref of manifest.chapters) {
    const filePath = path.join(BOOKS_DIR, id, ref.file);
    if (!filePath.startsWith(path.join(BOOKS_DIR, id))) continue;
    let markdown: string;
    try {
      markdown = fs.readFileSync(filePath, "utf8");
    } catch {
      console.warn(`Book ${id}: missing chapter file ${ref.file}`);
      continue;
    }
    chapters.push({ id: ref.id!, title: ref.title, blocks: parseMarkdown(markdown) });
  }

  return {
    id: manifest.id!,
    title: manifest.title,
    author: manifest.author!,
    description: manifest.description!,
    chapters,
  };
}

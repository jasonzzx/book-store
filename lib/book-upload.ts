import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import type { BookManifest } from "./books";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface UploadedBook {
  id: string;
  title: string;
  files: Map<string, string>;
}

function safeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return (
    normalized === value &&
    !normalized.startsWith("/") &&
    !normalized.split("/").includes("..") &&
    normalized.length > 0
  );
}

export async function readBookZip(file: File): Promise<UploadedBook> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("The ZIP is larger than the 20 MB upload limit.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("That file is not a valid ZIP archive.");
  }

  const paths = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const manifests = paths.filter((name) => name === "book.json" || name.endsWith("/book.json"));
  if (manifests.length !== 1) {
    throw new Error("The ZIP must contain exactly one book.json file.");
  }

  const manifestPath = manifests[0];
  const root = manifestPath.slice(0, -"book.json".length);
  let manifest: BookManifest;
  try {
    manifest = JSON.parse(await zip.file(manifestPath)!.async("string")) as BookManifest;
  } catch {
    throw new Error("book.json is not valid JSON.");
  }

  if (!manifest.id || !ID_PATTERN.test(manifest.id)) {
    throw new Error("book.json id must use lowercase letters, numbers, and single hyphens.");
  }
  if (!manifest.title?.trim()) throw new Error("book.json must include a title.");
  if (!Array.isArray(manifest.chapters) || manifest.chapters.length === 0) {
    throw new Error("book.json must include at least one chapter.");
  }

  const files = new Map<string, string>();
  files.set("book.json", JSON.stringify(manifest, null, 2) + "\n");
  for (const chapter of manifest.chapters) {
    if (!chapter.title?.trim() || !safeRelativePath(chapter.file) || !chapter.file.endsWith(".md")) {
      throw new Error("Every chapter needs a title and a safe .md file path.");
    }
    const entry = zip.file(root + chapter.file);
    if (!entry) throw new Error(`Missing chapter file: ${chapter.file}`);
    files.set(chapter.file, await entry.async("string"));
  }

  return { id: manifest.id, title: manifest.title.trim(), files };
}

export async function saveBookLocally(book: UploadedBook): Promise<void> {
  const booksDir = path.join(process.cwd(), "Books");
  const destination = path.join(booksDir, book.id);
  try {
    await fs.access(destination);
    throw new Error(`A book with the id “${book.id}” already exists.`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      // Expected: this is a new book.
    } else {
      throw error;
    }
  }

  await fs.mkdir(destination, { recursive: false });
  try {
    for (const [relativePath, content] of book.files) {
      const target = path.join(destination, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
}

async function githubRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com${url}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub rejected the upload (${response.status}): ${detail.slice(0, 180)}`);
  }
  return response.json() as Promise<T>;
}

export async function saveBookToGitHub(book: UploadedBook): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error("GitHub upload is not configured on this deployment.");
  }

  const encodedBookPath = `Books/${encodeURIComponent(book.id)}/book.json`;
  const existing = await fetch(`https://api.github.com/repos/${repository}/contents/${encodedBookPath}?ref=${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (existing.ok) throw new Error(`A book with the id “${book.id}” already exists.`);
  if (existing.status !== 404) throw new Error(`Could not check the repository (${existing.status}).`);

  const ref = await githubRequest<{ object: { sha: string } }>(
    `/repos/${repository}/git/ref/heads/${encodeURIComponent(branch)}`,
    token,
  );
  const commit = await githubRequest<{ tree: { sha: string } }>(
    `/repos/${repository}/git/commits/${ref.object.sha}`,
    token,
  );
  const tree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];
  for (const [relativePath, content] of book.files) {
    const blob = await githubRequest<{ sha: string }>(`/repos/${repository}/git/blobs`, token, {
      method: "POST",
      body: JSON.stringify({ content, encoding: "utf-8" }),
    });
    tree.push({ path: `Books/${book.id}/${relativePath}`, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await githubRequest<{ sha: string }>(`/repos/${repository}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
  });
  const newCommit = await githubRequest<{ sha: string }>(`/repos/${repository}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: `Add ${book.title}`,
      tree: newTree.sha,
      parents: [ref.object.sha],
    }),
  });
  await githubRequest(`/repos/${repository}/git/refs/heads/${encodeURIComponent(branch)}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
}

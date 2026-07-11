"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BookData } from "@/lib/books";
import {
  Bookmark,
  getBookmarks,
  getProgress,
  getSettings,
  saveBookmarks,
  saveProgress,
  saveSettings,
} from "@/lib/storage";

type Panel = "none" | "chapters" | "bookmarks" | "search" | "settings";

interface SearchHit {
  chapter: number;
  block: number;
  chapterTitle: string;
  snippet: string;
}

export default function Reader({ book }: { book: BookData }) {
  const [chapter, setChapter] = useState(0);
  const [panel, setPanel] = useState<Panel>("none");
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("light");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [percent, setPercent] = useState(0);
  const [query, setQuery] = useState("");
  const [restored, setRestored] = useState(false);

  const topBlockRef = useRef(0);
  const pendingBlockRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const blocks = book.chapters[chapter].blocks;

  // ---- restore settings, bookmarks, and reading position on mount ----
  useEffect(() => {
    const settings = getSettings();
    setFontSize(settings.fontSize);
    setTheme(settings.theme);
    setBookmarks(getBookmarks(book.id));
    const progress = getProgress(book.id);
    if (progress && progress.chapter < book.chapters.length) {
      pendingBlockRef.current = progress.block;
      setChapter(progress.chapter);
      setPercent(progress.percent);
    }
    setRestored(true);
  }, [book.id, book.chapters.length]);

  // ---- theme applies to the whole page background ----
  useEffect(() => {
    document.body.dataset.readerTheme = theme;
    return () => {
      delete document.body.dataset.readerTheme;
    };
  }, [theme]);

  // ---- after a chapter renders, jump to the pending block if any ----
  useEffect(() => {
    if (!restored) return;
    const target = pendingBlockRef.current;
    pendingBlockRef.current = null;
    if (target && target > 0) {
      requestAnimationFrame(() => {
        document.getElementById(`blk-${target}`)?.scrollIntoView();
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [chapter, restored]);

  // ---- track the topmost visible block and persist progress ----
  const persist = useCallback(
    (chapterIdx: number, blockIdx: number) => {
      const count = book.chapters[chapterIdx].blocks.length;
      const doc = document.documentElement;
      const atEnd =
        chapterIdx === book.chapters.length - 1 &&
        window.scrollY + window.innerHeight >= doc.scrollHeight - 8;
      const pct = atEnd
        ? 1
        : Math.min(1, (chapterIdx + blockIdx / Math.max(1, count)) / book.chapters.length);
      setPercent(pct);
      saveProgress(book.id, {
        chapter: chapterIdx,
        block: blockIdx,
        percent: pct,
        updatedAt: Date.now(),
      });
    },
    [book]
  );

  useEffect(() => {
    if (!restored) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const container = contentRef.current;
        if (!container) return;
        const children = container.children;
        let top = 0;
        for (let i = 0; i < children.length; i++) {
          const rect = children[i].getBoundingClientRect();
          if (rect.bottom > 72) {
            top = i;
            break;
          }
        }
        topBlockRef.current = top;
        persist(chapter, top);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapter, restored, persist]);

  // ---- actions ----
  const goToChapter = (c: number, block: number | null = null) => {
    pendingBlockRef.current = block;
    topBlockRef.current = block ?? 0;
    setPanel("none");
    if (c === chapter) {
      const target = block ?? 0;
      if (target > 0) document.getElementById(`blk-${target}`)?.scrollIntoView();
      else window.scrollTo(0, 0);
      persist(c, target);
    } else {
      setChapter(c);
      persist(c, block ?? 0);
    }
  };

  const updateSettings = (size: number, th: typeof theme) => {
    setFontSize(size);
    setTheme(th);
    saveSettings({ fontSize: size, theme: th });
  };

  const currentBlockBookmarked = bookmarks.some(
    (b) => b.chapter === chapter && b.block === topBlockRef.current
  );

  const toggleBookmark = () => {
    const blockIdx = topBlockRef.current;
    let next: Bookmark[];
    if (currentBlockBookmarked) {
      next = bookmarks.filter((b) => !(b.chapter === chapter && b.block === blockIdx));
    } else {
      const text = blocks[blockIdx]?.text ?? "";
      next = [
        ...bookmarks,
        {
          id: `${Date.now()}`,
          chapter,
          block: blockIdx,
          chapterTitle: book.chapters[chapter].title,
          snippet: text.slice(0, 120) || "(start of chapter)",
          createdAt: Date.now(),
        },
      ];
    }
    setBookmarks(next);
    saveBookmarks(book.id, next);
  };

  const removeBookmark = (id: string) => {
    const next = bookmarks.filter((b) => b.id !== id);
    setBookmarks(next);
    saveBookmarks(book.id, next);
  };

  // ---- in-book search ----
  const hits: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: SearchHit[] = [];
    outer: for (let c = 0; c < book.chapters.length; c++) {
      const ch = book.chapters[c];
      for (let b = 0; b < ch.blocks.length; b++) {
        const text = ch.blocks[b].text;
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) continue;
        const start = Math.max(0, idx - 40);
        results.push({
          chapter: c,
          block: b,
          chapterTitle: ch.title,
          snippet: (start > 0 ? "…" : "") + text.slice(start, idx + q.length + 60),
        });
        if (results.length >= 50) break outer;
      }
    }
    return results;
  }, [query, book]);

  const togglePanel = (p: Panel) => setPanel(panel === p ? "none" : p);

  return (
    <div className={`reader theme-${theme}`}>
      <header className="reader-bar reader-top">
        <Link href="/" className="bar-btn" aria-label="Back to shelf">
          ‹ Shelf
        </Link>
        <div className="reader-book-title">{book.title}</div>
        <div className="bar-group">
          <button className="bar-btn" onClick={() => togglePanel("chapters")} aria-label="Chapters">
            ☰
          </button>
          <button className="bar-btn" onClick={() => togglePanel("search")} aria-label="Search">
            ⌕
          </button>
          <button
            className={`bar-btn ${currentBlockBookmarked ? "active" : ""}`}
            onClick={toggleBookmark}
            aria-label="Toggle bookmark"
          >
            {currentBlockBookmarked ? "★" : "☆"}
          </button>
          <button className="bar-btn" onClick={() => togglePanel("bookmarks")} aria-label="Bookmarks">
            ≡★
          </button>
          <button className="bar-btn" onClick={() => togglePanel("settings")} aria-label="Reader settings">
            Aa
          </button>
        </div>
      </header>

      <main className="reader-content" style={{ fontSize: `${fontSize}px` }} ref={contentRef}>
        {blocks.map((block, i) => (
          <div
            key={i}
            id={`blk-${i}`}
            className="reader-block"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        ))}
      </main>

      <footer className="reader-bar reader-bottom">
        <button
          className="bar-btn"
          disabled={chapter === 0}
          onClick={() => goToChapter(chapter - 1)}
        >
          ‹ Prev
        </button>
        <div className="reader-progress-label">
          {book.chapters[chapter].title} · {Math.round(percent * 100)}%
        </div>
        <button
          className="bar-btn"
          disabled={chapter === book.chapters.length - 1}
          onClick={() => goToChapter(chapter + 1)}
        >
          Next ›
        </button>
      </footer>

      {panel !== "none" && <div className="panel-backdrop" onClick={() => setPanel("none")} />}

      {panel === "chapters" && (
        <div className="panel">
          <div className="panel-title">Chapters</div>
          {book.chapters.map((ch, i) => (
            <button
              key={ch.id}
              className={`panel-row ${i === chapter ? "active" : ""}`}
              onClick={() => goToChapter(i)}
            >
              <span className="panel-row-num">{i + 1}</span> {ch.title}
            </button>
          ))}
        </div>
      )}

      {panel === "bookmarks" && (
        <div className="panel">
          <div className="panel-title">Bookmarks</div>
          {bookmarks.length === 0 && (
            <div className="panel-empty">
              No bookmarks yet. Tap ☆ in the top bar to bookmark the passage you are reading.
            </div>
          )}
          {[...bookmarks]
            .sort((a, b) => a.chapter - b.chapter || a.block - b.block)
            .map((bm) => (
              <div key={bm.id} className="panel-row bookmark-row">
                <button className="bookmark-body" onClick={() => goToChapter(bm.chapter, bm.block)}>
                  <div className="bookmark-chapter">{bm.chapterTitle}</div>
                  <div className="bookmark-snippet">{bm.snippet}</div>
                </button>
                <button
                  className="bar-btn"
                  onClick={() => removeBookmark(bm.id)}
                  aria-label="Remove bookmark"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      )}

      {panel === "search" && (
        <div className="panel">
          <div className="panel-title">Search in book</div>
          <input
            className="search-input"
            type="search"
            placeholder="Type at least 2 characters…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim().length >= 2 && (
            <div className="panel-empty">
              {hits.length === 0 ? "No matches." : `${hits.length}${hits.length >= 50 ? "+" : ""} match${hits.length === 1 ? "" : "es"}`}
            </div>
          )}
          {hits.map((hit, i) => (
            <button
              key={i}
              className="panel-row search-hit"
              onClick={() => goToChapter(hit.chapter, hit.block)}
            >
              <div className="bookmark-chapter">{hit.chapterTitle}</div>
              <div className="bookmark-snippet">{hit.snippet}</div>
            </button>
          ))}
        </div>
      )}

      {panel === "settings" && (
        <div className="panel">
          <div className="panel-title">Reader settings</div>
          <div className="settings-row">
            <span>Text size</span>
            <div className="bar-group">
              <button
                className="bar-btn"
                onClick={() => updateSettings(Math.max(14, fontSize - 1), theme)}
              >
                A−
              </button>
              <span className="settings-value">{fontSize}</span>
              <button
                className="bar-btn"
                onClick={() => updateSettings(Math.min(28, fontSize + 1), theme)}
              >
                A+
              </button>
            </div>
          </div>
          <div className="settings-row">
            <span>Theme</span>
            <div className="bar-group">
              {(["light", "sepia", "dark"] as const).map((t) => (
                <button
                  key={t}
                  className={`bar-btn theme-chip chip-${t} ${theme === t ? "active" : ""}`}
                  onClick={() => updateSettings(fontSize, t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

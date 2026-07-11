"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Cover from "./Cover";
import { getProgress } from "@/lib/storage";
import type { BookSummary } from "@/lib/books";

export default function Shelf({ books }: { books: BookSummary[] }) {
  // Progress lives in localStorage, so it can only be read on the client
  // after mount; render 0 first, then hydrate the bars.
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const book of books) {
      const p = getProgress(book.id);
      if (p) map[book.id] = p.percent;
    }
    setProgress(map);
  }, [books]);

  return (
    <div className="shelf-grid">
      {books.map((book) => {
        const pct = progress[book.id];
        return (
          <Link key={book.id} href={`/book/${book.id}`} className="shelf-item">
            <Cover title={book.title} author={book.author} />
            <div className="shelf-item-info">
              <div className="shelf-item-title">{book.title}</div>
              <div className="shelf-item-author">{book.author}</div>
              {pct !== undefined ? (
                <div className="progress-track" aria-label={`${Math.round(pct * 100)}% read`}>
                  <div className="progress-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
                </div>
              ) : (
                <div className="shelf-item-meta">
                  {book.chapterCount} chapter{book.chapterCount === 1 ? "" : "s"}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

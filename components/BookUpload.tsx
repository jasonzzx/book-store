"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function BookUpload() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/books/upload", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as { error?: string; message?: string; refresh?: boolean };
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setMessage(result.message || "Book uploaded.");
      event.currentTarget.reset();
      if (result.refresh) router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="upload-open" type="button" onClick={() => dialogRef.current?.showModal()}>
        <span aria-hidden="true">＋</span> Upload book
      </button>
      <dialog className="upload-dialog" ref={dialogRef} onClose={() => setMessage("")}>
        <div className="upload-dialog-heading">
          <div>
            <h2>Upload a book</h2>
            <p>Add it to your shelf without touching the repository.</p>
          </div>
          <button className="upload-close" type="button" aria-label="Close" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <label className="upload-field">
            <span>Book ZIP</span>
            <input name="book" type="file" accept=".zip,application/zip" required />
            <small>Include one book.json and all Markdown chapter files. Maximum 20 MB.</small>
          </label>
          {message && <p className={isError ? "upload-message error" : "upload-message success"}>{message}</p>}
          <button className="upload-submit" type="submit" disabled={busy}>
            {busy ? "Uploading…" : "Upload to shelf"}
          </button>
        </form>
      </dialog>
    </>
  );
}

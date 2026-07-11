# Book Store

A mobile-first ebook store and reader, built with Next.js and deployed on Vercel. There is **no database and no backend**: the entire library is the [`Books/`](Books/) folder in this repository, and all per-user state (reading progress, bookmarks, reader settings) lives in the browser's localStorage.

## Features

- **Bookshelf** home page with auto-generated covers (deterministic gradient + typography, no artwork required) and per-book reading progress bars
- **Reader** with chapter navigation, adjustable text size, and light / sepia / dark themes
- **Resume**: reading position is saved automatically and restored when you reopen a book
- **Bookmarks**: star the passage you're reading, jump back to it from the bookmarks panel
- **In-book search** across all chapters with snippet previews
- **PWA**: installable to the home screen from a mobile browser (web app manifest + icons)

## How books are stored

Each book is a folder under `Books/`:

```
Books/
  my-book/
    book.json          ← manifest: title, author, description, chapter list
    chapters/
      01.md            ← one Markdown file per chapter
      02.md
```

`book.json`:

```json
{
  "id": "my-book",
  "title": "My Book",
  "author": "Your Name",
  "description": "Shown on the shelf and book page.",
  "language": "en",
  "chapters": [
    { "id": "01", "title": "First Chapter", "file": "chapters/01.md" }
  ]
}
```

Rules:

- `id` must match the folder name (lowercase letters, digits, hyphens) — it becomes the URL: `/book/my-book`
- Chapters appear in manifest order
- Chapters support headings, paragraphs, bold/italic/inline code, blockquotes, lists, fenced code blocks, and `---` scene breaks

**To publish a book: add a folder and push.** Pages are statically generated at build time from the `Books/` folder, so every push triggers a Vercel deployment and the new book appears on the shelf — no app changes needed.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also validates all book manifests)
```

## Deployment

The app deploys to Vercel as a standard Next.js project — no configuration needed. Connect the repository to Vercel (or run `vercel`), and every push to the production branch redeploys the store.

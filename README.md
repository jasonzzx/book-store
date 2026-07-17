# Book Store

A mobile-first ebook store and reader, built with Next.js and deployed on Vercel. There is **no database and no backend**: the entire library is the [`Books/`](Books/) folder in this repository, and all per-user state (reading progress, bookmarks, reader settings) lives in the browser's localStorage.

## Features

- **Bookshelf** home page with auto-generated covers (deterministic gradient + typography, no artwork required) and per-book reading progress bars
- **Reader** with chapter navigation, adjustable text size, and light / sepia / dark themes
- **Resume**: reading position is saved automatically and restored when you reopen a book
- **Bookmarks**: star the passage you're reading, jump back to it from the bookmarks panel
- **In-book search** across all chapters with snippet previews
- **PWA**: installable to the home screen from a mobile browser (web app manifest + icons)
- **Book upload**: add a ZIP from the shelf UI; local development writes to `Books/`, while production commits to GitHub and redeploys

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

### Upload from the app

Zip either a book folder or its contents, then choose **Upload book** on the shelf. The archive must contain exactly one `book.json` plus every Markdown file referenced by its `chapters` list. Uploads are limited to 20 MB, and an existing book ID cannot be replaced.

In local development, uploads are written straight to `Books/`. For a deployed app, configure these server-side environment variables:

```text
GITHUB_TOKEN=a-fine-grained-token-with-contents-write-access
GITHUB_REPOSITORY=owner/repository
GITHUB_BRANCH=main
```

The token is never sent to the browser. A production upload creates one commit on the configured branch, which triggers the usual Vercel deployment. Until the GitHub variables are configured, production uploads remain disabled. The upload screen has no login or password because this app is intended for personal use.

You can still publish manually by adding a folder under `Books/` and pushing it.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also validates all book manifests)
```

## Deployment

The app deploys to Vercel as a standard Next.js project — no configuration needed. Connect the repository to Vercel (or run `vercel`), and every push to the production branch redeploys the store.

import { getAllBooks } from "@/lib/books";
import Shelf from "@/components/Shelf";
import BookUpload from "@/components/BookUpload";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const books = getAllBooks();
  return (
    <main className="shelf-page">
      <header className="shelf-header">
        <div>
          <h1>Book Store</h1>
          <p>{books.length} book{books.length === 1 ? "" : "s"} on the shelf</p>
        </div>
        <BookUpload />
      </header>
      <Shelf books={books} />
    </main>
  );
}

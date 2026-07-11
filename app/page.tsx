import { getAllBooks } from "@/lib/books";
import Shelf from "@/components/Shelf";

export default function HomePage() {
  const books = getAllBooks();
  return (
    <main className="shelf-page">
      <header className="shelf-header">
        <h1>Book Store</h1>
        <p>{books.length} book{books.length === 1 ? "" : "s"} on the shelf</p>
      </header>
      <Shelf books={books} />
    </main>
  );
}

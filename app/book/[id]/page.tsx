import { notFound } from "next/navigation";
import { getAllBooks, getBook } from "@/lib/books";
import Reader from "@/components/Reader";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().map((book) => ({ id: book.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  return { title: book ? `${book.title} — Book Store` : "Book Store" };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  if (!book || book.chapters.length === 0) notFound();
  return <Reader book={book} />;
}

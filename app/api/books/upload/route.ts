import { NextResponse } from "next/server";
import { readBookZip, saveBookLocally, saveBookToGitHub } from "@/lib/book-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("book");

    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Choose a .zip book file." }, { status: 400 });
    }

    const book = await readBookZip(file);
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
      await saveBookToGitHub(book);
      return NextResponse.json({
        message: `“${book.title}” was uploaded. It will appear after the deployment finishes.`,
      });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "GitHub upload is not configured." }, { status: 503 });
    }
    await saveBookLocally(book);
    return NextResponse.json({ message: `“${book.title}” is now on your shelf.`, refresh: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The book could not be uploaded.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

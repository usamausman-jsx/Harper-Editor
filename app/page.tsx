// app/page.tsx
import { HighlightedEditor } from "@/components/highlighted-editor";

export default function Home() {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <h1 className="mb-6 text-2xl font-semibold">Spell-Checked Editor</h1>
      <HighlightedEditor />
    </main>
  );
}

// Auto-generated book cover: the title is hashed into one of a fixed set of
// gradient palettes, so every book gets a distinctive cover with no artwork,
// and the same book always renders the same cover.

const PALETTES: [string, string][] = [
  ["#1e3a8a", "#3b82f6"],
  ["#7c2d12", "#ea580c"],
  ["#14532d", "#22c55e"],
  ["#581c87", "#a855f7"],
  ["#7f1d1d", "#ef4444"],
  ["#134e4a", "#14b8a6"],
  ["#713f12", "#eab308"],
  ["#831843", "#ec4899"],
  ["#1e293b", "#64748b"],
  ["#312e81", "#818cf8"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Cover({
  title,
  author,
  large = false,
}: {
  title: string;
  author: string;
  large?: boolean;
}) {
  const [from, to] = PALETTES[hash(title) % PALETTES.length];
  return (
    <div
      className={`cover ${large ? "cover-large" : ""}`}
      style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}
      aria-hidden="true"
    >
      <div className="cover-rule" />
      <div className="cover-title">{title}</div>
      <div className="cover-author">{author}</div>
    </div>
  );
}

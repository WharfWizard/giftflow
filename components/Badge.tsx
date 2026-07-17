const TONES: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-800",
  muted: "bg-gray-100 text-gray-600",
};

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded ${TONES[tone]}`}>{children}</span>
  );
}

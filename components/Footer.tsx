import Link from "next/link";

export function Footer() {
  return (
    <footer className="max-w-4xl mx-auto px-6 py-6 flex gap-4 text-xs text-[#5f5e5a]">
      <span>GiftFlow™ by Academy of Life Planning</span>
      <Link href="/privacy" className="underline">Privacy Notice</Link>
      <Link href="/disclaimer" className="underline">Full Disclaimer</Link>
    </footer>
  );
}

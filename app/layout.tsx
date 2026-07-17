import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ViewProvider } from "@/lib/view";
import { Header } from "@/components/Header";
import { ResumeGate } from "@/components/ResumeGate";

export const metadata: Metadata = {
  title: "GiftFlow",
  description: "Track lifetime gifts. Evidence gifts from income. Prepare records for executors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <ViewProvider>
            <Header />
            <main className="max-w-4xl mx-auto px-6 py-8">
              <ResumeGate>{children}</ResumeGate>
            </main>
          </ViewProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

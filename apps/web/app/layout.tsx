import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Context Studio",
  description: "Manage and authorize the context that feeds your AI agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-black/5 bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
                C
              </div>
              <span className="font-semibold tracking-tight">Context Studio</span>
              <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted">
                Change Requests
              </span>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

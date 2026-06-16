import type { Metadata } from "next";
import "./globals.css";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

export const metadata: Metadata = {
  title: "meva — Context Studio",
  description: "Govern the context that feeds your AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved/system theme before paint to avoid a flash. */}
        <script src="/theme-init.js" />
      </head>
      <body>
        <div className="app-bg min-h-screen">
          <header className="sticky top-0 z-30 border-b border-line bg-surface/70 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
              <a href="/" className="flex items-center gap-2.5">
                <Logo size={28} />
                <span className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tracking-tight">meva</span>
                  <span className="hidden text-xs text-muted sm:inline">Context Studio</span>
                </span>
              </a>
              <nav className="ml-3 flex items-center gap-0.5 text-sm">
                <NavLink href="/">Change Requests</NavLink>
                <NavLink href="/governance">Governance</NavLink>
                <NavLink href="/distribution">Distribution</NavLink>
                <NavLink href="/edit/policies/refunds.md">Editor</NavLink>
                <NavLink href="/setup">Workspace</NavLink>
              </nav>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-md px-2.5 py-1 text-muted transition hover:bg-hover hover:text-ink"
    >
      {children}
    </a>
  );
}

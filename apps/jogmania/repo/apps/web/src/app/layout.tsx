import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Jogmania",
  description: "Retro Arcade Running Quests"
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/run", label: "Run" },
  { href: "/quest", label: "Quest" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <header className="mb-8 arcade-panel px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-arcade text-xs text-arcade-yellow">Jogmania</p>
              <h1 className="text-3xl font-semibold tracking-tight">Retro Arcade Running</h1>
            </div>
            <nav className="flex flex-wrap gap-3">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-arcade-cyan hover:text-arcade-cyan transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

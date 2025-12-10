import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link"; // Import Link
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gully Cricket Manager",
  description: "Official scoring engine for 1v1 Gully Cricket Tournaments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-black text-white min-h-screen flex flex-col`}>
        <Providers>
          
          {/* --- GLOBAL HEADER (Visible on ALL Pages) --- */}
          <nav className="fixed top-0 left-0 w-full h-14 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center px-4 z-50">
            <Link href="/" className="flex items-center gap-2 group">
              {/* Logo Icon */}
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition">
                🏏
              </div>
              {/* Text Logo */}
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition">
                Gully<span className="text-blue-500">Scorer</span>
              </span>
            </Link>
          </nav>

          {/* --- MAIN CONTENT WRAPPER --- */}
          {/* pt-16 pushes content down so it's not hidden behind the fixed header */}
          <main className="flex-1 pt-16">
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
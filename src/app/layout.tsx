import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "./providers";
import ThemeToggle from "@/components/ui/ThemeToggle"; // Make sure this file exists!

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
    // suppressHydrationWarning is required by next-themes to prevent mismatch errors
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-white dark:bg-black text-black dark:text-white min-h-screen flex flex-col transition-colors duration-300`}>
        <Providers>
          
          {/* --- GLOBAL HEADER --- */}
          <nav className="fixed top-0 left-0 w-full h-14 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 z-50 transition-colors duration-300">
            
            {/* Logo Area */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition">
                🏏
              </div>
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                Gully<span className="text-blue-500">Scorer</span>
              </span>
            </Link>

            {/* Right Side Actions: Theme Button */}
            <div className="flex items-center gap-4">
               <ThemeToggle />
            </div>

          </nav>

          {/* --- MAIN CONTENT WRAPPER --- */}
          <main className="flex-1 pt-16">
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
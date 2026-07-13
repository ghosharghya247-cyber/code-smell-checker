import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "CodeSmell - Code Smell Detector",
  description: "Analyze your code for code smells and get recommendations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500/30">
        <AuthProvider>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

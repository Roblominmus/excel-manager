import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Excel Manager - Spreadsheet Editor",
  description: "Manage and edit Excel files with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

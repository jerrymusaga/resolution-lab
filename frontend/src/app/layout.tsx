import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Resolution Lab - Discover Your Motivation Formula",
  description: "An AI coach that runs behavioral experiments to discover what actually motivates YOU to achieve your goals.",
  keywords: ["motivation", "goals", "AI coach", "behavioral science", "habit tracking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

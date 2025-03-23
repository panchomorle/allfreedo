import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/user-context";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="flex flex-col items-center justify-center h-screen">
          <UserProvider>
            <div className="min-h-screen w-full">
              {children}
            </div>
          </UserProvider>
      </body>
    </html>
  );
}

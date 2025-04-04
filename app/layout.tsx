import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/user-context";
import { RoomiesProvider } from "@/contexts/roomies-context";
import { RoomsProvider } from "@/contexts/rooms-context";
import { TasksProvider } from "@/contexts/tasks-context";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Allfreedo | Collaborative Task Management",
  description: "A collaborative task management tool for teams and roommates.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Allfreedo | Collaborative Task Management",
    description: "A collaborative task management tool for teams and roommates.",
    url: defaultUrl,
    siteName: "Allfreedo",
    images: [
      {
        url: `${defaultUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Allfreedo",
      },
    ],
    locale: "en-US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Allfreedo | Collaborative Task Management",
    description: "A collaborative task management tool for teams and roommates.",
    images: [`${defaultUrl}/og-image.png`],
    creator: "@allfreedo",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  appleWebApp: {
    capable: true,
    title: "Allfreedo",
    statusBarStyle: "default",
    startupImage: "/apple-touch-startup-image.png",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    minimalUi: true,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: defaultUrl,
    languages: {
      "en-US": defaultUrl,
      "es-ES": `${defaultUrl}/es`,
    },
  }
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
            <RoomsProvider>
              <RoomiesProvider>
                <TasksProvider>
                  <div className="min-h-screen w-full">
                    {children}
                  </div>
                </TasksProvider>
              </RoomiesProvider>
            </RoomsProvider>
          </UserProvider>
      </body>
    </html>
  );
}

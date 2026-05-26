import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: "SKCC CRICKETRS Live",
  description: "Premium Local Cricket Scoring Engine - Ball by Ball Live Scoring, Real-time Match Center, Tournament Management",
  manifest: "/manifest.json",
  themeColor: "#00ff41",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SKCC CRICKETRS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "SKCC CRICKETRS",
    "apple-mobile-web-app-title": "SKCC CRICKETRS",
    "msapplication-TileColor": "#000000",
    "msapplication-TileImage": "/icons/icon-144x144.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00ff41",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} min-h-screen flex flex-col font-sans`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#111',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              }} 
            />
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

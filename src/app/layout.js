import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: "Gully Cricket Live",
  description: "Premium Local Cricket Scoring Engine",
  manifest: "/manifest.json",
  themeColor: "#00ff41",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gully Cricket",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen flex flex-col font-sans`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

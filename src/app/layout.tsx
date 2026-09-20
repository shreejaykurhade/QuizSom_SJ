import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'QuizSom — College AI Internal Assessment Platform',
  description: 'Create source-grounded quizzes from course material with Gemini Flash, run secure live assessments with 2-strike proctoring, and turn mistakes into structured learning.',
  keywords: ['QuizSom', 'internal assessment', 'college quiz', 'gemini flash', 'proctored quiz', 'classroom assessment', 'source-grounded assessment'],
  authors: [{ name: 'QuizSom Academic Systems' }],
  icons: {
    icon: [
      { url: '/logo-icon.png', sizes: 'any' },
      { url: '/logo-icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo-icon.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased selection:bg-slate-900 selection:text-white bg-[#F8FAFC]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

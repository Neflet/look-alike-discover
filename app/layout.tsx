import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/hooks/useAuth'
import AnalyticsInit from '@/components/AnalyticsInit'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SwagAI — Discover Fashion',
  description: 'Find fashion look-alikes and discover styles powered by AI.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'SwagAI — Discover Fashion',
    description: 'Find fashion look-alikes and discover styles powered by AI.',
    url: 'https://swagaifashion.com',
    siteName: 'SwagAI',
    images: [
      {
        url: 'https://swagaifashion.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SwagAI — Discover Fashion',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SwagAI — Discover Fashion',
    description: 'Find fashion look-alikes and discover styles powered by AI.',
    images: ['https://swagaifashion.com/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AnalyticsInit />
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

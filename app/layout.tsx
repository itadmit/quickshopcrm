import type { Metadata } from 'next'
import { Noto_Sans_Hebrew, Pacifico } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ConditionalShopProvider } from '@/components/providers/ConditionalShopProvider'

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-hebrew',
  display: 'swap',
})

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pacifico',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Quick Shop - Online Store Management System',
  description: 'Advanced system for creating and managing online stores',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${notoSansHebrew.variable} ${pacifico.variable}`}>
        <QueryProvider>
          <AuthProvider>
            <ConditionalShopProvider>
              {children}
              <Toaster />
            </ConditionalShopProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}


import type { Metadata } from 'next'
import { Noto_Sans_Hebrew, Heebo, Assistant, Varela_Round, Rubik, Pacifico } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ConditionalShopProvider } from '@/components/providers/ConditionalShopProvider'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { cookies } from 'next/headers'

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-hebrew',
  display: 'swap',
})

const heebo = Heebo({
  subsets: ['hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-heebo',
  display: 'swap',
})

const assistant = Assistant({
  subsets: ['hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-assistant',
  display: 'swap',
})

const varelaRound = Varela_Round({
  subsets: ['hebrew', 'latin'],
  weight: ['400'],
  variable: '--font-varela-round',
  display: 'swap',
})

const rubik = Rubik({
  subsets: ['hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rubik',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // קריאת locale מ-cookies בשרת (עקרון ביצועים: Cookies > localStorage)
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'he'
  
  // טעינת תרגומים בשרת (Server Component - עקרון ביצועים)
  const messages = await getMessages()
  
  // קביעת כיוון טקסט לפי שפה
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  
  return (
    <html lang={locale} dir={dir}>
      <body className={`${notoSansHebrew.variable} ${heebo.variable} ${assistant.variable} ${varelaRound.variable} ${rubik.variable} ${pacifico.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <ConditionalShopProvider>
                {children}
                <Toaster />
              </ConditionalShopProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}


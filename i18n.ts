import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  // קריאת שפה מ-cookies (עדיפות על localStorage - עקרון ביצועים)
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'he'

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})


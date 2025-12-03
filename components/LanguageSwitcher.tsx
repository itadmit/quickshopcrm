"use client"

import { useTranslations } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

const languages = [
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
]

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [currentLocale, setCurrentLocale] = useState("he")

  useEffect(() => {
    // קריאת שפה מ-cookies
    const cookie = document.cookie
      .split("; ")
      .find((row: any) => row.startsWith("locale="))
    const locale = cookie?.split("=")[1] || "he"
    setCurrentLocale(locale)
  }, [])

  const changeLanguage = (locale: string) => {
    // שמירת שפה ב-cookie
    document.cookie = `locale=${locale}; path=/; max-age=31536000`
    setCurrentLocale(locale)
    // רענון הדף כדי לטעון את התרגומים החדשים
    router.refresh()
  }

  const currentLanguage = languages.find((lang: any) => lang.code === currentLocale) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span>{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang: any) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={currentLocale === lang.code ? "bg-gray-100" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


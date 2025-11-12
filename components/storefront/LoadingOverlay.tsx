"use client"

import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
}

/**
 * לואדר מרכזי שמופיע במרכז המסך
 * משתמשים בו לפעולות ארוכות כמו מעבר לדף אחר, הוספה לעגלה וכו'
 */
export function LoadingOverlay({ isLoading, message = "טוען..." }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[200px]">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin" />
        <p className="text-gray-900 font-medium text-lg">{message}</p>
      </div>
    </div>
  )
}


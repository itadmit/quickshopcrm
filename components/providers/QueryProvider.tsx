"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - נתונים טריים יותר זמן
            refetchOnWindowFocus: false, // ביטול טעינה מחדש בפוקוס - חוסך requests
            retry: 1,
            gcTime: 10 * 60 * 1000, // 10 minutes cache
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}


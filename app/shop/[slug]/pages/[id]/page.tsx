"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { PageSkeleton } from "@/components/skeletons/PageSkeleton"

interface Page {
  id: string
  title: string
  slug: string
  content: string | null
  seoTitle: string | null
  seoDescription: string | null
}

export default function StaticPage() {
  const params = useParams()
  const slug = params.slug as string
  const pageId = params.id as string

  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPage()
  }, [slug, pageId])

  const fetchPage = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/storefront/${slug}/pages/${pageId}`)
      if (response.ok) {
        const data = await response.json()
        setPage(data)
      }
    } catch (error) {
      console.error("Error fetching page:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <PageSkeleton />
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">דף לא נמצא</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href={`/shop/${slug}`} className="hover:text-purple-600">
              בית
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{page.title}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
            {page.content && (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


"use client"

import { useState, useEffect, useRef } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  Download,
  FileText,
  Video,
  Type,
  Loader2,
  Cloud,
  HardDrive,
  Copy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MediaFile {
  id: string
  name: string
  path: string
  size: number
  mimeType: string | null
  createdAt: string
  entityType: string | null
  entityId: string | null
}

interface MediaResponse {
  files: MediaFile[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  storage: {
    used: number
    usedBytes: number
  }
}

type MediaType = "all" | "images" | "fonts" | "videos"

export default function MediaPage() {
  const { toast } = useToast()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<MediaType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [storage, setStorage] = useState({ used: 0, usedBytes: 0, limit: null as number | null })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File
    preview: string
    progress: number
    name: string
  }>>([])

  const fetchMedia = async (reset = false) => {
    setLoading(true)
    try {
      const currentPage = reset ? 1 : page
      const params = new URLSearchParams({
        type: selectedType,
        page: currentPage.toString(),
        limit: "50",
      })

      if (searchQuery) {
        params.append("search", searchQuery)
      }

      const response = await fetch(`/api/media?${params}`)
      if (response.ok) {
        const data: MediaResponse = await response.json()
        if (reset) {
          setFiles(data.files)
          setPage(1)
        } else {
          setFiles((prev) => [...prev, ...data.files])
        }
        setHasMore(data.pagination.page < data.pagination.totalPages)
        setStorage({ ...data.storage, limit: storage.limit })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את המדיה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching media:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המדיה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType])

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchQuery === "") {
        fetchMedia(true)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    const filesArray = Array.from(selectedFiles)

    // יצירת previews
    const previews = filesArray.map((file: any) => {
      const isImage = file.type.startsWith("image/")
      let preview = ""
      if (isImage) {
        preview = URL.createObjectURL(file)
      }
      return {
        file,
        preview,
        progress: 0,
        name: file.name,
      }
    })
    setUploadingFiles(previews)

    try {
      const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 מגה בייט

      // בדיקת הגבלת שטח אחסון כולל (אם יש)
      if (storage.limit) {
        const totalNewFilesSize = filesArray.reduce((sum, file) => sum + file.size, 0)
        const totalNewFilesSizeMB = totalNewFilesSize / (1024 * 1024)
        const totalAfterUpload = storage.used + totalNewFilesSizeMB

        if (totalAfterUpload > storage.limit) {
          toast({
            title: "הגעת למגבלת שטח האחסון",
            description: `הגעת למגבלת שטח האחסון (${storage.limit} MB). נא למחוק קבצים קיימים או לשדרג את התוכנית.`,
            variant: "destructive",
          })
          setUploadingFiles([])
          return
        }
      }

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i]
        // בדיקת גודל קובץ
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "קובץ גדול מדי",
            description: `הקובץ ${file.name} גדול מדי. הגודל המקסימלי המותר הוא 25 מגה בייט.`,
            variant: "destructive",
          })
          continue
        }

        // בדיקת סוג קובץ
        const isImage = file.type.startsWith("image/")
        const isVideo = file.type.startsWith("video/")
        const isFont =
          file.type.includes("font") ||
          file.name.toLowerCase().endsWith(".ttf") ||
          file.name.toLowerCase().endsWith(".otf") ||
          file.name.toLowerCase().endsWith(".woff") ||
          file.name.toLowerCase().endsWith(".woff2")

        if (!isImage && !isVideo && !isFont) {
          toast({
            title: "סוג קובץ לא נתמך",
            description: `הקובץ ${file.name} אינו נתמך. ניתן להעלות תמונות (JPG, PNG, GIF), פונטים (TTF, OTF, WOFF) או סרטונים (MP4)`,
            variant: "destructive",
          })
          continue
        }

        // עדכון progress ל-50% (התחלת העלאה)
        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 50 } : f))
        )

        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", "media")
        formData.append("entityId", "general")

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        // עדכון progress ל-100% (העלאה הסתיימה)
        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 100 } : f))
        )

        if (!response.ok) {
          const error = await response.json()
          // אם זו שגיאת הגבלת שטח אחסון, נציג הודעה מיוחדת
          if (error.message) {
            throw new Error(error.message)
          }
          throw new Error(error.error || "שגיאה בהעלאת הקובץ")
        }
      }

      toast({
        title: "העלאה הושלמה",
        description: `הועלו ${filesArray.length} קבצים בהצלחה`,
      })

      // רענון הרשימה
      fetchMedia(true)

      // ניקוי previews אחרי 1 שנייה
      setTimeout(() => {
        setUploadingFiles([])
      }, 1000)
    } catch (error: any) {
      toast({
        title: "שגיאה בהעלאה",
        description: error.message || "אירעה שגיאה בהעלאת הקבצים",
        variant: "destructive",
      })
      setUploadingFiles([])
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async () => {
    if (!fileToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/files/delete?path=${encodeURIComponent(fileToDelete.path)}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הקובץ נמחק",
          description: "הקובץ נמחק בהצלחה",
        })
        setFiles((prev) => prev.filter((f: any) => f.id !== fileToDelete.id))
        setDeleteDialogOpen(false)
        setFileToDelete(null)
        // עדכון שטח אחסון
        fetchMedia(true)
      } else {
        throw new Error("שגיאה במחיקת הקובץ")
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את הקובץ",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFileType = (mimeType: string | null): "image" | "video" | "font" | "other" => {
    if (!mimeType) return "other"
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.includes("font") || mimeType.includes("ttf") || mimeType.includes("otf") || mimeType.includes("woff")) return "font"
    return "other"
  }

  const filteredFiles = files.filter((file: any) => {
    if (!searchQuery) return true
    return file.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול מדיה</h1>
            <p className="text-sm text-gray-500 mt-1">
              ניהול קבצי התמונות, הפונטים והסרטונים של החנות
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Storage Info */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <HardDrive className="w-4 h-4 text-gray-500" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">שטח אחסון</span>
                <div className="flex items-center gap-2">
                  {storage.limit ? (
                    <>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all"
                          style={{ 
                            width: `${Math.min((storage.used / storage.limit) * 100, 100)}%`,
                            backgroundColor: (storage.used / storage.limit) > 0.9 ? '#ef4444' : '#14b8a6'
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {storage.used.toFixed(2)} / {storage.limit} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all"
                          style={{ width: '10%' }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {storage.used.toFixed(2)} / ∞ MB
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 ml-2" />
              העלה קבצים
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.ttf,.otf,.woff,.woff2"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: "all" as MediaType, label: "הכל", icon: FileText },
            { id: "images" as MediaType, label: "תמונות", icon: ImageIcon },
            { id: "fonts" as MediaType, label: "פונטים", icon: Type },
            { id: "videos" as MediaType, label: "סרטונים", icon: Video },
          ].map((tab: any) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
                  selectedType === tab.id
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חפש קבצים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Upload Area */}
        {files.length === 0 && !loading && (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Cloud className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                גרור קבצים לכאן או לחץ להעלאה
              </h3>
              <p className="text-sm text-gray-500 mb-4 text-center">
                ניתן להעלות: תמונות (JPG, PNG, GIF), פונטים (TTF, OTF, WOFF), סרטונים (MP4)
                <br />
                <span className="text-xs">גודל מקסימלי: 25 מגה בייט לקובץ</span>
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 ml-2" />
                בחר קבצים
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Files Grid */}
        {loading && files.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* קבצים בהעלאה */}
            {uploadingFiles.map((uploadFile, idx) => (
              <Card key={`uploading-${idx}`} className="relative">
                <CardContent className="p-4">
                  <div className="relative aspect-square mb-3 bg-gray-100 rounded overflow-hidden">
                    {uploadFile.preview ? (
                      <img
                        src={uploadFile.preview}
                        alt={uploadFile.name}
                        className="w-full h-full object-cover opacity-50"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {/* Progress Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40">
                      <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                      <div className="w-3/4 h-2 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                      <span className="text-white text-xs mt-1">{uploadFile.progress}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={uploadFile.name}>
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-gray-500">מעלה...</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* קבצים קיימים */}
            {filteredFiles.map((file: any) => {
              const fileType = getFileType(file.mimeType)
              return (
                <Card key={file.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-3 bg-gray-100 rounded overflow-hidden">
                      {fileType === "image" ? (
                        <img
                          src={file.path}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/placeholder-image.png"
                          }}
                        />
                      ) : fileType === "video" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <Video className="w-12 h-12 text-white" />
                        </div>
                      ) : fileType === "font" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Type className="w-12 h-12 text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(file.path)
                            toast({
                              title: "הלינק הועתק",
                              description: "הלינק לקובץ הועתק ללוח",
                            })
                          }}
                          title="העתק לינק"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            window.open(file.path, "_blank")
                          }}
                          title="הורדה"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setFileToDelete(file)
                            setDeleteDialogOpen(true)
                          }}
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                const nextPage = page + 1
                setPage(nextPage)
                setLoading(true)
                try {
                  const params = new URLSearchParams({
                    type: selectedType,
                    page: nextPage.toString(),
                    limit: "50",
                  })
                  if (searchQuery) {
                    params.append("search", searchQuery)
                  }
                  const response = await fetch(`/api/media?${params}`)
                  if (response.ok) {
                    const data: MediaResponse = await response.json()
                    setFiles((prev) => [...prev, ...data.files])
                    setHasMore(data.pagination.page < data.pagination.totalPages)
                  }
                } catch (error) {
                  console.error("Error loading more:", error)
                } finally {
                  setLoading(false)
                }
              }}
            >
              טען עוד
            </Button>
          </div>
        )}

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>מחיקת קובץ</DialogTitle>
              <DialogDescription>
                האם אתה בטוח שברצונך למחוק את הקובץ "{fileToDelete?.name}"? פעולה זו לא ניתנת לביטול.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מוחק...
                  </>
                ) : (
                  "מחק"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}


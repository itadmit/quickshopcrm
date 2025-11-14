"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Search, Upload, X, Check, Trash2, Image as ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (files: string[]) => void
  selectedFiles?: string[]
  shopId?: string
  entityType?: string // products, collections וכו'
  entityId?: string // ID של ה-entity או "new"
  multiple?: boolean
  title?: string
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  selectedFiles = [],
  shopId,
  entityType,
  entityId,
  multiple = true,
  title = "בחר תמונות",
}: MediaPickerProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedFiles))
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])

  // עדכון selected כשהמודאל נפתח
  useEffect(() => {
    if (open) {
      setSelected(new Set(selectedFiles))
      setSearchQuery("")
      setPage(1)
      fetchFiles(true)
    }
  }, [open, selectedFiles])

  const fetchFiles = async (reset = false) => {
    if (!shopId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        shopId,
        page: reset ? "1" : page.toString(),
        limit: "50",
      })

      // לא מסננים לפי entityType או entityId - מציגים את כל התמונות של החנות
      // if (entityType) {
      //   params.append("entityType", entityType)
      // }
      //
      // if (entityId && entityId !== "new") {
      //   params.append("entityId", entityId)
      // }

      if (searchQuery) {
        params.append("search", searchQuery)
      }

      const response = await fetch(`/api/files?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (reset) {
          setFiles(data.files)
        } else {
          setFiles((prev) => [...prev, ...data.files])
        }
        setHasMore(data.pagination.page < data.pagination.totalPages)
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת התמונות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && shopId) {
      const timeoutId = setTimeout(() => {
        fetchFiles(true)
      }, 300) // Debounce

      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, open, shopId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (!shopId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא חנות. אנא בחר חנות תחילה",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const uploadedFiles: string[] = []
    const errors: string[] = []
    const fileArray = Array.from(files)
    
    // הוספת קבצים להעלאה למצב
    const tempFileIds = fileArray.map((f) => `temp-${Date.now()}-${Math.random()}`)
    setUploadingFiles(tempFileIds)

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const tempId = tempFileIds[i]
        
        // סימולציה של פרוגרס
        setUploadProgress((prev) => ({ ...prev, [tempId]: 0 }))
        
        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", entityType || "products")
        formData.append("entityId", entityId || "new")
        formData.append("shopId", shopId)

        // סימולציה של פרוגרס (אמיתי יותר)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const current = prev[tempId] || 0
            if (current < 90) {
              return { ...prev, [tempId]: current + 10 }
            }
            return prev
          })
        }, 100)

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)
        setUploadProgress((prev) => ({ ...prev, [tempId]: 100 }))

        if (response.ok) {
          const data = await response.json()
          uploadedFiles.push(data.file.path)
        } else {
          const errorData = await response.json()
          console.error("Upload error:", errorData)
          errors.push(`${file.name}: ${errorData.error || "שגיאה לא ידועה"}`)
        }
        
        // המתנה קצרה כדי להראות את 100%
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      if (uploadedFiles.length > 0) {
        toast({
          title: "הצלחה",
          description: `${uploadedFiles.length} תמונות הועלו בהצלחה${errors.length > 0 ? `, ${errors.length} נכשלו` : ""}`,
        })
        // הוספת התמונות החדשות לרשימה
        setFiles((prev) => [
          ...uploadedFiles.map((path) => ({
            id: `new-${Date.now()}-${Math.random()}`,
            name: path.split("/").pop() || "תמונה",
            path,
            size: 0,
            mimeType: "image/jpeg",
            createdAt: new Date().toISOString(),
            entityType: entityType || null,
            entityId: entityId || null,
          })),
          ...prev,
        ])
        // בחירת התמונות החדשות
        const newSelected = new Set(selected)
        uploadedFiles.forEach((path) => newSelected.add(path))
        setSelected(newSelected)
      }

      if (errors.length > 0 && uploadedFiles.length === 0) {
        toast({
          title: "שגיאה",
          description: errors[0] || "אירעה שגיאה בהעלאת התמונות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעלאת התמונות",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadingFiles([])
      setUploadProgress({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (filePath: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את התמונה?")) return

    setDeleting((prev) => new Set(prev).add(filePath))

    try {
      const response = await fetch(`/api/files/delete?path=${encodeURIComponent(filePath)}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setFiles((prev) => prev.filter((f) => f.path !== filePath))
        setSelected((prev) => {
          const newSet = new Set(prev)
          newSet.delete(filePath)
          return newSet
        })
        toast({
          title: "הצלחה",
          description: "התמונה נמחקה בהצלחה",
        })
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התמונה",
        variant: "destructive",
      })
    } finally {
      setDeleting((prev) => {
        const newSet = new Set(prev)
        newSet.delete(filePath)
        return newSet
      })
    }
  }

  // מחיקה קבוצתית
  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selected)
    if (selectedArray.length === 0) {
      toast({
        title: "שים לב",
        description: "לא נבחרו תמונות למחיקה",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedArray.length} תמונות?`)) return

    // סימון כל התמונות שנמחקות
    setDeleting(new Set(selectedArray))

    try {
      // מחיקה אסינכרונית של כל התמונות
      const deletePromises = selectedArray.map((filePath) =>
        fetch(`/api/files/delete?path=${encodeURIComponent(filePath)}`, {
          method: "DELETE",
        })
      )

      const results = await Promise.allSettled(deletePromises)
      
      // ספירת הצלחות וכישלונות
      const successful = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - successful

      if (successful > 0) {
        toast({
          title: "הצלחה",
          description: `${successful} תמונות נמחקו בהצלחה${failed > 0 ? `, ${failed} נכשלו` : ""}`,
        })
        
        // הסרת התמונות שנמחקו מהרשימה
        setFiles((prev) => prev.filter((f) => !selectedArray.includes(f.path)))
        setSelected(new Set())
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את התמונות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error bulk deleting files:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התמונות",
        variant: "destructive",
      })
    } finally {
      setDeleting(new Set())
    }
  }

  const handleToggleSelect = (filePath: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath)
    } else {
      if (!multiple && newSelected.size > 0) {
        newSelected.clear()
      }
      newSelected.add(filePath)
    }
    setSelected(newSelected)
  }

  const handleDone = () => {
    onSelect(Array.from(selected))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0" dir="rtl">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search and Upload Bar */}
          <div className="px-6 py-4 border-b space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חפש קבצים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              {/* כפתור מחיקה קבוצתית - מופיע רק כשיש תמונות מסומנות */}
              {selected.size > 0 && (
                <Button
                  onClick={handleBulkDelete}
                  disabled={deleting.size > 0}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  מחק ({selected.size})
                </Button>
              )}
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                העלה קבצים
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Files Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && files.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : files.length === 0 && uploadingFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">אין תמונות</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  העלה תמונות
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {/* קבצים בהעלאה - Skeleton עם פרוגרס */}
                {uploadingFiles.map((tempId, index) => {
                  const progress = uploadProgress[tempId] || 0
                  return (
                    <div
                      key={tempId}
                      className="relative rounded-lg border-2 border-purple-300 overflow-hidden"
                    >
                      {/* Skeleton */}
                      <div className="aspect-square relative bg-gray-100 animate-pulse">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Progress Text */}
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 text-center font-medium">
                          {progress}%
                        </p>
                      </div>
                    </div>
                  )
                })}

                {/* קבצים קיימים */}
                {files.map((file) => {
                  const isSelected = selected.has(file.path)
                  const isDeleting = deleting.has(file.path)

                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "relative group cursor-pointer rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-purple-500 ring-2 ring-purple-200"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleToggleSelect(file.path)}
                    >
                      {/* Image */}
                      <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-50">
                        <img
                          src={file.path}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-image.png"
                          }}
                        />
                        {isDeleting && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>

                      {/* Checkbox */}
                      <div className="absolute top-2 right-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-purple-500 border-purple-500"
                              : "bg-white border-gray-300 group-hover:border-purple-400"
                          )}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(file.path)
                        }}
                        disabled={isDeleting}
                        className="absolute top-2 left-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* File Name */}
                      <div className="p-2 bg-white rounded-b-lg">
                        <p className="text-xs text-gray-600 truncate" title={file.name}>
                          {file.name}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {hasMore && !loading && (
              <div className="mt-4 text-center">
                <Button
                  onClick={() => {
                    setPage((p) => p + 1)
                    fetchFiles(false)
                  }}
                  variant="outline"
                  size="sm"
                >
                  טען עוד
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selected.size > 0 && `${selected.size} נבחרו`}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button onClick={handleDone} disabled={selected.size === 0}>
              סיום ({selected.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


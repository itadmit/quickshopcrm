"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Star, X, Upload, Video, Image as ImageIcon, Loader2 } from "lucide-react"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

interface ReviewFormProps {
  productId: string
  slug: string
  shopId: string
  customerId?: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({ productId, slug, shopId, customerId, onSuccess, onCancel }: ReviewFormProps) {
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [title, setTitle] = useState("")
  const [comment, setComment] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        // בדיקת גודל קובץ (מקסימום 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "שגיאה",
            description: `הקובץ ${file.name} גדול מדי. מקסימום 10MB`,
            variant: "destructive",
          })
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", "reviews")
        formData.append("entityId", productId)
        formData.append("shopId", shopId)

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          uploadedUrls.push(data.file.path)
        } else {
          const error = await response.json()
          toast({
            title: "שגיאה",
            description: `לא הצלחנו להעלות את ${file.name}: ${error.error || "שגיאה לא ידועה"}`,
            variant: "destructive",
          })
        }
      }

      if (uploadedUrls.length > 0) {
        setImages((prev) => [...prev, ...uploadedUrls])
        toast({
          title: "הצלחה",
          description: `${uploadedUrls.length} תמונה/ות הועלו בהצלחה`,
        })
      }
    } catch (error) {
      console.error("Error uploading images:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעלאת התמונות",
        variant: "destructive",
      })
    } finally {
      setUploadingImages(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ""
      }
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingVideos(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        // בדיקת גודל קובץ (מקסימום 100MB לוידאו)
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: "שגיאה",
            description: `הקובץ ${file.name} גדול מדי. מקסימום 100MB`,
            variant: "destructive",
          })
          continue
        }

        // בדיקה שזה קובץ וידאו
        if (!file.type.startsWith("video/")) {
          toast({
            title: "שגיאה",
            description: `הקובץ ${file.name} אינו קובץ וידאו`,
            variant: "destructive",
          })
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", "reviews")
        formData.append("entityId", productId)
        formData.append("shopId", shopId)

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          uploadedUrls.push(data.file.path)
        } else {
          const error = await response.json()
          toast({
            title: "שגיאה",
            description: `לא הצלחנו להעלות את ${file.name}: ${error.error || "שגיאה לא ידועה"}`,
            variant: "destructive",
          })
        }
      }

      if (uploadedUrls.length > 0) {
        setVideos((prev) => [...prev, ...uploadedUrls])
        toast({
          title: "הצלחה",
          description: `${uploadedUrls.length} וידאו הועלה בהצלחה`,
        })
      }
    } catch (error) {
      console.error("Error uploading videos:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעלאת הוידאו",
        variant: "destructive",
      })
    } finally {
      setUploadingVideos(false)
      if (videoInputRef.current) {
        videoInputRef.current.value = ""
      }
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast({
        title: "שגיאה",
        description: "אנא בחר דירוג",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/storefront/${slug}/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          title: title || undefined,
          comment: comment || undefined,
          images: images.length > 0 ? images : undefined,
          videos: videos.length > 0 ? videos : undefined,
          customerId: customerId || undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: "תודה!",
          description: "הביקורת שלך נשלחה לאישור",
        })
        
        // איפוס הטופס
        setRating(0)
        setTitle("")
        setComment("")
        setImages([])
        setVideos([])
        
        if (onSuccess) {
          onSuccess()
        }
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בשליחת הביקורת",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת הביקורת",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* דירוג */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              דירוג <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* כותרת */}
          <div>
            <label htmlFor="review-title" className="text-sm font-medium text-gray-700 mb-2 block">
              כותרת (אופציונלי)
            </label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="כותרת קצרה לביקורת"
              maxLength={100}
            />
          </div>

          {/* תגובה */}
          <div>
            <label htmlFor="review-comment" className="text-sm font-medium text-gray-700 mb-2 block">
              תגובה (אופציונלי)
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="שתף את החוויה שלך עם המוצר..."
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
          </div>

          {/* העלאת תמונות */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              תמונות (אופציונלי)
            </label>
            <div className="space-y-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-600">מעלה תמונות...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">העלה תמונות</span>
                  </>
                )}
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Review image ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* העלאת וידאו */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              וידאו (אופציונלי)
            </label>
            <div className="space-y-4">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                {uploadingVideos ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-600">מעלה וידאו...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">העלה וידאו</span>
                  </>
                )}
              </label>

              {videos.length > 0 && (
                <div className="space-y-2">
                  {videos.map((video, idx) => (
                    <div key={idx} className="relative group">
                      <video
                        src={video}
                        controls
                        className="w-full max-w-md rounded-lg"
                        preload="metadata"
                      >
                        הדפדפן שלך לא תומך בהצגת וידאו.
                      </video>
                      <button
                        type="button"
                        onClick={() => removeVideo(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* כפתורים */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                ביטול
              </Button>
            )}
            <Button type="submit" disabled={submitting || rating === 0}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שולח...
                </>
              ) : (
                "שלח ביקורת"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


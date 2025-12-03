"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, X, Type, Image as ImageIcon, FileText, Eye, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

type PopupContentElement = {
  id: string
  type: "text" | "image" | "form"
  content: any
}

export default function EditPopupPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [showDisplaySettings, setShowDisplaySettings] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    layout: "one-column" as "one-column" | "two-column",
    borderRadius: 0,
    isActive: true,
    content: [] as PopupContentElement[],
    displayFrequency: "every-visit" as "every-visit" | "once-daily" | "once-weekly" | "once-monthly",
    displayLocation: "all-pages" as "all-pages" | "specific-pages",
    specificPages: [] as string[],
    delay: 0,
    trigger: "on-load" as "on-load" | "on-exit-intent" | "on-scroll",
    scrollPercentage: 50,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    overlayColor: "#000000",
    overlayOpacity: 0.5,
  })

  useEffect(() => {
    fetchPopup()
  }, [params.id])

  const fetchPopup = async () => {
    try {
      const response = await fetch(`/api/popups/${params.id}`)
      if (response.ok) {
        const popup = await response.json()
        setFormData({
          name: popup.name,
          layout: popup.layout,
          borderRadius: popup.borderRadius,
          isActive: popup.isActive,
          content: popup.content || [],
          displayFrequency: popup.displayFrequency,
          displayLocation: popup.displayLocation,
          specificPages: popup.specificPages || [],
          delay: popup.delay || 0,
          trigger: popup.trigger,
          scrollPercentage: popup.scrollPercentage || 50,
          backgroundColor: popup.backgroundColor || "#ffffff",
          textColor: popup.textColor || "#000000",
          overlayColor: popup.overlayColor || "#000000",
          overlayOpacity: popup.overlayOpacity || 0.5,
        })
      } else {
        toast({
          title: "שגיאה",
          description: "הפופאפ לא נמצא",
          variant: "destructive",
        })
        router.push("/popups")
      }
    } catch (error) {
      console.error("Error fetching popup:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הפופאפ",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addContentElement = (type: "text" | "image" | "form") => {
    const newElement: PopupContentElement = {
      id: `element-${Date.now()}`,
      type,
      content: type === "text" 
        ? { text: "", fontSize: 16, fontWeight: "normal", align: "right" }
        : type === "image"
        ? { url: "", alt: "", width: 100 }
        : { fields: [], submitText: "שלח", submitAction: "none" }
    }
    setFormData(prev => ({
      ...prev,
      content: [...prev.content, newElement]
    }))
  }

  const removeContentElement = (id: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.filter(el => el.id !== id)
    }))
  }

  const updateContentElement = (id: string, updates: Partial<PopupContentElement>) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "אנא בחר חנות",
        variant: "destructive",
      })
      return
    }

    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן שם לפופאפ",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/popups/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הפופאפ עודכן בהצלחה",
        })
        router.push("/popups")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון הפופאפ",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating popup:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הפופאפ",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת פופאפ">
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">טוען...</p>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return null
  }

  return (
    <AppLayout title="עריכת פופאפ">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">עריכת פופאפ</h1>
              <p className="text-gray-600 mt-1">
                עדכן את הפופאפ שלך
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/popups")}
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="prodify-gradient text-white"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>

          {/* Same form content as new page */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>מידע בסיסי</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">שם הפופאפ *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="הכנס שם לפופאפ"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="layout">פריסת פופאפ</Label>
                      <Select
                        value={formData.layout}
                        onValueChange={(value: "one-column" | "two-column") =>
                          setFormData(prev => ({ ...prev, layout: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-column">עמודה אחת</SelectItem>
                          <SelectItem value="two-column">שתי עמודות</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="borderRadius">עיגול פינות פופאפ</Label>
                      <Select
                        value={formData.borderRadius.toString()}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, borderRadius: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">ללא עיגול (0px)</SelectItem>
                          <SelectItem value="4">קטן (4px)</SelectItem>
                          <SelectItem value="8">בינוני (8px)</SelectItem>
                          <SelectItem value="12">גדול (12px)</SelectItem>
                          <SelectItem value="16">גדול מאוד (16px)</SelectItem>
                          <SelectItem value="24">עגול מאוד (24px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, isActive: checked === true }))
                      }
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      פעיל
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Building Popup Content */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>בניית תוכן הפופאפ</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      תצוגה מקדימה
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addContentElement("text")}
                    >
                      <Type className="w-4 h-4 ml-2" />
                      הוסף טקסט
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addContentElement("image")}
                    >
                      <ImageIcon className="w-4 h-4 ml-2" />
                      הוסף תמונה
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addContentElement("form")}
                    >
                      <FileText className="w-4 h-4 ml-2" />
                      הוסף טופס
                    </Button>
                  </div>

                  {formData.content.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                      <div className="text-gray-400 mb-2">
                        <FileText className="w-12 h-12 mx-auto" />
                      </div>
                      <p className="text-gray-500">
                        לחץ על הכפתורים למעלה כדי להוסיף רכיבים לפופאפ
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.content.map((element, index) => (
                        <Card key={element.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {element.type === "text" && <Type className="w-4 h-4 text-gray-500" />}
                                {element.type === "image" && <ImageIcon className="w-4 h-4 text-gray-500" />}
                                {element.type === "form" && <FileText className="w-4 h-4 text-gray-500" />}
                                <span className="text-sm font-medium text-gray-700">
                                  {element.type === "text" ? "טקסט" : element.type === "image" ? "תמונה" : "טופס"}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeContentElement(element.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>

                            {element.type === "text" && (
                              <div className="space-y-3">
                                <Textarea
                                  value={element.content.text || ""}
                                  onChange={(e) => updateContentElement(element.id, {
                                    content: { ...element.content, text: e.target.value }
                                  })}
                                  placeholder="הכנס טקסט..."
                                  rows={4}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">גודל גופן</Label>
                                    <Input
                                      type="number"
                                      value={element.content.fontSize || 16}
                                      onChange={(e) => updateContentElement(element.id, {
                                        content: { ...element.content, fontSize: parseInt(e.target.value) || 16 }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">משקל</Label>
                                    <Select
                                      value={element.content.fontWeight || "normal"}
                                      onValueChange={(value) => updateContentElement(element.id, {
                                        content: { ...element.content, fontWeight: value }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="normal">רגיל</SelectItem>
                                        <SelectItem value="bold">מודגש</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">יישור</Label>
                                    <Select
                                      value={element.content.align || "right"}
                                      onValueChange={(value) => updateContentElement(element.id, {
                                        content: { ...element.content, align: value }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="right">ימין</SelectItem>
                                        <SelectItem value="center">מרכז</SelectItem>
                                        <SelectItem value="left">שמאל</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {element.type === "image" && (
                              <div className="space-y-3">
                                <div>
                                  <Label>URL תמונה</Label>
                                  <Input
                                    value={element.content.url || ""}
                                    onChange={(e) => updateContentElement(element.id, {
                                      content: { ...element.content, url: e.target.value }
                                    })}
                                    placeholder="https://example.com/image.jpg"
                                  />
                                </div>
                                <div>
                                  <Label>טקסט חלופי</Label>
                                  <Input
                                    value={element.content.alt || ""}
                                    onChange={(e) => updateContentElement(element.id, {
                                      content: { ...element.content, alt: e.target.value }
                                    })}
                                    placeholder="תיאור התמונה"
                                  />
                                </div>
                                <div>
                                  <Label>רוחב (%)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={element.content.width || 100}
                                    onChange={(e) => updateContentElement(element.id, {
                                      content: { ...element.content, width: parseInt(e.target.value) || 100 }
                                    })}
                                  />
                                </div>
                              </div>
                            )}

                            {element.type === "form" && (
                              <div className="space-y-3">
                                <p className="text-sm text-gray-500">
                                  טופס - תכונה זו תתווסף בקרוב
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Display Settings */}
              <Card>
                <CardHeader>
                  <button
                    type="button"
                    onClick={() => setShowDisplaySettings(!showDisplaySettings)}
                    className="flex items-center justify-between w-full"
                  >
                    <CardTitle>הגדרות תצוגה</CardTitle>
                    {showDisplaySettings ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </CardHeader>
                {showDisplaySettings && (
                  <CardContent className="space-y-4">
                    <div>
                      <Label>תדירות תצוגה</Label>
                      <Select
                        value={formData.displayFrequency}
                        onValueChange={(value: "every-visit" | "once-daily" | "once-weekly" | "once-monthly") =>
                          setFormData(prev => ({ ...prev, displayFrequency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="every-visit">הצג בכל כניסה לאתר</SelectItem>
                          <SelectItem value="once-daily">הצג פעם אחת ביום</SelectItem>
                          <SelectItem value="once-weekly">הצג פעם בשבוע</SelectItem>
                          <SelectItem value="once-monthly">הצג פעם בחודש</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1">
                        הגדרת תדירות הופעת הפופאפ למשתמש
                      </p>
                    </div>

                    <div>
                      <Label>מיקום תצוגה</Label>
                      <RadioGroup
                        value={formData.displayLocation}
                        onValueChange={(value: "all-pages" | "specific-pages") =>
                          setFormData(prev => ({ ...prev, displayLocation: value }))
                        }
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="all-pages" id="all-pages" />
                          <Label htmlFor="all-pages" className="cursor-pointer">הצג בכל העמודים</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="specific-pages" id="specific-pages" />
                          <Label htmlFor="specific-pages" className="cursor-pointer">הצג בעמודים ספציפיים</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label>טריגר הצגה</Label>
                      <Select
                        value={formData.trigger}
                        onValueChange={(value: "on-load" | "on-exit-intent" | "on-scroll") =>
                          setFormData(prev => ({ ...prev, trigger: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on-load">בטעינת העמוד</SelectItem>
                          <SelectItem value="on-exit-intent">בניסיון יציאה</SelectItem>
                          <SelectItem value="on-scroll">בגלילה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.trigger === "on-scroll" && (
                      <div>
                        <Label>אחוז גלילה להצגה</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.scrollPercentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, scrollPercentage: parseInt(e.target.value) || 50 }))}
                        />
                      </div>
                    )}

                    <div>
                      <Label>עיכוב בהצגה (שניות)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.delay}
                        onChange={(e) => setFormData(prev => ({ ...prev, delay: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>צבע רקע</Label>
                        <Input
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>צבע טקסט</Label>
                        <Input
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>צבע רקע חיצוני</Label>
                        <Input
                          type="color"
                          value={formData.overlayColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, overlayColor: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>שקיפות רקע חיצוני</Label>
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.overlayOpacity}
                          onChange={(e) => setFormData(prev => ({ ...prev, overlayOpacity: parseFloat(e.target.value) || 0.5 }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Right Column - Preview */}
            {showPreview && (
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>תצוגה מקדימה</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-gray-200 rounded-lg p-6"
                      style={{
                        backgroundColor: formData.backgroundColor,
                        color: formData.textColor,
                        borderRadius: `${formData.borderRadius}px`,
                      }}
                    >
                      {formData.content.length === 0 ? (
                        <p className="text-center text-gray-400">אין תוכן להצגה</p>
                      ) : (
                        <div className={`space-y-4 ${formData.layout === "two-column" ? "grid grid-cols-2 gap-4" : ""}`}>
                          {formData.content.map((element: any) => (
                            <div key={element.id}>
                              {element.type === "text" && (
                                <p
                                  style={{
                                    fontSize: `${element.content.fontSize || 16}px`,
                                    fontWeight: element.content.fontWeight || "normal",
                                    textAlign: element.content.align || "right",
                                  }}
                                >
                                  {element.content.text || "טקסט דוגמה"}
                                </p>
                              )}
                              {element.type === "image" && element.content.url && (
                                <img
                                  src={element.content.url}
                                  alt={element.content.alt || ""}
                                  style={{ width: `${element.content.width || 100}%` }}
                                  className="rounded"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </form>
    </AppLayout>
  )
}



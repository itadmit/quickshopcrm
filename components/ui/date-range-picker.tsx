"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, isSameDay, isWithinInterval, addDays, subMonths, addMonths, startOfDay, endOfDay } from "date-fns"
import { he } from "date-fns/locale"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  className?: string
}

type PresetType = "today" | "yesterday" | "week" | "month" | "year" | "last7days" | "last30days" | "custom"

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("custom")
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null)
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null)

  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  useEffect(() => {
    if (start && end) {
      detectPreset(start, end)
    }
  }, [startDate, endDate])

  const detectPreset = (start: Date, end: Date) => {
    const today = startOfDay(new Date())
    const yesterday = startOfDay(subDays(today, 1))
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }) // ראשון = 0
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 }) // שבת = 6
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    const yearStart = startOfYear(today)
    const yearEnd = endOfYear(today)
    const last7DaysStart = startOfDay(subDays(today, 6))
    const last30DaysStart = startOfDay(subDays(today, 29))

    if (isSameDay(start, today) && isSameDay(end, today)) {
      setSelectedPreset("today")
    } else if (isSameDay(start, yesterday) && isSameDay(end, yesterday)) {
      setSelectedPreset("yesterday")
    } else if (isSameDay(start, weekStart) && isSameDay(end, weekEnd)) {
      setSelectedPreset("week")
    } else if (isSameDay(start, monthStart) && isSameDay(end, monthEnd)) {
      setSelectedPreset("month")
    } else if (isSameDay(start, yearStart) && isSameDay(end, yearEnd)) {
      setSelectedPreset("year")
    } else if (isSameDay(start, last7DaysStart) && isSameDay(end, today)) {
      setSelectedPreset("last7days")
    } else if (isSameDay(start, last30DaysStart) && isSameDay(end, today)) {
      setSelectedPreset("last30days")
    } else {
      setSelectedPreset("custom")
    }
  }

  const applyPreset = (preset: PresetType) => {
    const now = new Date()
    const today = startOfDay(now)
    let start: Date
    let end: Date

    switch (preset) {
      case "today":
        start = today
        end = endOfDay(today)
        break
      case "yesterday":
        start = startOfDay(subDays(today, 1))
        end = endOfDay(subDays(today, 1))
        break
      case "week":
        start = startOfWeek(now, { weekStartsOn: 0 }) // ראשון = 0
        end = endOfWeek(now, { weekStartsOn: 0 }) // שבת = 6
        break
      case "month":
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case "year":
        start = startOfYear(now)
        end = endOfYear(now)
        break
      case "last7days":
        start = startOfDay(subDays(today, 6))
        end = endOfDay(today)
        break
      case "last30days":
        start = startOfDay(subDays(today, 29))
        end = endOfDay(today)
        break
      default:
        return
    }

    onStartDateChange(format(start, "yyyy-MM-dd"))
    onEndDateChange(format(end, "yyyy-MM-dd"))
    setSelectedPreset(preset)
    setIsOpen(false)
  }

  const handleDateClick = (date: Date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // התחלה חדשה
      setTempStartDate(date)
      setTempEndDate(null)
    } else if (tempStartDate && !tempEndDate) {
      // בחירת תאריך סיום
      if (date < tempStartDate) {
        // אם בחרו תאריך מוקדם יותר, זה הופך להיות התחלה
        setTempEndDate(tempStartDate)
        setTempStartDate(date)
      } else {
        setTempEndDate(date)
      }
    }
  }

  const applyCustomDates = () => {
    if (tempStartDate && tempEndDate) {
      onStartDateChange(format(tempStartDate, "yyyy-MM-dd"))
      onEndDateChange(format(tempEndDate, "yyyy-MM-dd"))
      setSelectedPreset("custom")
      setIsOpen(false)
    }
  }

  const clearDates = () => {
    setTempStartDate(null)
    setTempEndDate(null)
    onStartDateChange("")
    onEndDateChange("")
    setSelectedPreset("custom")
  }

  // יצירת לוח שנה
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // ימים ריקים לפני תחילת החודש
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // ימי החודש
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const days = getDaysInMonth()
  const weekDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]

  const isDateSelected = (date: Date) => {
    if (!start || !end) return false
    return isWithinInterval(date, { start, end })
  }

  const isDateInRange = (date: Date) => {
    const selectedStart = tempStartDate || start
    const selectedEnd = tempEndDate || end
    
    if (!selectedStart || !selectedEnd) return false
    
    if (selectedStart > selectedEnd) {
      return isWithinInterval(date, { start: selectedEnd, end: selectedStart })
    }
    return isWithinInterval(date, { start: selectedStart, end: selectedEnd })
  }

  const isDateStart = (date: Date) => {
    const selectedStart = tempStartDate || start
    if (!selectedStart) return false
    return isSameDay(date, selectedStart)
  }

  const isDateEnd = (date: Date) => {
    const selectedEnd = tempEndDate || end
    if (!selectedEnd) return false
    return isSameDay(date, selectedEnd)
  }

  const formatDisplayDate = () => {
    if (!start || !end) return "בחר תאריכים"
    
    if (selectedPreset !== "custom") {
      const presetLabels: Record<PresetType, string> = {
        today: "היום",
        yesterday: "אתמול",
        week: "השבוע",
        month: "החודש",
        year: "השנה",
        last7days: "7 ימים אחרונים",
        last30days: "30 ימים אחרונים",
        custom: "מותאם אישית",
      }
      return presetLabels[selectedPreset] || "מותאם אישית"
    }
    
    if (isSameDay(start, end)) {
      return format(start, "dd/MM/yyyy", { locale: he })
    }
    
    return `${format(start, "dd/MM/yyyy", { locale: he })} - ${format(end, "dd/MM/yyyy", { locale: he })}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-right font-normal",
            !start && !end && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="ml-2 h-4 w-4" />
          {formatDisplayDate()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" dir="rtl">
        <div className="flex">
          {/* Quick Presets */}
          <div className="border-l p-3 space-y-1 min-w-[140px]">
            <div className="text-sm font-semibold mb-2">אפשרויות מהירות</div>
            {[
              { value: "today", label: "היום" },
              { value: "yesterday", label: "אתמול" },
              { value: "week", label: "השבוע" },
              { value: "month", label: "החודש" },
              { value: "year", label: "השנה" },
              { value: "last7days", label: "7 ימים אחרונים" },
              { value: "last30days", label: "30 ימים אחרונים" },
            ].map((preset: any) => (
              <button
                key={preset.value}
                onClick={() => applyPreset(preset.value as PresetType)}
                className={cn(
                  "w-full text-right px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors",
                  selectedPreset === preset.value && "bg-accent font-medium"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: he })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                disabled={currentMonth >= new Date()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day: any) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground w-8">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="w-8 h-8" />
                }

                const isSelected = isDateSelected(date)
                const isInRange = isDateInRange(date)
                const isStart = isDateStart(date)
                const isEnd = isDateEnd(date)
                const isToday = isSameDay(date, new Date())
                const isPast = date < startOfDay(new Date())

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateClick(date)}
                    disabled={isPast && !isSelected}
                    className={cn(
                      "w-8 h-8 text-sm rounded-md transition-colors",
                      isToday && "font-bold border border-primary",
                      isPast && !isSelected && "text-muted-foreground opacity-50",
                      isSelected && "bg-primary text-primary-foreground",
                      isInRange && !isSelected && "bg-accent",
                      isStart && "rounded-r-none",
                      isEnd && "rounded-l-none",
                      !isStart && !isEnd && isInRange && "rounded-none",
                      !isSelected && !isInRange && "hover:bg-accent"
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            {(tempStartDate || tempEndDate) && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempStartDate(null)
                    setTempEndDate(null)
                  }}
                >
                  איפוס
                </Button>
                <Button
                  size="sm"
                  onClick={applyCustomDates}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  החל
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}


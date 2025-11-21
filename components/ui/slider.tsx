"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
  step?: number
  className?: string
}

export function Slider({ value, onValueChange, max = 100, step = 1, className }: SliderProps) {
  const currentValue = value[0] || 0
  const percentage = Math.min(100, Math.max(0, (currentValue / max) * 100))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)])
  }

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)} dir="ltr">
      {/* הערה: אני מכריח dir="ltr" על הקומפוננטה הזו ספציפית כדי שהלוגיקה של הדפדפן (0 משמאל, 100 מימין) תעבוד רגיל.
          אנחנו נהפוך את זה ויזואלית אם צריך, אבל לרוב סליידרים עובדים משמאל לימין (נמוך לגבוה) גם בעברית כשזה מספרים.
          אם רוצים שה-0 יהיה מימין וה-100 משמאל (כיוון עברית מלא), צריך לשנות את הלוגיקה.
          
          כרגע בתמונה ששלחת: 0 היה מימין (RTL) אבל הבר הירוק היה הפוך.
          כדי לסדר את זה הכי פשוט: נשאיר את זה ב-LTR (שמאל=0, ימין=100) שזה הסטנדרט הבינלאומי גם באתרים בעברית למספרים.
      */}
      
      <div className="relative w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {/* Range Track */}
        <div 
          className="absolute h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-150 ease-out left-0" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Native Range Input */}
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      {/* Custom Thumb Visual */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-emerald-500 bg-white shadow-md pointer-events-none transition-all duration-150 ease-out"
        style={{ 
            left: `calc(${percentage}% - 10px)` 
        }}
      />
    </div>
  )
}

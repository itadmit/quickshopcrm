"use client"

interface Badge {
  text: string
  color: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  discount?: number
}

interface ProductBadgesProps {
  badges?: Badge[]
  isSoldOut?: boolean
  comparePrice?: number
  price?: number
}

export function ProductBadges({ badges = [], isSoldOut, comparePrice, price }: ProductBadgesProps) {
  // קיבוץ מדבקות לפי מיקום
  const badgesByPosition: Record<string, Badge[]> = {
    "top-left": [],
    "top-right": [],
    "bottom-left": [],
    "bottom-right": []
  }

  // הוספת SOLD OUT badge אם המוצר אזל
  if (isSoldOut) {
    badgesByPosition["top-right"].push({
      text: "אזל מהמלאי",
      color: "#ef4444", // red-500
      position: "top-right"
    })
  }

  // הוספת discount badge אם יש מחיר לפני הנחה
  if (comparePrice && price && comparePrice > price) {
    const discount = Math.round(((comparePrice - price) / comparePrice) * 100)
    badgesByPosition["top-left"].push({
      text: `-${discount}%`,
      color: "#ef4444",
      position: "top-left",
      discount
    })
  }

  // חלוקת המדבקות המותאמות אישית לפי מיקום
  badges.forEach(badge => {
    badgesByPosition[badge.position].push(badge)
  })

  const positionClasses = {
    "top-left": "top-2 left-2 items-start",
    "top-right": "top-2 right-2 items-end",
    "bottom-left": "bottom-2 left-2 items-start",
    "bottom-right": "bottom-2 right-2 items-end"
  }

  return (
    <>
      {Object.entries(badgesByPosition).map(([position, positionBadges]) => {
        if (positionBadges.length === 0) return null

        return (
          <div
            key={position}
            className={`absolute ${positionClasses[position as keyof typeof positionClasses]} flex flex-col gap-1.5 z-10`}
          >
            {positionBadges.map((badge, index) => (
              <div
                key={index}
                className="px-2.5 py-1 rounded-md text-white text-xs font-bold shadow-lg backdrop-blur-sm"
                style={{ 
                  backgroundColor: badge.color,
                  opacity: 0.95
                }}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}


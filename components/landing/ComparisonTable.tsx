import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, Zap } from "lucide-react"

export function ComparisonTable() {
  const comparisons = [
    {
      feature: "Variant Info בכל אירוע",
      quickshop: true,
      shopify: "partial",
      description: "מידע מלא על מידה, צבע וכל variant בכל אירוע"
    },
    {
      feature: "AddToWishlist עם Variant",
      quickshop: true,
      shopify: false,
      description: "מעקב מדויק אחרי מה הלקוחות רוצים"
    },
    {
      feature: "RemoveFromWishlist עם Variant",
      quickshop: true,
      shopify: false,
      description: "הבנה מדויקת של התנהגות לקוחות"
    },
    {
      feature: "SelectVariant אירוע נפרד",
      quickshop: true,
      shopify: false,
      description: "מעקב אחרי כל בחירת variant"
    },
    {
      feature: "ViewCart עם Variants מלא",
      quickshop: true,
      shopify: "partial",
      description: "רואים בדיוק מה בעגלה"
    },
    {
      feature: "מניעת כפילויות ב-React",
      quickshop: true,
      shopify: false,
      description: "Tracking נקי ללא רעש"
    },
    {
      feature: "Server-Side Tracking",
      quickshop: true,
      shopify: true,
      description: "Conversion API לכל הפלטפורמות"
    },
    {
      feature: "14 אירועי Tracking",
      quickshop: true,
      shopify: "partial",
      description: "מעקב מלא אחרי כל פעולה"
    },
  ]

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-100 text-emerald-600 text-sm px-4 py-2">
            השוואה מפורטת
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            בואו נשווה לפלטפורמות אחרות
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            המתחרים שלנו (כן כן, אפילו Shopify) - בואו נראה מה ההבדלים
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-hidden rounded-2xl border-2 border-gray-200 shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50 to-indigo-50">
                <th className="p-6 text-right font-semibold text-gray-900 text-lg border-b-2 border-gray-200">
                  תכונה
                </th>
                <th className="p-6 text-center border-b-2 border-gray-200">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl font-bold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>קוויק שופ</span>
                    <Badge className="text-white" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>המערכת שלנו</Badge>
                  </div>
                </th>
                <th className="p-6 text-center border-b-2 border-gray-200">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl font-bold text-gray-500">פלטפורמות אחרות</span>
                    <Badge variant="outline" className="text-gray-500">לדוגמה: Shopify</Badge>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {comparisons.map((item, index) => (
                <tr 
                  key={index} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index === comparisons.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="p-6">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{item.feature}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    {item.quickshop === true ? (
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-sm font-medium text-yellow-600">חלקי</span>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    {item.shopify === true ? (
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    ) : item.shopify === "partial" ? (
                      <span className="text-sm font-medium text-yellow-600">חלקי</span>
                    ) : (
                      <X className="h-8 w-8 text-red-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
              
              {/* Price Row - Highlighted */}
              <tr className="bg-gradient-to-r from-green-50 to-emerald-50">
                <td className="p-6">
                  <div>
                    <div className="font-bold text-gray-900 text-lg mb-1">מחיר חודשי</div>
                    <div className="text-sm text-gray-600">לחבילה המקבילה</div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div>
                    <div className="text-4xl font-bold text-green-600">₪99</div>
                    <div className="text-sm text-gray-500 mt-1">חבילת Quick Shop</div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div>
                    <div className="text-4xl font-bold text-gray-400">$79</div>
                    <div className="text-sm text-gray-500 mt-1">(~₪290)</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {comparisons.map((item, index) => (
            <div key={index} className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-md">
              <h3 className="font-bold text-lg mb-2">{item.feature}</h3>
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <div className="text-xs text-emerald-600 font-semibold mb-2">קוויק שופ</div>
                  {item.quickshop === true ? (
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                  ) : (
                    <span className="text-xs font-medium text-yellow-600">חלקי</span>
                  )}
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 font-semibold mb-2">אחרים</div>
                  {item.shopify === true ? (
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                  ) : item.shopify === "partial" ? (
                    <span className="text-xs font-medium text-yellow-600">חלקי</span>
                  ) : (
                    <X className="h-6 w-6 text-red-500 mx-auto" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Winner Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 rounded-full px-8 py-4 shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>
            <Zap className="h-6 w-6 text-yellow-300" />
            <span className="font-bold text-lg">
              קוויק שופ - יותר תכונות, מחיר טוב יותר 💪
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}


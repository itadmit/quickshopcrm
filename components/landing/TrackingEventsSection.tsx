import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Eye,
  MousePointerClick,
  Heart,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  Users,
  Search,
  BarChart3,
} from "lucide-react"

export function TrackingEventsSection() {
  const events = [
    { 
      icon: Eye, 
      title: "PageView", 
      desc: "מעקב אחרי כל צפייה בעמוד",
      color: "text-blue-600 bg-blue-50"
    },
    { 
      icon: Eye, 
      title: "ViewContent", 
      desc: "צפייה במוצר עם variant מלא",
      color: "text-purple-600 bg-purple-50",
      featured: true
    },
    { 
      icon: MousePointerClick, 
      title: "SelectVariant", 
      desc: "בחירת variant ספציפי (מידה/צבע)",
      color: "text-indigo-600 bg-indigo-50",
      featured: true
    },
    { 
      icon: Heart, 
      title: "AddToWishlist", 
      desc: "הוספה למועדפים + variant",
      color: "text-pink-600 bg-pink-50",
      featured: true
    },
    { 
      icon: Heart, 
      title: "RemoveFromWishlist", 
      desc: "הסרה ממועדפים + variant",
      color: "text-rose-600 bg-rose-50"
    },
    { 
      icon: ShoppingCart, 
      title: "AddToCart", 
      desc: "הוספה לעגלה + variant מלא",
      color: "text-green-600 bg-green-50",
      featured: true
    },
    { 
      icon: ShoppingCart, 
      title: "RemoveFromCart", 
      desc: "הסרה מעגלה + variant",
      color: "text-orange-600 bg-orange-50"
    },
    { 
      icon: ShoppingCart, 
      title: "ViewCart", 
      desc: "צפייה בעגלה מלאה עם כל הפריטים",
      color: "text-teal-600 bg-teal-50"
    },
    { 
      icon: CreditCard, 
      title: "InitiateCheckout", 
      desc: "תחילת תהליך תשלום",
      color: "text-yellow-600 bg-yellow-50",
      featured: true
    },
    { 
      icon: CreditCard, 
      title: "AddPaymentInfo", 
      desc: "הזנת פרטי תשלום",
      color: "text-amber-600 bg-amber-50"
    },
    { 
      icon: CheckCircle, 
      title: "Purchase", 
      desc: "רכישה מוצלחת + כל הפריטים",
      color: "text-emerald-600 bg-emerald-50",
      featured: true
    },
    { 
      icon: Users, 
      title: "SignUp", 
      desc: "הרשמת משתמש חדש",
      color: "text-cyan-600 bg-cyan-50"
    },
    { 
      icon: Users, 
      title: "Login", 
      desc: "התחברות משתמש",
      color: "text-sky-600 bg-sky-50"
    },
    { 
      icon: Search, 
      title: "Search", 
      desc: "חיפוש מוצרים + תוצאות",
      color: "text-violet-600 bg-violet-50"
    },
  ]

  return (
    <section className="py-20 lg:py-28" style={{ backgroundColor: '#fbf2e3' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 text-sm px-4 py-2 text-white" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>
            <BarChart3 className="h-4 w-4 inline ml-1" />
            Tracking מתקדם
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            14 אירועי Tracking מלאים
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            מעקב אחרי <strong>כל פעולה אפשרית</strong> עם פרטי Variant מלאים.
            <br />
            זה מה שהופך קמפיינים טובים למצוינים.
          </p>
          
          {/* Key Benefits */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="bg-white rounded-full px-6 py-3 shadow-md border" style={{ borderColor: '#d7a695' }}>
              <span className="text-sm font-semibold" style={{ color: '#8b5784' }}>✓ כל האירועים עם Variant ID</span>
            </div>
            <div className="bg-white rounded-full px-6 py-3 shadow-md border" style={{ borderColor: '#d7a695' }}>
              <span className="text-sm font-semibold" style={{ color: '#8b5784' }}>✓ Server-Side + Client-Side</span>
            </div>
            <div className="bg-white rounded-full px-6 py-3 shadow-md border" style={{ borderColor: '#d7a695' }}>
              <span className="text-sm font-semibold" style={{ color: '#8b5784' }}>✓ ללא כפילויות</span>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {events.map((event, index) => (
            <Card 
              key={index} 
              className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              style={event.featured ? { 
                borderWidth: '2px', 
                borderColor: '#d7a695',
                background: 'linear-gradient(135deg, white 0%, #fbf2e3 100%)'
              } : {
                borderColor: '#e5e7eb'
              }}
            >
              <CardContent className="p-6">
                <div className={`w-14 h-14 rounded-xl ${event.color} flex items-center justify-center mb-4`}>
                  <event.icon className={`h-7 w-7 ${event.color.split(' ')[0]}`} />
                </div>
                
                <h3 className="font-bold text-lg mb-2 text-gray-900">
                  {event.title}
                  {event.featured && (
                    <span className="mr-2 text-xs text-white px-2 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>חדש</span>
                  )}
                </h3>
                
                <p className="text-sm text-gray-600 leading-relaxed">{event.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Code Example */}
        <div className="mt-16 rounded-2xl p-8 shadow-2xl" style={{ background: 'linear-gradient(135deg, #213054 0%, #213054 100%)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-xl">דוגמה: AddToCart Event</h3>
            <Badge className="text-white" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>Live Data</Badge>
          </div>
          
          <div className="bg-black/50 rounded-lg p-6 font-mono text-sm overflow-x-auto">
            <pre className="text-green-400">
{`{
  "event": "AddToCart",
  "content_name": "נעל נייק - 39 / אפור",
  "content_ids": ["variant_cmi5t9jlj001b13an3qzlg25q"],
  "content_type": "product",
  "value": 150,
  "currency": "ILS",
  "variant_id": "cmi5t9jlj001b13an3qzlg25q",
  "variant_name": "39 / אפור",
  "quantity": 1
}`}
            </pre>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-gray-300 text-sm">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: '#d7a695' }} />
            <span>נשלח אוטומטית ל-Facebook, Google, TikTok ו-Instagram</span>
          </div>
        </div>
      </div>
    </section>
  )
}


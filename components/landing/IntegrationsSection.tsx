import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Globe, Zap } from "lucide-react"

export function IntegrationsSection() {
  const platforms = [
    {
      name: "Facebook Pixel",
      logo: (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      features: ["Conversion API", "Pixel SDK", "Product Catalog"],
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      name: "Google Analytics 4",
      logo: (
        <svg className="h-10 w-10" viewBox="0 0 24 24">
          <path fill="#E37400" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      features: ["GA4 Events", "GTM Support", "Enhanced Ecommerce"],
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      name: "TikTok Pixel",
      logo: (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      ),
      features: ["Events API", "Pixel SDK", "Product Feed"],
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300"
    },
    {
      name: "Instagram Shopping",
      logo: (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
          <defs>
            <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#833AB4" }} />
              <stop offset="50%" style={{ stopColor: "#E1306C" }} />
              <stop offset="100%" style={{ stopColor: "#FCAF45" }} />
            </linearGradient>
          </defs>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      features: ["Shopping Tags", "Stories", "Product Catalog"],
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    },
  ]

  const benefits = [
    {
      title: "כל האירועים נשלחים אוטומטית",
      desc: "לא צריך לדאוג - המערכת שולחת הכל לכל הפלטפורמות"
    },
    {
      title: "Server-Side Tracking",
      desc: "עובד גם עם Conversion API לדיוק מקסימלי ומעקב חסין ad-blockers"
    },
    {
      title: "פרטי Variant מלאים",
      desc: "כל פלטפורמה מקבלת את כל המידע על המוצר והווריאנט"
    },
    {
      title: "קמפיינים חכמים יותר",
      desc: "Facebook, Google ו-TikTok יכולים לייעל את הקמפיינים בצורה מדויקת יותר"
    },
    {
      title: "ROI גבוה יותר",
      desc: "tracking מדויק = פחות בזבוז תקציב = יותר רווח ללקוחות שלכם"
    },
    {
      title: "דיווחים מדויקים",
      desc: "הלקוחות שלכם רואים בדיוק מה עובד ומה לא"
    },
  ]

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-100 text-emerald-600 text-sm px-4 py-2">
            <Globe className="h-4 w-4 inline ml-1" />
            אינטגרציות
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            התממשקות מושלמת לכל הפלטפורמות
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            כל האירועים נשלחים אוטומטית לכל הפלטפורמות עם <strong>אותם הנתונים</strong>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Platforms Cards */}
          <div className="space-y-4">
            {platforms.map((platform, index) => (
              <Card key={index} className={`border-2 ${platform.borderColor} ${platform.bgColor} hover:shadow-xl transition-all duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-md">
                      {platform.logo}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{platform.name}</h3>
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {platform.features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benefits List */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold mb-6">מה זה אומר בשבילך?</h3>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 bg-gradient-to-r from-emerald-50 to-white p-5 rounded-xl border border-emerald-100 hover:shadow-lg transition-shadow">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-lg mb-1">{benefit.title}</h4>
                  <p className="text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Flow Visualization */}
        <div className="rounded-3xl p-8 lg:p-12 text-white shadow-2xl" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>
          <div className="text-center mb-10">
            <Zap className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
            <h3 className="text-3xl font-bold mb-3">תהליך אוטומטי 100%</h3>
            <p className="text-emerald-100 text-lg">לקוח מבצע פעולה ← המערכת שלנו תופסת ← נשלח לכל הפלטפורמות מיד</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="mb-3">
                <Zap className="h-10 w-10 text-yellow-300 mx-auto" />
              </div>
              <div className="text-xl font-bold mb-2">שליחה מיידית</div>
              <div className="text-sm text-emerald-100">לכל הפלטפורמות בו-אמנית</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="mb-3">
                <CheckCircle className="h-10 w-10 text-green-300 mx-auto" />
              </div>
              <div className="text-xl font-bold mb-2">עיבוד אוטומטי</div>
              <div className="text-sm text-emerald-100">המרה לפורמט כל פלטפורמה</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="mb-3">
                <Globe className="h-10 w-10 text-blue-300 mx-auto" />
              </div>
              <div className="text-xl font-bold mb-2">אירוע מתרחש</div>
              <div className="text-sm text-emerald-100">AddToCart, Purchase, etc</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


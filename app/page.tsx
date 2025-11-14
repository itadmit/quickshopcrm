import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, Store, Package, CreditCard, BarChart3, Globe } from "lucide-react"

export default function HomePage() {
  const features = [
    {
      icon: Zap,
      title: "הקמה תוך דקות",
      description: "צור חנות אונליין מקצועית תוך דקות ספורות",
    },
    {
      icon: Store,
      title: "עיצוב מותאם אישית",
      description: "בחר מתוך תבניות מקצועיות והתאם למותג שלך",
    },
    {
      icon: Package,
      title: "ניהול מוצרים קל",
      description: "הוסף, ערוך ונהל מוצרים בממשק אינטואיטיבי",
    },
    {
      icon: CreditCard,
      title: "תשלומים מאובטחים",
      description: "קבל תשלומים דרך PayPlus, Stripe ועוד",
    },
    {
      icon: BarChart3,
      title: "דוחות ואנליטיקה",
      description: "עקוב אחר מכירות, לקוחות והכנסות",
    },
    {
      icon: Globe,
      title: "תמיכה בעברית מלאה",
      description: "מערכת בעברית עם תמיכה מלאה ב-RTL",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white" dir="rtl">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Quick Shop
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">התחברות</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                התחל בחינם
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            צור חנות אונליין
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              תוך דקות ספורות
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            פלטפורמה מתקדמת לבניית חנויות אונליין - ללא צורך בידע טכני
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-lg px-8 py-6">
                התחל בחינם
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                כניסה למערכת
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">למה לבחור ב-Quick Shop?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">מוכן להתחיל?</h3>
          <p className="text-xl mb-8 opacity-90">
            הצטרף אלינו עוד היום והתחל למכור אונליין
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6">
              צור חנות בחינם
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2024 Quick Shop. כל הזכויות שמורות.</p>
        </div>
      </footer>
    </div>
  )
}

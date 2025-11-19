import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Rocket, CheckCircle, TrendingUp, ArrowLeft } from "lucide-react"

export function MarketersHero() {
  return (
    <section className="relative overflow-hidden bg-white py-24 lg:py-32">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(135deg, #fbf2e3 0%, white 100%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-right">
            <Badge className="mb-6 text-white text-sm px-4 py-2 border-0" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>
              למשווקים ומומחי פרסום
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-gray-900">
              הפלטפורמה הישראלית
              <span className="block text-transparent bg-clip-text" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
                שמשנה את חוקי המשחק
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl mb-8 leading-relaxed text-gray-600">
              <strong className="text-gray-900">14 אירועי tracking מתקדמים</strong> • התממשקות מושלמת לפייסבוק, גוגל וטיקטוק • 
              <strong className="text-gray-900">פרטי Variant מלאים בכל אירוע</strong> • מערכת משפיעניות מובנית
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 h-auto shadow-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}
                >
                  <Rocket className="ml-2 h-6 w-6" />
                  התחילו להרוויח היום
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 text-lg px-8 py-6 h-auto font-semibold hover:bg-gray-50"
                style={{ borderColor: '#8b5784', color: '#8b5784' }}
              >
                צפו בהדגמה
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#8b5784' }} />
                <span className="text-sm text-gray-700">ללא עלויות</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#8b5784' }} />
                <span className="text-sm text-gray-700">עמלות גבוהות</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#8b5784' }} />
                <span className="text-sm text-gray-700">תמיכה 24/7</span>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="relative">
            <div className="rounded-3xl p-8 lg:p-10 border-2 shadow-2xl" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)', borderColor: '#d7a695' }}>
              <div className="space-y-6 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">הכנסות חודשיות ממוצעות</span>
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                
                <div>
                  <div className="text-5xl font-bold mb-2">₪15,000+</div>
                  <div className="text-sm text-white/90">לשותף ממוצע</div>
                </div>

                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-white/80 animate-pulse" />
                </div>

                <div className="pt-6 border-t border-white/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/90">לקוחות פעילים</span>
                    <span className="text-2xl font-bold">+250</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/90">שיעור המרה</span>
                    <span className="text-2xl font-bold">3.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/90">ROI ממוצע</span>
                    <span className="text-2xl font-bold">+280%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center gap-2 text-sm text-white/90">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    <span>1,247 משווקים פעילים כרגע</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements - Simplified */}
            <div className="absolute -top-4 -right-4 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>
              +32% החודש
            </div>
            <div className="absolute -bottom-4 -left-4 px-4 py-2 rounded-full text-sm font-bold shadow-lg" style={{ backgroundColor: '#fbf2e3', color: '#213054' }}>
              דירוג 4.9★
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Rocket, CheckCircle, ArrowLeft } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 lg:py-32 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #8b5784 0%, #d7a695 100%)' }}>
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(139, 87, 132, 0.5), transparent)' }} />
      
      {/* Animated Circles */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(139, 87, 132, 0.2)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(215, 166, 149, 0.2)', animationDelay: '1s' }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-6 py-3 mb-8">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: '#fbf2e3' }} />
          <span className="text-sm font-semibold">1,247 משווקים פעילים כרגע</span>
        </div>

        {/* Main Heading */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          מוכנים להתחיל להרוויח?
        </h2>
        
        <p className="text-xl lg:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          הצטרפו לאלפי משווקים שכבר מרוויחים מהמערכת <strong className="text-white">הטובה ביותר בישראל</strong>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-5 justify-center mb-12">
          <Link href="/register">
            <Button size="lg" className="bg-white hover:bg-gray-100 shadow-2xl text-lg px-10 py-7 h-auto font-bold" style={{ color: '#8b5784' }}>
              <Rocket className="ml-2 h-6 w-6" />
              הצטרפו עכשיו בחינם
            </Button>
          </Link>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-white text-white hover:bg-white/10 text-lg px-10 py-7 h-auto font-bold backdrop-blur-sm"
          >
            צפו בהדגמה חיה
            <ArrowLeft className="mr-2 h-5 w-5" />
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 border-t border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6" style={{ color: '#fbf2e3' }} />
            <span className="text-lg">ללא עלויות התחלה</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6" style={{ color: '#fbf2e3' }} />
            <span className="text-lg">אישור מיידי</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6" style={{ color: '#fbf2e3' }} />
            <span className="text-lg">תמיכה 24/7</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold mb-2">2,400+</div>
            <div className="text-sm" style={{ color: 'rgba(251, 242, 227, 0.9)' }}>לקוחות פעילים</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold mb-2">₪8.2M</div>
            <div className="text-sm" style={{ color: 'rgba(251, 242, 227, 0.9)' }}>עמלות ששולמו</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold mb-2">4.9★</div>
            <div className="text-sm" style={{ color: 'rgba(251, 242, 227, 0.9)' }}>דירוג ממוצע</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold mb-2">98%</div>
            <div className="text-sm" style={{ color: 'rgba(251, 242, 227, 0.9)' }}>שביעות רצון</div>
          </div>
        </div>
      </div>
    </section>
  )
}


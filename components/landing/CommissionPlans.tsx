import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, DollarSign, TrendingUp, Zap, Crown } from "lucide-react"

export function CommissionPlans() {
  const plans = [
    {
      id: 1,
      name: "CPA - הצטרפות",
      icon: Zap,
      amount: "₪100-195",
      period: "לכל לקוח חדש",
      description: "תשלום חד פעמי מיידי",
      features: [
        "תשלום מיידי עם הרשמת הלקוח",
        "ללא מינימום לקוחות",
        "מושלם למשווקים מתחילים",
        "העמלה גדלה עם הביצועים שלכם"
      ],
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      buttonColor: "bg-blue-600 hover:bg-blue-700"
    },
    {
      id: 2,
      name: "CPA Mark Up",
      icon: Crown,
      amount: "עד ₪500",
      period: "לכל לקוח - אתם קובעים",
      description: "שליטה מלאה בתמחור",
      features: [
        "אתם קובעים את דמי הפתיחה",
        "ההפרש בין המחיר שלכם לשלנו הולך אליכם",
        "אידיאלי לסוכנויות ומשווקי שותפים",
        "אפשרות לבניית מודל עסקי ייחודי"
      ],
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-300",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      popular: true
    },
    {
      id: 3,
      name: "Revenue Share",
      icon: TrendingUp,
      amount: "2%-10%",
      period: "חודשי, קבוע, לתמיד",
      description: "הכנסה פסיבית חודשית",
      features: [
        "הכנסה חודשית קבועה מכל לקוח",
        "ללא הגבלת זמן - כל עוד הלקוח פעיל",
        "מינימום 100+ לקוחות פעילים",
        "בניית עסק יציב עם תזרים מזומנים קבוע"
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      buttonColor: "bg-green-600 hover:bg-green-700"
    }
  ]

  const whoCanJoin = [
    { emoji: "💻", title: "מפתחי אתרים", desc: "הוסיפו ערך ללקוחות" },
    { emoji: "🎨", title: "מעצבים", desc: "חלק מהפרויקט" },
    { emoji: "📱", title: "משווקים דיגיטליים", desc: "כלי חובה ללקוחות" },
    { emoji: "🏢", title: "סוכנויות", desc: "שירות נוסף" },
    { emoji: "🎓", title: "בלוגרים", desc: "תוכן + המלצה" },
    { emoji: "👨‍💼", title: "יועצי עסקים", desc: "פתרון מושלם" },
    { emoji: "📊", title: "מומחי אנליטיקס", desc: "אופטימיזציה" },
    { emoji: "🎯", title: "כולם", desc: "יש קהל? תרוויחו" }
  ]

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-600 text-sm px-4 py-2">
            <DollarSign className="h-4 w-4 inline ml-1" />
            תוכניות עמלה
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            3 דרכים להרוויח איתנו
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            בחרו את התוכנית המתאימה לכם ולסגנון העבודה שלכם
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                plan.popular ? 'border-4 border-purple-400 scale-105' : 'border-2'
              } ${plan.borderColor}`}
            >
              {/* Gradient Header */}
              <div className={`h-2 bg-gradient-to-r ${plan.color}`} />
              
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-6 left-6 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg z-10">
                  הכי פופולרי 🔥
                </div>
              )}

              <CardContent className={`p-8 ${plan.bgColor}`}>
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <plan.icon className="h-8 w-8 text-white" />
                </div>

                {/* Title & Amount */}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className={`text-4xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                    {plan.amount}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{plan.period}</p>
                <p className="text-sm text-gray-500 mb-6 font-medium">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button className={`w-full ${plan.buttonColor} text-white text-lg py-6`}>
                  {plan.id === 3 ? "צרו קשר" : "התחילו עכשיו"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Calculator Section */}
        <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl border-2 border-purple-200 mb-20">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold mb-4">חשבו כמה תרוויחו</h3>
            <p className="text-gray-600 text-lg">דוגמאות אמיתיות מהשטח</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="text-4xl mb-3">🚀</div>
              <div className="text-sm text-gray-600 mb-2">משווק מתחיל</div>
              <div className="text-3xl font-bold text-blue-600 mb-4">₪3,500</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>5 לקוחות חדשים</span>
                  <span className="font-semibold">₪700</span>
                </div>
                <div className="flex justify-between">
                  <span>CPA @ ₪140</span>
                  <span className="font-semibold">₪700</span>
                </div>
                <div className="flex justify-between">
                  <span>Mark Up ממוצע</span>
                  <span className="font-semibold">₪2,800</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-300 scale-105 shadow-xl">
              <div className="text-4xl mb-3">💼</div>
              <div className="text-sm text-gray-600 mb-2">סוכנות קטנה</div>
              <div className="text-3xl font-bold text-purple-600 mb-4">₪15,200</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>15 לקוחות חדשים</span>
                  <span className="font-semibold">₪2,250</span>
                </div>
                <div className="flex justify-between">
                  <span>CPA @ ₪150</span>
                  <span className="font-semibold">₪2,250</span>
                </div>
                <div className="flex justify-between">
                  <span>Mark Up ממוצע</span>
                  <span className="font-semibold">₪12,950</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-sm text-gray-600 mb-2">שותף VIP</div>
              <div className="text-3xl font-bold text-green-600 mb-4">₪48,000</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>120 לקוחות פעילים</span>
                  <span className="font-semibold">₪48,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue Share @ 5%</span>
                  <span className="font-semibold">חודשי</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 font-bold">הכנסה פסיבית!</span>
                  <span className="font-semibold">∞</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">* חישובים משוערים בהתבסס על נתונים ממשיים של שותפים קיימים</p>
          </div>
        </div>

        {/* Who Can Join */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">מי יכול להצטרף?</h2>
          <p className="text-xl text-gray-600 mb-10">כולם! באמת.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {whoCanJoin.map((item, index) => (
            <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-gray-200">
              <CardContent className="p-5">
                <div className="text-4xl mb-2">{item.emoji}</div>
                <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}


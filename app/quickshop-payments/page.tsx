'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import { 
  CreditCard, 
  ShieldCheck, 
  Smartphone, 
  ArrowLeft, 
  CheckCircle, 
  Zap, 
  TrendingUp, 
  RefreshCw, 
  Lock, 
  Globe, 
  Wallet,
  PieChart
} from "lucide-react"

function BlackFridayBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (contentRef.current) {
        // Calculate width of one set (4 items repeated 4 times = 16 items total per set)
        // We have 2 sets, so divide by 2
        const width = contentRef.current.scrollWidth / 2;
        setContentWidth(width);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const bannerItems = [
    { en: "SALE BLACK FRIDAY", he: "מחירי השקה בלעדיים - לזמן מוגבל בלבד" },
    { en: "LIMITED TIME OFFER", he: "הזדמנות חד פעמית - רק עכשיו" },
    { en: "EXCLUSIVE LAUNCH PRICES", he: "מחירי השקה בלעדיים - לזמן מוגבל בלבד" },
    { en: "SALE BLACK FRIDAY", he: "הזדמנות חד פעמית - רק עכשיו" },
  ];

  const renderBannerItem = (item: typeof bannerItems[0], key: string) => (
    <div key={key} className="flex items-center gap-8 flex-shrink-0">
      <span className="text-yellow-400 font-black text-2xl md:text-3xl tracking-wider">
        {item.en}
      </span>
      <span className="text-white text-lg md:text-xl font-bold">
        {item.he}
      </span>
      <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
    </div>
  );

  // Calculate smooth scroll-based offset with infinite loop
  const scrollSpeed = 0.2; // Slower, smoother movement
  const baseOffset = scrollPosition * scrollSpeed;
  
  // Create infinite loop: when we reach the end of first copy, loop back seamlessly
  // Using modulo creates seamless loop since we have duplicate content
  const loopedOffset = contentWidth > 0 ? baseOffset % contentWidth : baseOffset;

  return (
    <section 
      ref={bannerRef}
      className="relative overflow-hidden bg-gradient-to-r from-black via-gray-900 to-black py-4 border-y-2 border-yellow-500"
    >
      <div className="relative flex">
        <div 
          ref={contentRef}
          className="flex items-center gap-8 whitespace-nowrap"
          style={{
            transform: `translateX(${-loopedOffset}px)`,
            willChange: 'transform'
          }}
        >
          {/* First copy */}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy1-${i}`))}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy1-dup-${i}`))}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy1-dup2-${i}`))}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy1-dup3-${i}`))}
          {/* Second copy for seamless infinite loop */}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy2-${i}`))}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy2-dup-${i}`))}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy2-dup2-${i}`))}
          {bannerItems.map((item, i) => renderBannerItem(item, `copy2-dup3-${i}`))}
        </div>
      </div>
    </section>
  );
}

export default function QuickShopPaymentsPage() {
  // Calculator State
  const [revenue, setRevenue] = useState([15000]);
  
  // Form State
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: ''
  });

  // Calculations
  const calculateFees = (monthlyRevenue: number) => {
    const tier1 = monthlyRevenue * 0.034; // Free + 3.4%
    const tier2 = 99; // 99 ללקוחות עם מסוף קיים - עמלה קבועה בלבד
    const tier3 = monthlyRevenue * 0.010; // הכל כלול - 1% בלבד (עמלת הקמה חד-פעמית)
    
    const savingVsTier1 = tier1 - tier3;
    
    return { tier1, tier2, tier3, savingVsTier1 };
  };

  const fees = calculateFees(revenue[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/quickshop-payments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, revenue: revenue[0] }),
      });

      if (res.ok) {
        toast({
          title: "הפרטים נשלחו בהצלחה!",
          description: "נחזור אליך בקרוב עם עדכונים.",
          className: "bg-green-50 border-green-200 text-green-800"
        });
        setFormData({ name: '', email: '', phone: '', website: '' });
      } else {
        toast({
          title: "אירעה שגיאה",
          description: "לא הצלחנו לשלוח את הפרטים. אנא נסה שנית.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "אירעה שגיאה",
        description: "אנא בדוק את החיבור לאינטרנט ונסה שוב.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex flex-col overflow-visible">
              <h1 className="text-2xl font-pacifico text-gray-900 whitespace-nowrap overflow-visible" style={{ letterSpacing: '2px', lineHeight: '1.5' }}>
                Quick Shop
              </h1>
              <p className="text-xs text-emerald-600 font-bold tracking-wider whitespace-nowrap">PAYMENTS</p>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#benefits" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">יתרונות</a>
              <a href="#pricing" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">מסלולים</a>
              <a href="#calculator" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">מחשבון חיסכון</a>
            </nav>

            <div className="flex items-center gap-4">
              <Button 
                onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-emerald-900 hover:bg-emerald-800 text-white rounded-full px-6 font-bold shadow-lg transition-all border-0"
              >
                הצטרפות להמתנה
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-right z-10">
              <Badge className="mb-6 bg-emerald-100 text-emerald-800 border-emerald-200 px-4 py-1.5 text-sm font-medium rounded-full">
                בקרוב ב-Quick Shop
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight text-gray-900">
                תשכחו מחברות אשראי.
                <span className="text-emerald-600 block mt-2">Quick Shop Payments כאן.</span>
              </h1>
              
              <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                אין צורך לעשות סקר שוק בחברות האשראי. קבלו תשלומים בקלות דרכנו, עם חוויית סליקה חלקה שמגדילה המרות ב-15%.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
                  size="lg" 
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-14 text-lg font-bold shadow-xl shadow-emerald-200"
                >
                  אני רוצה להצטרף ראשון
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Button>
              </div>

              <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm font-medium text-gray-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  PCI DSS Level 1
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  כל סוגי הכרטיסים
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-emerald-500" />
                  Bit, Apple Pay & Google Pay
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative lg:h-[600px] w-full flex items-center justify-center">
               <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-100 rounded-full filter blur-3xl opacity-40 animate-pulse" />
               <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-200 rounded-full filter blur-3xl opacity-40 animate-pulse delay-700" />
               
               <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md w-full transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                 <div className="flex items-center justify-between mb-8">
                   <div className="text-gray-900 font-bold text-xl">תשלום מאובטח</div>
                   <div className="flex gap-2">
                     <div className="h-8 w-12 bg-white rounded border border-gray-100 flex items-center justify-center p-1">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1000px-Visa_Inc._logo.svg.png" alt="VISA" className="w-full h-full object-contain" />
                     </div>
                     <div className="h-8 w-12 bg-white rounded border border-gray-100 flex items-center justify-center p-1">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1024px-MasterCard_Logo.svg.png" alt="Mastercard" className="w-full h-full object-contain" />
                     </div>
                     <div className="h-8 w-12 bg-white rounded border border-gray-100 flex items-center justify-center p-1">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/American_Express_logo.svg/1200px-American_Express_logo.svg.png" alt="AMEX" className="w-full h-full object-contain" />
                     </div>
                   </div>
                 </div>

                 <div className="space-y-4 mb-8">
                   <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 border border-emerald-100">
                     <div className="bg-white p-2 rounded-lg shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/he/thumb/e/eb/Bit_logo_2024.svg/1200px-Bit_logo_2024.svg.png" alt="Bit" className="w-6 h-6 object-contain" />
                     </div>
                     <div>
                       <div className="font-bold text-gray-900">Bit</div>
                       <div className="text-xs text-emerald-600">תשלום מהיר</div>
                     </div>
                     <div className="mr-auto">
                       <CheckCircle className="w-5 h-5 text-emerald-500" />
                     </div>
                   </div>
                   
                   <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 border border-emerald-100">
                     <div className="bg-white p-2 rounded-lg shadow-sm">
                        <img src="https://cdn2.downdetector.com/static/uploads/logo/apple-pay.png" alt="Apple Pay" className="w-6 h-6 object-contain" />
                     </div>
                     <div>
                       <div className="font-bold text-gray-900">Apple Pay</div>
                       <div className="text-xs text-emerald-600">מופעל אוטומטית</div>
                     </div>
                     <div className="mr-auto">
                       <CheckCircle className="w-5 h-5 text-emerald-500" />
                     </div>
                   </div>
                   
                   <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 border border-emerald-100">
                     <div className="bg-white p-2 rounded-lg shadow-sm">
                        <img src="https://storage.googleapis.com/gweb-uniblog-publish-prod/images/GooglePayLogo.width-500.format-webp.webp" alt="Google Pay" className="w-6 h-6 object-contain" />
                     </div>
                     <div>
                       <div className="font-bold text-gray-900">Google Pay</div>
                       <div className="text-xs text-emerald-600">מופעל אוטומטית</div>
                     </div>
                     <div className="mr-auto">
                       <CheckCircle className="w-5 h-5 text-emerald-500" />
                     </div>
                   </div>
                 </div>

                 <div className="bg-emerald-600 rounded-xl p-4 text-white text-center font-bold shadow-lg shadow-emerald-200">
                    שילם ₪249.00 בהצלחה
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section id="benefits" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">למה כולם עוברים ל-Quick Shop Payments?</h2>
            <p className="text-lg text-gray-500">
              הפסקנו את הטרטור מול חברות האשראי. הכל במקום אחד, פשוט וקל.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
             <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-emerald-100 hover:shadow-lg transition-all">
               <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                 <TrendingUp className="w-8 h-8 text-emerald-600" />
               </div>
               <h3 className="text-xl font-bold mb-3 text-gray-900">אחוזי המרה גבוהים יותר</h3>
               <p className="text-gray-500 leading-relaxed">
                 הלקוח נשאר באתר שלכם ולא מועבר לדף חיצוני. חוויית תשלום חלקה שמגדילה מכירות ב-15% בממוצע.
               </p>
             </div>

             <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-emerald-100 hover:shadow-lg transition-all">
               <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                 <RefreshCw className="w-8 h-8 text-emerald-600" />
               </div>
               <h3 className="text-xl font-bold mb-3 text-gray-900">החזרים כספיים בקליק</h3>
               <p className="text-gray-500 leading-relaxed">
                 צריכים לזכות לקוח? עושים את זה ישירות מתוך ההזמנה בקוויק שופ. לא צריך להיכנס למערכת נפרדת ולחפש עסקאות.
               </p>
             </div>

             <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-emerald-100 hover:shadow-lg transition-all">
               <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                 <PieChart className="w-8 h-8 text-emerald-600" />
               </div>
               <h3 className="text-xl font-bold mb-3 text-gray-900">דוחות וניהול במקום אחד</h3>
               <p className="text-gray-500 leading-relaxed">
                 כל המידע הפיננסי שלכם מסונכרן אוטומטית עם ההזמנות. בלי אקסלים ובלי התאמות בסוף החודש.
               </p>
             </div>
          </div>
        </div>
      </section>

      {/* Black Friday Banner */}
      <BlackFridayBanner />

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#0B1120] text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px]" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-6 px-4 py-1.5 text-sm font-medium hover:bg-emerald-500/20">
              המסלולים שלנו
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              שקיפות מלאה. <span className="text-emerald-400">בלי הפתעות.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              בחרו את המסלול שמתאים לגודל העסק שלכם.
              <br/>
              העמלות מחליפות את חברת האשראי והמסוף.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
            {/* Tier 1 - לא סלקת לא שילמת */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 flex flex-col hover:bg-slate-800/60 transition-all duration-300 group">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">לא סלקת לא שילמת</h3>
                <p className="text-slate-400 text-sm">ללא התחייבות חודשית</p>
              </div>
              
              <div className="mb-8 pb-8 border-b border-slate-700/50">
                <div className="flex items-baseline mb-3">
                  <span className="text-5xl font-bold text-white tracking-tight">₪0</span>
                  <span className="text-slate-400 mr-2 font-medium">/ חודש + מע״מ</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg border border-slate-600/30">
                   <span className="text-white font-bold">₪299</span>
                   <span className="text-slate-400 text-sm">דמי הקמה חד פעמיים + מע״מ</span>
                </div>
              </div>
              
              <div className="mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-center">
                <span className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-medium">עמלת סליקה</span>
                <span className="text-3xl font-bold text-white">3.4% <span className="text-sm">+ מע״מ</span></span>
              </div>
              
              <ul className="space-y-4 text-sm text-slate-300 flex-grow">
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  לא סלקת - לא שילמת
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  הקמה מיידית 24-48 שעות !
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  סליקת כל כרטיסי האשראי
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  חשבוניות מס אוטומטיות בתוספת 29₪
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  תשלום ב-Bit, Apple Pay, Google Pay
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  תמיכה טלפונית במוקד שירות
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  תמיכה אינטרנטית במוקד שירות
                </li>
              </ul>

              <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-300 text-xs font-bold text-center">הקמת 3D ללא עלות + 1.5₪ לעסקה

</p>
              </div>
              
              <Button className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl h-12 font-medium transition-all" variant="secondary">
                בחר מסלול זה
              </Button>
            </div>

            {/* Tier 2 - רק סליקה */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 flex flex-col hover:bg-slate-800/60 transition-all duration-300 group relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">רק סליקה</h3>
                <p className="text-slate-400 text-sm">ללקוחות עם מסוף קיים</p>
              </div>
              
              <div className="mb-8 pb-8 border-b border-slate-700/50">
                <div className="flex items-baseline mb-3">
                  <span className="text-5xl font-bold text-white tracking-tight">₪99</span>
                  <span className="text-slate-400 mr-2 font-medium">/ חודש + מע״מ</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg border border-slate-600/30">
                   <span className="text-white font-bold">₪249</span>
                   <span className="text-slate-400 text-sm">דמי הקמה חד פעמיים + מע״מ</span>
                </div>
              </div>
              
              <div className="mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-center">
                <span className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-medium">עמלת סליקה</span>
                <span className="text-xl font-bold text-white">לפי המסוף שלך</span>
              </div>
              
              <ul className="space-y-4 text-sm text-slate-300 flex-grow">
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  חיבור למסוף קיים
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  תמיכה טלפונית במוקד שירות
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  תמיכה אינטרנטית במוקד שירות
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  סליקת כל כרטיסי האשראי
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  חשבוניות מס אוטומטיות בתוספת 29₪
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  תשלום ב-Bit, Apple Pay, Google Pay
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  הקמה מיידית 24-48 שעות !
                </li>
              </ul>

              <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-300 text-xs font-bold text-center">הקמת 3D ללא עלות + 1.5₪ לעסקה

</p>
              </div>

              <Button className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl h-12 font-medium transition-all" variant="secondary">
                בחר מסלול זה
              </Button>
            </div>

            {/* Tier 3 - הכל כלול PRO */}
            <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-6 shadow-2xl shadow-emerald-500/10 z-10">
              <div className="absolute top-4 left-4">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" /> מומלץ
                </span>
              </div>
              
              <div className="mb-6 pt-2">
                <h3 className="text-2xl font-bold text-white mb-2">הכל כלול PRO</h3>
                <p className="text-emerald-200/80 text-sm">הפתרון המלא לעסקים</p>
              </div>
              
              <div className="mb-8 pb-8 border-b border-slate-800">
                <div className="flex items-baseline mb-3">
                   <span className="text-5xl font-bold text-white tracking-tight">₪59</span>
                   <span className="text-slate-400 mr-2 font-medium text-lg">/ חודש + מע״מ</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                   <span className="text-emerald-300 font-bold">₪199</span>
                   <span className="text-emerald-200/60 text-sm">דמי הקמה חד פעמיים + מע״מ</span>
                </div>
              </div>
              
              <div className="mb-8 bg-gradient-to-b from-emerald-900/40 to-emerald-950/40 p-6 rounded-2xl border border-emerald-500/20 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <span className="block text-xs text-emerald-200/80 mb-1 uppercase tracking-wider font-bold relative z-10">עמלת סליקה בלבד</span>
                <span className="text-4xl font-bold text-white relative z-10">1.0% <span className="text-sm">+ מע״מ</span></span>
                <span className="block text-xs text-emerald-200/50 mt-2 relative z-10">הכי משתלם בישראל</span>
              </div>
              
              <ul className="space-y-4 text-sm text-slate-200 flex-grow">
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-medium">הקמת מסוף חדש</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-medium">סליקת כל כרטיסי האשראי</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  חשבוניות מס אוטומטיות בתוספת 29₪
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  תשלום ב-Bit, Apple Pay, Google Pay
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-medium">הקמה מיידית 24-48 שעות !</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  תמיכה טלפונית במוקד שירות
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  תמיכה אינטרנטית במוקד שירות
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-slate-900">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-medium">ממשק ניהול מתקדם</span>
                </li>
              </ul>

              <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-300 text-xs font-bold text-center">הקמת 3D ללא עלות + 1.5₪ לעסקה

</p>
              </div>

              <Button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl h-14 font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all">
                אני רוצה את המסלול הזה
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">כמה תחסכו עם מסלול PRO?</h2>
                <p className="text-gray-500">גררו את הסליידר כדי לראות את העלות החודשית לפי מחזור המכירות שלכם</p>
              </div>

              <div className="mb-12">
                <div className="flex justify-between mb-4">
                  <span className="font-bold text-gray-700">מחזור חודשי:</span>
                  <span className="font-bold text-2xl text-emerald-600">₪{revenue[0].toLocaleString()}</span>
                </div>
                <Slider
                  value={revenue}
                  onValueChange={setRevenue}
                  max={100000}
                  step={1000}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2" dir="ltr">
                  <span>₪0</span>
                  <span>₪50,000</span>
                  <span>₪100,000+</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                  <div className="text-sm text-gray-500 mb-2">לא סלקת לא שילמת (3.4%)</div>
                  <div className="text-2xl font-bold text-gray-900">₪{Math.round(fees.tier1).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                  <div className="text-sm text-gray-500 mb-2">רק סליקה (₪99/חודש)</div>
                  <div className="text-2xl font-bold text-gray-900">₪{Math.round(fees.tier2).toLocaleString()}</div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl text-center border border-emerald-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl">הכל כלול</div>
                  <div className="text-sm text-emerald-800 font-bold mb-2">הכל כלול (1% בלבד)</div>
                  <div className="text-3xl font-bold text-emerald-600">₪{Math.round(fees.tier3).toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-8 bg-gray-900 text-white p-6 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="font-bold text-lg">החיסכון השנתי שלך במסלול הכל כלול:</div>
                    <div className="text-xs text-gray-400">לעומת מסלול לא סלקת לא שילמת</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-yellow-400">
                  ₪{Math.round(fees.savingVsTier1 * 12).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all">
            <img src="https://upload.wikimedia.org/wikipedia/he/thumb/e/eb/Bit_logo_2024.svg/1200px-Bit_logo_2024.svg.png" alt="Bit" className="h-10 object-contain" />
            <img src="https://cdn2.downdetector.com/static/uploads/logo/apple-pay.png" alt="Apple Pay" className="h-12 object-contain" />
            <img src="https://storage.googleapis.com/gweb-uniblog-publish-prod/images/GooglePayLogo.width-500.format-webp.webp" alt="Google Pay" className="h-12 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1000px-Visa_Inc._logo.svg.png" alt="VISA" className="h-8 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1024px-MasterCard_Logo.svg.png" alt="Mastercard" className="h-10 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/American_Express_logo.svg/1200px-American_Express_logo.svg.png" alt="AMEX" className="h-8 object-contain" />
            <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1">
              <ShieldCheck className="w-5 h-5 text-gray-500" />
              <span className="font-bold text-gray-500">PCI DSS Level 1</span>
            </div>
        </div>
      </section>

      {/* Registration Form */}
      <section id="register" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">הצטרפו לרשימת ההמתנה</h2>
            <p className="text-gray-500">
              אנחנו פותחים את השירות בהדרגה. הירשמו עכשיו כדי לקבל עדיפות ולהיות הראשונים שמתחילים לסלוק.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא *</Label>
                <Input 
                  id="name" 
                  required 
                  className="h-12 bg-gray-50"
                  placeholder="ישראל ישראלי"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון *</Label>
                <Input 
                  id="phone" 
                  required 
                  className="h-12 bg-gray-50"
                  placeholder="050-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">אימייל *</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                className="h-12 bg-gray-50"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">כתובת החנות (אופציונלי)</Label>
              <Input 
                id="website" 
                className="h-12 bg-gray-50"
                placeholder="https://myshop.co.il"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'שריון מקום ברשימת ההמתנה'}
            </Button>

            <p className="text-xs text-center text-gray-400 mt-4">
              * בלחיצה על הכפתור אני מאשר קבלת עדכונים על השקת השירות.
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-100 text-center text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Quick Shop Payments. כל הזכויות שמורות.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/" className="hover:text-emerald-600">חזרה לאתר הראשי</Link>
            <Link href="/terms" className="hover:text-emerald-600">תנאי שימוש</Link>
            <Link href="/privacy" className="hover:text-emerald-600">פרטיות</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

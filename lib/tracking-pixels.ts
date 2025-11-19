/**
 * לוגיקה לשליחת אירועים לכל הפלטפורמות
 */

interface TrackingEvent {
  event: string
  [key: string]: any
}

/**
 * שליחת אירוע לפייסבוק פיקסל
 */
export function sendFacebookPixelEvent(
  pixelId: string,
  event: TrackingEvent,
  accessToken?: string
) {
  if (typeof window === "undefined") return

  // שליחה דרך Facebook Pixel SDK
  if ((window as any).fbq) {
    const { event: eventName, ...params } = event
    
    // המרת שם אירוע לפורמט של פייסבוק
    const fbEventName = convertToFacebookEvent(eventName)
    console.log(`📊 [FB Pixel] ${fbEventName}`, params)
    
    if (fbEventName === "PageView") {
      (window as any).fbq("track", "PageView", params)
    } else if (fbEventName === "ViewContent") {
      (window as any).fbq("track", "ViewContent", {
        content_name: params.content_name,
        content_ids: params.content_ids,
        content_type: params.content_type,
        value: params.value,
        currency: params.currency,
      })
    } else if (fbEventName === "AddToCart") {
      (window as any).fbq("track", "AddToCart", {
        content_name: params.content_name,
        content_ids: params.content_ids,
        content_type: params.content_type,
        value: params.value,
        currency: params.currency,
      })
    } else if (fbEventName === "InitiateCheckout") {
      (window as any).fbq("track", "InitiateCheckout", {
        value: params.value,
        currency: params.currency,
        num_items: params.num_items,
      })
    } else if (fbEventName === "Purchase") {
      (window as any).fbq("track", "Purchase", {
        value: params.value,
        currency: params.currency,
        contents: params.contents,
      })
    } else {
      // אירועים אחרים
      (window as any).fbq("trackCustom", eventName, params)
    }
  } else {
    // טעינת Facebook Pixel SDK אם לא נטען
    loadFacebookPixel(pixelId)
  }
}

/**
 * שליחת אירוע לגוגל טאג מנג'ר
 */
export function sendGTMEvent(containerId: string, event: TrackingEvent) {
  if (typeof window === "undefined") return

  if ((window as any).dataLayer) {
    const { event: eventName, ...rest } = event as { event: string; [key: string]: any }
    console.log(`📊 [GTM] ${eventName}`, rest)
    ;(window as any).dataLayer.push({
      event: eventName,
      ...rest,
    })
  } else {
    // טעינת GTM אם לא נטען
    loadGTM(containerId)
  }
}

/**
 * שליחת אירוע לגוגל אנליטיקס
 */
export function sendGAEvent(
  measurementId: string,
  event: TrackingEvent,
  apiSecret?: string
) {
  if (typeof window === "undefined") return

  // שליחה דרך gtag
  if ((window as any).gtag) {
    const { event: eventName, ...params } = event
    console.log(`📊 [GA] ${eventName}`, params)
    ;(window as any).gtag("event", eventName, params)
  } else {
    // טעינת Google Analytics אם לא נטען
    loadGoogleAnalytics(measurementId)
  }
}

/**
 * שליחת אירוע לטיקטוק פיקסל
 */
export function sendTikTokPixelEvent(
  pixelId: string,
  event: TrackingEvent,
  accessToken?: string
) {
  if (typeof window === "undefined") return

  if ((window as any).ttq) {
    const { event: eventName, ...params } = event
    
    // המרת שם אירוע לפורמט של טיקטוק
    const ttEventName = convertToTikTokEvent(eventName)
    console.log(`📊 [TikTok Pixel] ${ttEventName}`, params)
    
    ;(window as any).ttq.track(ttEventName, params)
  } else {
    // טעינת TikTok Pixel SDK אם לא נטען
    loadTikTokPixel(pixelId)
  }
}

/**
 * המרת שם אירוע לפורמט של פייסבוק
 */
function convertToFacebookEvent(eventName: string): string {
  const mapping: Record<string, string> = {
    PageView: "PageView",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout",
    Purchase: "Purchase",
    Search: "Search",
    SignUp: "CompleteRegistration",
    Login: "Login",
  }
  return mapping[eventName] || eventName
}

/**
 * המרת שם אירוע לפורמט של טיקטוק
 */
function convertToTikTokEvent(eventName: string): string {
  const mapping: Record<string, string> = {
    PageView: "ViewContent",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout",
    Purchase: "CompletePayment",
    Search: "Search",
    SignUp: "CompleteRegistration",
    Login: "Login",
  }
  return mapping[eventName] || eventName
}

/**
 * טעינת Facebook Pixel SDK
 */
function loadFacebookPixel(pixelId: string) {
  if (typeof window === "undefined") return

  // טעינת script
  const script = document.createElement("script")
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
  `
  document.head.appendChild(script)
}

/**
 * טעינת Google Tag Manager
 */
function loadGTM(containerId: string) {
  if (typeof window === "undefined") return

  // טעינת script
  const script = document.createElement("script")
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `
  document.head.appendChild(script)

  // יצירת dataLayer אם לא קיים
  if (!(window as any).dataLayer) {
    ;(window as any).dataLayer = []
  }
}

/**
 * טעינת Google Analytics
 */
function loadGoogleAnalytics(measurementId: string) {
  if (typeof window === "undefined") return

  // טעינת script
  const script1 = document.createElement("script")
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  script1.async = true
  document.head.appendChild(script1)

  const script2 = document.createElement("script")
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `
  document.head.appendChild(script2)
}

/**
 * טעינת TikTok Pixel SDK
 */
function loadTikTokPixel(pixelId: string) {
  if (typeof window === "undefined") return

  // טעינת script
  const script = document.createElement("script")
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
    }(window, document, 'ttq');
  `
  document.head.appendChild(script)
}


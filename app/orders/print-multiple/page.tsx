"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

interface OrderItem {
  id: string
  name: string
  sku: string | null
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    images: string[]
  } | null
  variant: {
    id: string
    name: string
  } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  fulfillmentStatus: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  shippingAddress: any
  billingAddress: any | null
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  paymentMethod: string | null
  transactionId: string | null
  paidAt: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
  notes: string | null
  couponCode: string | null
  customFields: any | null
  createdAt: string
  updatedAt: string
  shop: {
    id: string
    name: string
    settings: any | null
    taxEnabled: boolean
  }
  customer: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
  } | null
  items: OrderItem[]
}

export default function PrintMultipleOrdersPage() {
  const searchParams = useSearchParams()
  const orderNumbers = searchParams.get('orders')?.split(',').filter(Boolean) || []
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderNumbers.length === 0) {
      setLoading(false)
      return
    }

    const fetchOrders = async () => {
      try {
        const promises = orderNumbers.map(orderNumber =>
          fetch(`/api/orders/${orderNumber}`).then(res => res.json())
        )
        const fetchedOrders = await Promise.all(promises)
        setOrders(fetchedOrders.filter(order => order && !order.error))
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [orderNumbers.join(',')])

  useEffect(() => {
    if (!loading && orders.length > 0) {
      // המתן קצת לפני הדפסה כדי שהדף יטען
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [loading, orders.length])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>טוען הזמנות...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <p>לא נמצאו הזמנות להדפסה</p>
      </div>
    )
  }

  const shopSettings = orders[0]?.shop?.settings as any
  const showTaxInCart = shopSettings?.showTaxInCart ?? false

  const printStyles = `
    @media print {
      @page {
        size: A4;
        margin: 1cm;
      }
      body * {
        visibility: hidden;
      }
      .print-container, .print-container * {
        visibility: visible;
      }
      .print-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      .print-order {
        page-break-after: always;
      }
      .print-order:last-child {
        page-break-after: auto;
      }
    }
    @media screen {
      body {
        background: #f5f5f5;
      }
    }
    .print-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: white;
    }
    .print-order {
      margin-bottom: 40px;
    }
    .print-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #000;
    }
    .print-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .print-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .print-section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .print-table th {
      text-align: right;
      padding: 10px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      font-weight: bold;
    }
    .print-table td {
      text-align: right;
      padding: 10px;
      border: 1px solid #ddd;
    }
    .print-summary {
      margin-top: 20px;
      text-align: left;
    }
    .print-summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .print-total {
      font-size: 18px;
      font-weight: bold;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    .print-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 15px;
    }
    .print-info-item {
      margin-bottom: 10px;
    }
    .print-label {
      font-weight: bold;
      color: #666;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .print-value {
      font-size: 13px;
    }
  `

  const getStatusInfo = (statusKey: string) => {
    const statusTranslations: Record<string, string> = {
      PENDING: "ממתין",
      CONFIRMED: "מאושר",
      PAID: "שולם",
      PROCESSING: "מעובד",
      SHIPPED: "נשלח",
      DELIVERED: "נמסר",
      CANCELLED: "בוטל",
      REFUNDED: "הוחזר",
    }
    return statusTranslations[statusKey.toUpperCase()] || statusKey
  }

  const renderOrder = (order: Order, index: number) => {
    return (
      <div key={order.id} className="print-order" dir="rtl">
        <div className="print-header">
          <div className="print-title">הזמנה #{order.orderNumber}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            נוצרה ב-{new Date(order.createdAt).toLocaleDateString('he-IL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            } as any)}
          </div>
        </div>

        <div className="print-section">
          <div className="print-section-title">פריטים בהזמנה</div>
          <table className="print-table">
            <thead>
              <tr>
                <th>מוצר</th>
                <th>כמות</th>
                <th>מחיר יחידה</th>
                <th>סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{item.name || item.product?.name}</div>
                    {item.variant && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <strong>וריאציה:</strong> {item.variant.name}
                      </div>
                    )}
                    {item.sku && (
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>מקט: {item.sku}</div>
                    )}
                    {item.product && item.product.name && item.product.name !== item.name && (
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                        מוצר: {item.product.name}
                      </div>
                    )}
                  </td>
                  <td>{item.quantity}</td>
                  <td>₪{item.price.toFixed(2)}</td>
                  <td style={{ fontWeight: 'bold' }}>₪{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-summary">
            <div className="print-summary-row">
              <span>סכום ביניים:</span>
              <span>₪{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="print-summary-row">
              <span>משלוח:</span>
              <span>₪{order.shipping.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="print-summary-row" style={{ color: '#16a34a' }}>
                <span>הנחה:</span>
                <span>-₪{order.discount.toFixed(2)}</span>
              </div>
            )}
            {showTaxInCart && order.tax > 0 && (
              <div className="print-summary-row">
                <span>מע"מ:</span>
                <span>₪{order.tax.toFixed(2)}</span>
              </div>
            )}
            {order.couponCode && (
              <div className="print-summary-row">
                <span>קוד קופון:</span>
                <span style={{ fontWeight: 'bold' }}>{order.couponCode}</span>
              </div>
            )}
            {showTaxInCart && order.tax > 0 && (
              <div className="print-summary-row">
                <span>מע"מ:</span>
                <span>₪{order.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="print-summary-row print-total">
              <span>סה"כ:</span>
              <span>₪{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="print-info-grid">
          <div className="print-section">
            <div className="print-section-title">פרטי לקוח</div>
            <div className="print-info-item">
              <div className="print-label">שם</div>
              <div className="print-value">{order.customerName}</div>
            </div>
            <div className="print-info-item">
              <div className="print-label">אימייל</div>
              <div className="print-value">{order.customerEmail}</div>
            </div>
            {order.customerPhone && (
              <div className="print-info-item">
                <div className="print-label">טלפון</div>
                <div className="print-value">{order.customerPhone}</div>
              </div>
            )}
          </div>

          {order.shippingAddress && (
            <div className="print-section">
              <div className="print-section-title">כתובת משלוח</div>
              {Object.entries(order.shippingAddress).map(([key, value]: [string, any]) => {
                if (!value || key === 'id') return null
                return (
                  <div key={key} className="print-info-item">
                    <div className="print-value">
                      {value}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="print-info-grid">
          <div className="print-section">
            <div className="print-section-title">פרטי תשלום</div>
            {order.paymentMethod && (
              <div className="print-info-item">
                <div className="print-label">שיטת תשלום</div>
                <div className="print-value">{order.paymentMethod}</div>
              </div>
            )}
            {order.transactionId && (
              <div className="print-info-item">
                <div className="print-label">מזהה עסקה</div>
                <div className="print-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {order.transactionId}
                </div>
              </div>
            )}
            {order.paidAt && (
              <div className="print-info-item">
                <div className="print-label">תאריך תשלום</div>
                <div className="print-value">
                  {new Date(order.paidAt).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="print-section">
            <div className="print-section-title">מצב הזמנה</div>
            <div className="print-info-item">
              <div className="print-label">סטטוס</div>
              <div className="print-value">{getStatusInfo(order.status)}</div>
            </div>
            {order.fulfillmentStatus && (
              <div className="print-info-item">
                <div className="print-label">סטטוס משלוח</div>
                <div className="print-value">
                  {getStatusInfo(order.fulfillmentStatus)}
                </div>
              </div>
            )}
            {order.shippingMethod && (
              <div className="print-info-item">
                <div className="print-label">שיטת משלוח</div>
                <div className="print-value">{order.shippingMethod}</div>
              </div>
            )}
            {order.trackingNumber && (
              <div className="print-info-item">
                <div className="print-label">מספר מעקב</div>
                <div className="print-value">{order.trackingNumber}</div>
              </div>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="print-section">
            <div className="print-section-title">הערות</div>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              {order.notes}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-container" dir="rtl">
        {orders.map((order, index) => renderOrder(order, index))}
      </div>
    </>
  )
}


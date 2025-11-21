"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

interface SalesChartProps {
  data?: Array<{
    date: string
    sales: number
    orders: number
  }>
}

export function SalesChart({ data }: SalesChartProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Default mock data if no data provided
  const chartData = data || [
    { date: '1/11', sales: 420, orders: 3 },
    { date: '2/11', sales: 580, orders: 5 },
    { date: '3/11', sales: 350, orders: 2 },
    { date: '4/11', sales: 820, orders: 7 },
    { date: '5/11', sales: 650, orders: 4 },
    { date: '6/11', sales: 890, orders: 8 },
    { date: '7/11', sales: 1200, orders: 10 },
    { date: '8/11', sales: 950, orders: 6 },
    { date: '9/11', sales: 1100, orders: 9 },
    { date: '10/11', sales: 780, orders: 5 },
    { date: '11/11', sales: 1350, orders: 12 },
    { date: '12/11', sales: 920, orders: 7 },
    { date: '13/11', sales: 1050, orders: 8 },
    { date: '14/11', sales: 1180, orders: 10 },
  ]

  const totalSales = chartData.reduce((sum, item) => sum + item.sales, 0)
  const totalOrders = chartData.reduce((sum, item) => sum + item.orders, 0)
  const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0

  return (
    <Card className={cn("shadow-sm hover-lift", isMobile && "border-0")}>
      <CardHeader className={cn(isMobile ? "p-3" : "p-6")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("text-emerald-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
            <CardTitle className={cn(isMobile && "text-base")}>מכירות אחרונות</CardTitle>
          </div>
          <div className="text-left">
            <div className={cn("font-bold text-emerald-600", isMobile ? "text-lg" : "text-2xl")}>
              ₪{totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {totalOrders} הזמנות | ממוצע ₪{avgOrder.toFixed(0)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(isMobile ? "px-2 pb-2" : "p-6 pt-0")}>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
          <AreaChart 
            data={chartData}
            margin={isMobile ? { top: 5, right: 5, left: -15, bottom: 5 } : { top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: isMobile ? 9 : 12, fill: '#6b7280' }}
              stroke="#e5e7eb"
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: isMobile ? 9 : 12, fill: '#6b7280' }}
              stroke="#e5e7eb"
              tickLine={false}
              width={isMobile ? 35 : 50}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}K`
                }
                return `${value}`
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: isMobile ? '11px' : '13px',
                direction: 'rtl',
                padding: isMobile ? '6px 8px' : '8px 12px'
              }}
              formatter={(value: number, name: string) => [
                name === 'sales' ? `₪${value.toLocaleString()}` : value,
                name === 'sales' ? 'מכירות' : 'הזמנות'
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="sales" 
              stroke="#10b981" 
              strokeWidth={isMobile ? 2 : 3}
              fill="url(#colorSales)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}


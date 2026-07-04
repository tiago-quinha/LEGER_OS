"use client"

import React from "react"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from "recharts"

interface DashboardChartProps {
  hybridData: any[]
  activeTab: 'burn' | 'liquidity'
}

export function DashboardChart({ hybridData, activeTab }: DashboardChartProps) {
  // Safe detection of screen width on client side
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="h-[280px] md:h-[320px] w-full mt-4 md:mt-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={hybridData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.06}/>
              <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="dateLabel" 
            axisLine={false} 
            tickLine={false} 
            interval={isMobile ? 10 : 5} 
            style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            style={{ fontSize: '9px', fontFamily: 'var(--font-geist-mono)', fill: '#86868B' }} 
            tickFormatter={(val) => `€${Math.round(val)}`} 
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-card border border-border p-2 md:p-3 font-mono text-[9px] md:text-[10px] space-y-1.5 md:space-y-2 shadow-sm z-50">
                    <p className="font-bold border-b border-border pb-1 uppercase">{label}</p>
                    <div className="space-y-1">
                      <p className="flex justify-between gap-6 md:gap-8 uppercase">
                        <span>Position:</span> 
                        <span>€{(data.actualBalance ?? data.projectionBalance)?.toFixed(2)}</span>
                      </p>
                      {data.actualSpend !== null && (
                        <p className="flex justify-between gap-6 md:gap-8 opacity-60 uppercase">
                          <span>Burn:</span> 
                          <span>€{data.actualSpend.toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            }}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          />
          <Area 
            type="stepAfter" 
            dataKey={activeTab === 'liquidity' ? "actualBalance" : "actualSpend"} 
            stroke="var(--foreground)" 
            strokeWidth={2} 
            fill="url(#activeGradient)" 
            fillOpacity={1} 
            name="Active" 
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Area 
            type="monotone" 
            dataKey={activeTab === 'liquidity' ? "projectionBalance" : "projectionSpend"} 
            stroke="var(--foreground)" 
            strokeOpacity={0.5} 
            strokeWidth={1.5} 
            strokeDasharray="5 5" 
            fill="url(#projectionGradient)" 
            fillOpacity={1}
            name="Projection" 
            isAnimationActive={true}
            animationBegin={400}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

"use client"

import React from "react"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from "recharts"
import { useSystem } from "@/lib/SystemContext"

interface DashboardChartProps {
  hybridData: any[]
  activeTab: 'burn' | 'liquidity'
  onDayClick?: (dateStr: string) => void
  isPro?: boolean
}

export function DashboardChart({ hybridData, activeTab, onDayClick, isPro }: DashboardChartProps) {
  const { currencySymbol } = useSystem()
  // Safe detection of screen width on client side
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="h-[280px] md:h-[320px] w-full mt-4 md:mt-0 cursor-pointer">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={hybridData} 
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          onClick={(state: any) => {
            if (state && onDayClick) {
              let dateStr = ""
              if (state.activePayload && state.activePayload.length) {
                dateStr = state.activePayload[0].payload?.date
              } else if (state.activeTooltipIndex !== undefined && state.activeTooltipIndex >= 0) {
                const clickedData = hybridData[state.activeTooltipIndex]
                if (clickedData) {
                  dateStr = clickedData.date
                }
              }
              if (dateStr) {
                onDayClick(dateStr)
              }
            }
          }}
        >
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
            tickFormatter={(val) => `${currencySymbol}${Math.round(val)}`} 
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
                        <span>{currencySymbol}{(data.actualBalance ?? data.projectionBalance)?.toFixed(2)}</span>
                      </p>
                      {data.actualSpend !== null && (
                        <p className="flex justify-between gap-6 md:gap-8 opacity-60 uppercase">
                          <span>Burn:</span> 
                          <span>{currencySymbol}{data.actualSpend.toFixed(2)}</span>
                        </p>
                      )}
                      {isPro && data.actualBalance === null && (
                        <>
                          <p className="flex justify-between gap-6 md:gap-8 opacity-45 uppercase text-[8px]">
                            <span>Scenario Max:</span> 
                            <span>{currencySymbol}{(activeTab === 'liquidity' ? data.optimisticBalance : data.pessimisticSpend)?.toFixed(2)}</span>
                          </p>
                          <p className="flex justify-between gap-6 md:gap-8 opacity-45 uppercase text-[8px]">
                            <span>Scenario Min:</span> 
                            <span>{currencySymbol}{(activeTab === 'liquidity' ? data.pessimisticBalance : data.optimisticSpend)?.toFixed(2)}</span>
                          </p>
                        </>
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
            connectNulls={true}
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
            connectNulls={true}
            isAnimationActive={true}
            animationBegin={400}
            animationDuration={1400}
            animationEasing="ease-out"
          />
          {isPro && (
            <>
              <Area 
                type="monotone" 
                dataKey={activeTab === 'liquidity' ? "optimisticBalance" : "optimisticSpend"} 
                stroke="var(--foreground)" 
                strokeOpacity={0.15} 
                strokeWidth={1.0} 
                strokeDasharray="3 3" 
                fill="none" 
                name="Optimistic Scenario" 
                connectNulls={true}
                isAnimationActive={true}
                animationBegin={600}
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey={activeTab === 'liquidity' ? "pessimisticBalance" : "pessimisticSpend"} 
                stroke="var(--foreground)" 
                strokeOpacity={0.15} 
                strokeWidth={1.0} 
                strokeDasharray="3 3" 
                fill="none" 
                name="Pessimistic Scenario" 
                connectNulls={true}
                isAnimationActive={true}
                animationBegin={600}
                animationDuration={1500}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

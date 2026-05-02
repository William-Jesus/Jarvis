"use client"

import { cn } from "@/lib/utils"
import type { JarvisState } from "./jarvis-core"

interface CircularInterfaceProps {
  state: JarvisState
}

export function CircularInterface({ state }: CircularInterfaceProps) {
  const isActive = state !== "idle"
  const color = state === "listening" ? "0,255,255" : state === "thinking" ? "255,165,0" : state === "speaking" ? "0,255,136" : "0,200,255"

  return (
    <div className="relative h-[460px] w-[460px]">
      {/* Outer hex ring */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 460 460">
        {/* Outermost dashed ring */}
        <circle cx="230" cy="230" r="220" fill="none" stroke={`rgba(${color},0.1)`} strokeWidth="1" strokeDasharray="4 8" className={cn("transition-all duration-500", isActive && "stroke-opacity-30")} />

        {/* Rotating outer ring with markers */}
        <g style={{ transformOrigin: "230px 230px", animation: "spin 20s linear infinite" }}>
          <circle cx="230" cy="230" r="200" fill="none" stroke={`rgba(${color},0.15)`} strokeWidth="1" />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2
            const x1 = 230 + Math.cos(angle) * 196
            const y1 = 230 + Math.sin(angle) * 196
            const x2 = 230 + Math.cos(angle) * (i % 6 === 0 ? 186 : i % 2 === 0 ? 190 : 193)
            const y2 = 230 + Math.sin(angle) * (i % 6 === 0 ? 186 : i % 2 === 0 ? 190 : 193)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(${color},${i % 6 === 0 ? 0.6 : 0.3})`} strokeWidth={i % 6 === 0 ? 2 : 1} />
          })}
        </g>

        {/* Counter rotating middle ring */}
        <g style={{ transformOrigin: "230px 230px", animation: "spin 15s linear infinite reverse" }}>
          <circle cx="230" cy="230" r="170" fill="none" stroke={`rgba(${color},0.1)`} strokeWidth="1" strokeDasharray="20 10" />
          {/* Arc segments */}
          {[0, 90, 180, 270].map((angle) => (
            <path key={angle}
              d={`M ${230 + Math.cos((angle - 30) * Math.PI / 180) * 170} ${230 + Math.sin((angle - 30) * Math.PI / 180) * 170} A 170 170 0 0 1 ${230 + Math.cos((angle + 30) * Math.PI / 180) * 170} ${230 + Math.sin((angle + 30) * Math.PI / 180) * 170}`}
              fill="none" stroke={`rgba(${color},${isActive ? 0.5 : 0.2})`} strokeWidth="2" strokeLinecap="round"
            />
          ))}
        </g>

        {/* Targeting crosshair lines */}
        <line x1="30" y1="230" x2="80" y2="230" stroke={`rgba(${color},0.3)`} strokeWidth="1" />
        <line x1="380" y1="230" x2="430" y2="230" stroke={`rgba(${color},0.3)`} strokeWidth="1" />
        <line x1="230" y1="30" x2="230" y2="80" stroke={`rgba(${color},0.3)`} strokeWidth="1" />
        <line x1="230" y1="380" x2="230" y2="430" stroke={`rgba(${color},0.3)`} strokeWidth="1" />

        {/* Diagonal targeting lines */}
        {[45, 135, 225, 315].map((angle) => (
          <line key={angle}
            x1={230 + Math.cos(angle * Math.PI / 180) * 145}
            y1={230 + Math.sin(angle * Math.PI / 180) * 145}
            x2={230 + Math.cos(angle * Math.PI / 180) * 165}
            y2={230 + Math.sin(angle * Math.PI / 180) * 165}
            stroke={`rgba(${color},0.4)`} strokeWidth="1.5"
          />
        ))}

        {/* Inner ring */}
        <circle cx="230" cy="230" r="130" fill="none" stroke={`rgba(${color},${isActive ? 0.25 : 0.1})`} strokeWidth="1" />

        {/* Core ring */}
        <circle cx="230" cy="230" r="105" fill="none" stroke={`rgba(${color},${isActive ? 0.4 : 0.15})`} strokeWidth="1.5" />
        {isActive && (
          <circle cx="230" cy="230" r="105" fill="none" stroke={`rgba(${color},0.15)`} strokeWidth="8" />
        )}

        {/* Hex decoration around core */}
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const r = 130
          const x = 230 + Math.cos((angle - 90) * Math.PI / 180) * r
          const y = 230 + Math.sin((angle - 90) * Math.PI / 180) * r
          return (
            <g key={angle}>
              <circle cx={x} cy={y} r="4" fill={`rgba(${color},${isActive ? 0.8 : 0.3})`} />
              <circle cx={x} cy={y} r="7" fill="none" stroke={`rgba(${color},0.2)`} strokeWidth="1" />
            </g>
          )
        })}

        {/* Circular text */}
        <defs>
          <path id="outerTextPath" d="M 230,230 m -185,0 a 185,185 0 1,1 370,0 a 185,185 0 1,1 -370,0" />
          <path id="innerTextPath" d="M 230,230 m -148,0 a 148,148 0 1,1 296,0 a 148,148 0 1,1 -296,0" />
        </defs>
        <text fill={`rgba(${color},0.25)`} fontSize="8" fontFamily="monospace" letterSpacing="3">
          <textPath href="#outerTextPath">JARVIS NEURAL INTERFACE // STARK INDUSTRIES // SECURE CONNECTION ESTABLISHED // MARK VII //</textPath>
        </text>
        <text fill={`rgba(${color},0.15)`} fontSize="7" fontFamily="monospace" letterSpacing="2">
          <textPath href="#innerTextPath" startOffset="50%">ANALYZING // PROCESSING // MONITORING // SCANNING //</textPath>
        </text>

        {/* Active state data points */}
        {isActive && [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const r = 155
          const x = 230 + Math.cos((angle - 90) * Math.PI / 180) * r
          const y = 230 + Math.sin((angle - 90) * Math.PI / 180) * r
          return (
            <circle key={angle} cx={x} cy={y} r="2" fill={`rgba(${color},0.7)`}>
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1 + i * 0.15}s`} repeatCount="indefinite" />
            </circle>
          )
        })}
      </svg>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

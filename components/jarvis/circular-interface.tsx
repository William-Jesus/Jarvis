"use client"

import { useEffect, useState } from "react"
import type { JarvisState } from "./jarvis-core"

interface CircularInterfaceProps {
  state: JarvisState
}

export function CircularInterface({ state }: CircularInterfaceProps) {
  const isActive = state !== "idle"
  const c = state === "listening" ? "0,220,255" : state === "thinking" ? "255,165,0" : state === "speaking" ? "0,255,136" : "0,180,220"
  const [time, setTime] = useState("")
  const [temp, setTemp] = useState(36)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }))
      setTemp(v => Math.round(Math.max(34, Math.min(42, v + (Math.random() - 0.5)))))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const cx = 290, cy = 290, SIZE = 580

  // Outer block segments
  const blockCount = 80
  const blocks = Array.from({ length: blockCount }).map((_, i) => {
    const gap = 1.5
    const a1 = ((i / blockCount) * 360 - gap / 2) * (Math.PI / 180)
    const a2 = (((i + 1) / blockCount) * 360 - gap / 2 - gap) * (Math.PI / 180)
    const [ri, ro] = [310, 328]
    const pts = [
      [cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri],
      [cx + Math.cos(a2) * ri, cy + Math.sin(a2) * ri],
      [cx + Math.cos(a2) * ro, cy + Math.sin(a2) * ro],
      [cx + Math.cos(a1) * ro, cy + Math.sin(a1) * ro],
    ]
    return { d: `M${pts.map(p => p.join(",")).join("L")}Z`, hl: i % 8 === 0 }
  })

  // Dense ticks
  const ticks = Array.from({ length: 240 }).map((_, i) => {
    const a = (i / 240) * Math.PI * 2
    const major = i % 20 === 0, med = i % 10 === 0
    const ro = 302, ri = major ? 284 : med ? 290 : 295
    return { x1: cx + Math.cos(a) * ro, y1: cy + Math.sin(a) * ro, x2: cx + Math.cos(a) * ri, y2: cy + Math.sin(a) * ri, w: major ? 1.5 : med ? 1 : 0.6, op: major ? 0.85 : med ? 0.5 : 0.22 }
  })

  // Small inner squares in arcs (quadradinhos internos)
  const innerSquares = Array.from({ length: 64 }).map((_, i) => {
    const a = (i / 64) * Math.PI * 2
    const r = 186
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    const size = i % 8 === 0 ? 5 : 3
    return { x: x - size / 2, y: y - size / 2, size, op: i % 8 === 0 ? 0.7 : 0.3 }
  })

  // Second inner square ring
  const innerSquares2 = Array.from({ length: 48 }).map((_, i) => {
    const a = (i / 48) * Math.PI * 2
    const r = 175
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    const size = 2.5
    return { x: x - size / 2, y: y - size / 2, size, op: i % 6 === 0 ? 0.6 : 0.2 }
  })

  const labels = [
    { a: -90, t: "UP" }, { a: -60, t: "COMP" }, { a: -30, t: "DOCS" },
    { a: 0, t: "FREE" }, { a: 30, t: "CHAR" }, { a: 60, t: "GAME" },
    { a: 90, t: "USED" }, { a: 120, t: "CFG" }, { a: 150, t: "ON" },
    { a: 180, t: "DESK" }, { a: -150, t: "CTRL" }, { a: -120, t: "XALR" },
  ]

  const cardinals = [
    { a: 180, label: "D" }, { a: 0, label: "D" }, { a: 90, label: "D" }, { a: -90, label: "C" },
  ]

  // White glow segments on bright ring (like the white patches in the reference)
  const glowSegments = [
    { start: 200, end: 260 }, // bottom-right bright area
    { start: 80, end: 110 },
  ]

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <filter id="glow-xl" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="12" result="b1" />
            <feGaussianBlur stdDeviation="5" result="b2" />
            <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-white" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-md">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-sm">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="innerBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor={`rgba(${c},0.05)`} />
            <stop offset="70%" stopColor="rgba(0,5,15,0.85)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.95)" />
          </radialGradient>
        </defs>

        {/* Outermost faint ring */}
        <circle cx={cx} cy={cy} r="337" fill="none" stroke={`rgba(${c},0.07)`} strokeWidth="1" strokeDasharray="3 9" />

        {/* Outer block segments */}
        {blocks.map((b, i) => (
          <path key={i} d={b.d} fill={`rgba(${c},${b.hl ? 0.6 : 0.22})`} />
        ))}

        {/* Labels between blocks and ticks */}
        {labels.map(({ a, t }) => {
          const rad = a * Math.PI / 180
          const r = 274
          return (
            <text key={t} x={cx + Math.cos(rad) * r} y={cy + Math.sin(rad) * r}
              textAnchor="middle" dominantBaseline="middle"
              fill={`rgba(${c},0.55)`} fontSize="8.5" fontFamily="monospace" letterSpacing="1">{t}</text>
          )
        })}

        {/* Dense tick ring */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={`rgba(${c},${t.op})`} strokeWidth={t.w} />
        ))}

        {/* Cardinal markers D/C */}
        {cardinals.map(({ a, label }) => {
          const rad = a * Math.PI / 180
          const r = 258
          const x = cx + Math.cos(rad) * r, y = cy + Math.sin(rad) * r
          return (
            <g key={a}>
              <circle cx={x} cy={y} r="14" fill="rgba(0,0,0,0.85)" stroke={`rgba(${c},0.65)`} strokeWidth="1.5" />
              <circle cx={x} cy={y} r="19" fill="none" stroke={`rgba(${c},0.2)`} strokeWidth="1" />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fill={`rgba(${c},0.95)`} fontSize="10" fontFamily="monospace" fontWeight="bold">{label}</text>
            </g>
          )
        })}

        {/* Data readouts */}
        {[
          { a: -75, t: "29.0 G" }, { a: -105, t: "29.0 G" },
          { a: 75, t: "5.92 G" }, { a: 105, t: "5.92 G" },
          { a: 45, t: "48.22%" }, { a: 135, t: "51.78%" },
          { a: -45, t: "579.2 Kb" }, { a: -135, t: "550.2 Gb" },
        ].map(({ a, t }) => {
          const rad = a * Math.PI / 180
          const r = 238
          return <text key={a} x={cx + Math.cos(rad) * r} y={cy + Math.sin(rad) * r}
            textAnchor="middle" dominantBaseline="middle"
            fill={`rgba(${c},0.4)`} fontSize="8" fontFamily="monospace">{t}</text>
        })}

        {/* Dark background fill */}
        <circle cx={cx} cy={cy} r="220" fill="url(#innerBg)" />

        {/* ===== BRIGHT GLOW RING ===== */}
        {/* Outer blue glow spread */}
        <circle cx={cx} cy={cy} r="198" fill="none" stroke={`rgba(${c},0.18)`} strokeWidth="38" filter="url(#glow-xl)" />
        {/* Main cyan ring */}
        <circle cx={cx} cy={cy} r="198" fill="none" stroke={`rgba(${c},${isActive ? 1 : 0.8})`} strokeWidth="2.5" filter="url(#glow-xl)" />

        {/* Full white ring with cyan glow */}
        <circle cx={cx} cy={cy} r="198" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="4" filter="url(#glow-white)" />
        <circle cx={cx} cy={cy} r="198" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" />
        {/* Inner white edge */}
        <circle cx={cx} cy={cy} r="195" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {/* Outer white edge */}
        <circle cx={cx} cy={cy} r="201" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

        {/* Counter-rotating dashed ring */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin 18s linear infinite reverse" }}>
          <circle cx={cx} cy={cy} r="182" fill="none" stroke={`rgba(${c},0.35)`} strokeWidth="1.5" strokeDasharray="20 7" />
        </g>

        {/* Slowly rotating inner ring */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin 30s linear infinite" }}>
          <circle cx={cx} cy={cy} r="166" fill="none" stroke={`rgba(${c},0.18)`} strokeWidth="1" strokeDasharray="10 5" />
        </g>

        {/* === INNER SQUARES (quadradinhos) === */}
        {innerSquares.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.size} height={s.size}
            fill={`rgba(${c},${s.op})`}
            transform={`rotate(${(i / 64) * 360}, ${s.x + s.size / 2}, ${s.y + s.size / 2})`} />
        ))}

        {/* Second inner square ring */}
        {innerSquares2.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.size} height={s.size}
            fill={`rgba(${c},${s.op})`}
            transform={`rotate(${(i / 48) * 360}, ${s.x + s.size / 2}, ${s.y + s.size / 2})`} />
        ))}

        {/* Inner structural rings */}
        <circle cx={cx} cy={cy} r="144" fill="none" stroke={`rgba(${c},0.2)`} strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="128" fill="none" stroke={`rgba(${c},0.12)`} strokeWidth="1" />

        {/* Quadrant arc accents */}
        {[0, 90, 180, 270].map((deg) => {
          const s = (deg - 28) * Math.PI / 180, e = (deg + 28) * Math.PI / 180
          const r = 144
          return (
            <path key={deg}
              d={`M ${cx + Math.cos(s) * r} ${cy + Math.sin(s) * r} A ${r} ${r} 0 0 1 ${cx + Math.cos(e) * r} ${cy + Math.sin(e) * r}`}
              fill="none" stroke={`rgba(${c},${isActive ? 0.9 : 0.5})`} strokeWidth="3"
              strokeLinecap="round" filter="url(#glow-sm)" />
          )
        })}

        {/* Triangle pointers at compass points */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = deg * Math.PI / 180
          const r = 156
          const x = cx + Math.cos(rad) * r, y = cy + Math.sin(rad) * r
          const angle = deg + 90
          return (
            <polygon key={deg}
              points={`0,-5 4,4 -4,4`}
              transform={`translate(${x},${y}) rotate(${angle})`}
              fill={`rgba(${c},0.7)`} filter="url(#glow-sm)" />
          )
        })}

        {/* Inner data % labels */}
        {[
          { a: -45, t: "0%" }, { a: 45, t: "0%" }, { a: 135, t: "0%" }, { a: -135, t: "0%" },
        ].map(({ a, t }) => {
          const rad = a * Math.PI / 180
          return <text key={a} x={cx + Math.cos(rad) * 162} y={cy + Math.sin(rad) * 162}
            textAnchor="middle" dominantBaseline="middle"
            fill={`rgba(${c},0.4)`} fontSize="8" fontFamily="monospace">{t}</text>
        })}

        {/* === TIME & TEMP display inside === */}
        <text x={cx} y={cy - 105} textAnchor="middle" dominantBaseline="middle"
          fill={`rgba(${c},0.9)`} fontSize="15" fontFamily="monospace" fontWeight="bold"
          filter="url(#glow-sm)">{time}</text>
        <text x={cx} y={cy - 88} textAnchor="middle" dominantBaseline="middle"
          fill={`rgba(${c},0.5)`} fontSize="8" fontFamily="monospace">SYSTEM TIME</text>
        <text x={cx} y={cy + 98} textAnchor="middle" dominantBaseline="middle"
          fill={`rgba(${c},0.7)`} fontSize="13" fontFamily="monospace" fontWeight="bold">{temp}°C</text>
        <text x={cx} y={cy + 114} textAnchor="middle" dominantBaseline="middle"
          fill={`rgba(${c},0.4)`} fontSize="8" fontFamily="monospace">CPU TEMP</text>

        {/* Animated active dots on inner ring */}
        {isActive && Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2
          const r = 128
          return (
            <circle key={i} cx={cx + Math.cos(angle) * r} cy={cy + Math.sin(angle) * r} r="1.8"
              fill={`rgba(${c},1)`} filter="url(#glow-sm)">
              <animate attributeName="opacity" values="0.1;1;0.1" dur={`${1.5 + i * 0.08}s`} repeatCount="indefinite" />
            </circle>
          )
        })}

        {/* Long crosshair lines through entire inner area */}
        {[0, 90, 180, 270].map(deg => {
          const rad = deg * Math.PI / 180
          return (
            <g key={deg}>
              {/* Main long line */}
              <line
                x1={cx + Math.cos(rad) * 42} y1={cy + Math.sin(rad) * 42}
                x2={cx + Math.cos(rad) * 188} y2={cy + Math.sin(rad) * 188}
                stroke={`rgba(${c},0.3)`} strokeWidth="0.8" />
              {/* Triangle markers at 3 points along the line */}
              {[80, 115, 150].map(r => {
                const x = cx + Math.cos(rad) * r, y = cy + Math.sin(rad) * r
                return (
                  <polygon key={r}
                    points="0,-4 3,3 -3,3"
                    transform={`translate(${x},${y}) rotate(${deg})`}
                    fill={`rgba(${c},0.5)`} />
                )
              })}
              {/* Tick at midpoint */}
              <line
                x1={cx + Math.cos(rad + Math.PI / 2) * 4 + Math.cos(rad) * 128}
                y1={cy + Math.sin(rad + Math.PI / 2) * 4 + Math.sin(rad) * 128}
                x2={cx + Math.cos(rad - Math.PI / 2) * 4 + Math.cos(rad) * 128}
                y2={cy + Math.sin(rad - Math.PI / 2) * 4 + Math.sin(rad) * 128}
                stroke={`rgba(${c},0.6)`} strokeWidth="1.5" />
            </g>
          )
        })}

        {/* Center rings */}
        <circle cx={cx} cy={cy} r="42" fill="rgba(0,0,0,0.7)" stroke={`rgba(${c},0.3)`} strokeWidth="1" />
        <circle cx={cx} cy={cy} r="32" fill="none" stroke={`rgba(${c},0.4)`} strokeWidth="1" strokeDasharray="4 3" />
        <circle cx={cx} cy={cy} r="22" fill="rgba(0,5,15,0.8)" stroke={`rgba(${c},0.7)`} strokeWidth="1.5" />

        {/* Number in center circle */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={`rgba(${c},1)`} fontSize="14" fontFamily="monospace" fontWeight="bold"
          filter="url(#glow-sm)">{temp}</text>

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill={`rgba(${c},1)`} filter="url(#glow-md)" />
        <circle cx={cx} cy={cy} r="1.5" fill="white" />
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

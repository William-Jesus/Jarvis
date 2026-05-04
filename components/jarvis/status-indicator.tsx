"use client"

import { cn } from "@/lib/utils"
import type { JarvisState } from "./jarvis-core"
import { Mic, Brain, Volume2, Circle } from "lucide-react"

interface StatusIndicatorProps {
  state: JarvisState
  transcript: string
}

const stateConfig: Record<JarvisState, { label: string; icon: typeof Mic }> = {
  idle: { label: "Ready", icon: Circle },
  listening: { label: "Listening", icon: Mic },
  thinking: { label: "Processing", icon: Brain },
  speaking: { label: "Speaking", icon: Volume2 },
}

export function StatusIndicator({ state, transcript }: StatusIndicatorProps) {
  const config = stateConfig[state]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Status badge with inline transcript */}
      <div
        className={cn(
          "glass-panel flex max-w-sm items-center gap-3 rounded-full px-5 py-2 transition-all duration-300",
          state === "listening" && "animate-pulse-glow",
          state === "thinking" && "border-primary/50"
        )}
      >
        <div
          className={cn(
            "flex h-2.5 w-2.5 shrink-0 rounded-full",
            state === "idle" && "bg-muted-foreground",
            state === "listening" && "bg-green-400 animate-pulse",
            state === "thinking" && "bg-primary animate-pulse",
            state === "speaking" && "bg-primary"
          )}
        />
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            state === "idle" && "text-muted-foreground",
            state !== "idle" && "text-primary"
          )}
        />
        <span
          className={cn(
            "text-xs font-medium tracking-wider uppercase shrink-0",
            state === "idle" && "text-muted-foreground",
            state !== "idle" && "text-primary jarvis-text-glow"
          )}
        >
          {config.label}
        </span>
        {transcript && (
          <>
            <span className="text-primary/30 shrink-0">|</span>
            <span className="text-xs text-primary/70 italic truncate max-w-[180px]">
              {transcript}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

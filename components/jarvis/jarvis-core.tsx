"use client"

import { useState, useRef, useEffect } from "react"
import { VoiceVisualizer } from "./voice-visualizer"
import { StatusIndicator } from "./status-indicator"
import { ConversationPanel } from "./conversation-panel"
import { HudOverlay } from "./hud-overlay"
import { CircularInterface } from "./circular-interface"
import { ConversationSidebar, type SavedConversation } from "./conversation-sidebar"

export type JarvisState = "idle" | "listening" | "thinking" | "speaking"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function JarvisCore() {
  const [state, setState] = useState<JarvisState>("idle")
  const [messages, setMessages] = useState<Message[]>([])
  const [transcript, setTranscript] = useState("")
  const [textInput, setTextInput] = useState("")
  const [audioLevel, setAudioLevel] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [connected, setConnected] = useState(false)
  const [conversationId] = useState(() => crypto.randomUUID())

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const stateRef = useRef<JarvisState>("idle")
  const currentUserTranscriptRef = useRef("")
  const currentAssistantTranscriptRef = useRef("")

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    setMounted(true)
  }, [])

  const startAudioVisualizer = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext()
    analyserRef.current = audioContextRef.current.createAnalyser()
    const source = audioContextRef.current.createMediaStreamSource(stream)
    source.connect(analyserRef.current)
    analyserRef.current.fftSize = 256

    const loop = () => {
      if (!analyserRef.current) return
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(data)
      const level = data.reduce((a, b) => a + b) / data.length / 255
      setAudioLevel(level)
      animationFrameRef.current = requestAnimationFrame(loop)
    }
    animationFrameRef.current = requestAnimationFrame(loop)
  }

  const handleRealtimeEvent = (event: Record<string, unknown>) => {
    const type = event.type as string

    switch (type) {
      case "input_audio_buffer.speech_started":
        setState("listening")
        currentUserTranscriptRef.current = ""
        break

      case "input_audio_buffer.speech_stopped":
        setState("thinking")
        break

      case "conversation.item.input_audio_transcription.completed": {
        const text = (event.transcript as string) || ""
        currentUserTranscriptRef.current = text
        setTranscript(text)
        if (text.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "user",
              content: text,
              timestamp: new Date(),
            },
          ])
        }
        break
      }

      case "response.output_item.added":
        setState("thinking")
        currentAssistantTranscriptRef.current = ""
        break

      case "response.text.delta": {
        const delta = (event.delta as string) || ""
        currentAssistantTranscriptRef.current += delta
        setTranscript(currentAssistantTranscriptRef.current)
        break
      }

      case "response.function_call_arguments.done": {
        const callId = event.call_id as string
        const name = event.name as string
        const args = JSON.parse((event.arguments as string) || "{}")
        handleFunctionCall(callId, name, args)
        break
      }

      case "response.done": {
        // Try to get text from accumulated delta first, fallback to response output
        let fullText = currentAssistantTranscriptRef.current

        if (!fullText.trim()) {
          try {
            const response = event.response as Record<string, unknown>
            const output = response?.output as Array<Record<string, unknown>>
            const content = output?.[0]?.content as Array<Record<string, unknown>>
            fullText = (content?.[0]?.text as string) || ""
          } catch {}
        }

        console.log("[jarvis] response.done text:", fullText)

        if (fullText.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: fullText,
              timestamp: new Date(),
            },
          ])
          speakWithElevenLabs(fullText)
        } else {
          setState("listening")
        }
        currentAssistantTranscriptRef.current = ""
        setTranscript("")
        break
      }

      case "error":
        console.error("Realtime error:", event)
        setState("listening")
        break
    }
  }

  const handleFunctionCall = async (callId: string, name: string, args: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/jarvis/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, params: args }),
      })
      const result = await res.json()

      if (dcRef.current?.readyState === "open") {
        dcRef.current.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify(result),
          },
        }))
        dcRef.current.send(JSON.stringify({ type: "response.create" }))
      }
    } catch (error) {
      console.error("Function call error:", error)
    }
  }

  const speakWithElevenLabs = async (text: string) => {
    setState("speaking")
    try {
      const response = await fetch("/api/jarvis/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error("TTS failed")

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        setState("listening")
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        setState("listening")
      }

      await audio.play()
    } catch {
      setState("listening")
    }
  }

  const connect = async () => {
    try {
      // Get ephemeral token
      const sessionRes = await fetch("/api/jarvis/session", { method: "POST" })
      if (!sessionRes.ok) throw new Error("Failed to get session")
      const { client_secret } = await sessionRes.json()

      // Set up WebRTC
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Audio output (Jarvis speaking)
      const audioEl = document.createElement("audio")
      audioEl.autoplay = true
      audioElRef.current = audioEl
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
      }

      // Mic input
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      setMicPermission("granted")
      pc.addTrack(stream.getTracks()[0])
      startAudioVisualizer(stream)

      // Data channel for events
      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc
      dc.onmessage = (e) => handleRealtimeEvent(JSON.parse(e.data))
      dc.onopen = () => {
        setConnected(true)
        setState("listening")
      }
      dc.onclose = () => {
        setConnected(false)
        setState("idle")
      }

      // SDP negotiation
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      )

      if (!sdpRes.ok) throw new Error("SDP negotiation failed")

      const answer = { type: "answer" as RTCSdpType, sdp: await sdpRes.text() }
      await pc.setRemoteDescription(answer)
    } catch (error) {
      console.error("Connection error:", error)
      setMicPermission("denied")
    }
  }

  const sendTextMessage = (text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== "open") return

    dcRef.current.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      })
    )
    dcRef.current.send(JSON.stringify({ type: "response.create" }))
  }

  const saveConversation = async (msgs: Message[]) => {
    if (msgs.length < 2) return
    try {
      const res = await fetch("/api/jarvis/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs.slice(0, 4) }),
      })
      const { title } = await res.json()
      const conv: SavedConversation = {
        id: conversationId,
        title,
        messages: msgs.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
        createdAt: new Date().toISOString(),
      }
      const existing = JSON.parse(localStorage.getItem("jarvis_conversations") || "[]")
      const filtered = existing.filter((c: SavedConversation) => c.id !== conversationId)
      localStorage.setItem("jarvis_conversations", JSON.stringify([...filtered, conv]))
    } catch {}
  }

  const handleNewConversation = () => {
    if (messages.length > 1) saveConversation(messages)
    setMessages([])
    window.location.reload()
  }

  const handleLoadConversation = (conv: SavedConversation) => {
    setMessages(
      conv.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })) as Message[]
    )
  }

  const handleActivate = () => {
    if (!connected) {
      connect()
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim() && connected) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: textInput.trim(),
          timestamp: new Date(),
        },
      ])
      sendTextMessage(textInput.trim())
      setTextInput("")
      setState("thinking")
    }
  }

  // Auto-save when messages change
  useEffect(() => {
    if (messages.length >= 2) saveConversation(messages)
  }, [messages])

  useEffect(() => {
    if (!mounted) return
    connect()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (pcRef.current) pcRef.current.close()
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--jarvis-dark)]">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 200, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 200, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <HudOverlay state={state} />
      <ConversationSidebar onLoad={handleLoadConversation} onNew={handleNewConversation} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <StatusIndicator state={state} transcript={transcript} />
        </div>

        {micPermission === "denied" && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-panel rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Permissão do microfone é necessária.
            </p>
            <button
              onClick={connect}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
            >
              Ativar Microfone
            </button>
          </div>
        )}

        {!connected && micPermission !== "denied" && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 text-sm text-muted-foreground animate-pulse">
            Conectando ao JARVIS...
          </div>
        )}

        <div className="relative">
          <CircularInterface state={state} />
          <div className="absolute inset-0 flex items-center justify-center">
            <VoiceVisualizer
              state={state}
              audioLevel={audioLevel}
              onActivate={handleActivate}
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex flex-col">
          <ConversationPanel messages={messages} />
          <form onSubmit={handleTextSubmit} className="p-4 bg-background/80 backdrop-blur-sm border-t border-border">
            <div className="max-w-2xl mx-auto flex gap-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={connected ? "Fale ou digite uma mensagem..." : "Conectando..."}
                disabled={!connected || state === "thinking" || state === "speaking"}
                className="flex-1 px-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || !connected}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

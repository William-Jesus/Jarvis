"use client"

import { useEffect, useState } from "react"
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [registered, setRegistered] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")

  useEffect(() => {
    fetch("/api/jarvis/auth/check").then(r => r.json()).then(data => {
      if (data.authenticated) {
        router.replace("/")
      } else {
        setRegistered(data.registered)
      }
    })
  }, [router])

  const handleAuth = async () => {
    setStatus("loading")
    setMessage("")

    try {
      if (!registered) {
        // Registration flow — requires password
        const optRes = await fetch("/api/jarvis/auth/register-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        })
        if (optRes.status === 401) {
          throw new Error("Senha incorreta")
        }
        const options = await optRes.json()
        const response = await startRegistration({ optionsJSON: options })
        const verRes = await fetch("/api/jarvis/auth/register-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response, challenge: options.challenge }),
        })
        const result = await verRes.json()
        if (result.verified) {
          setStatus("success")
          setMessage("Biometria registrada.")
          setTimeout(() => router.replace("/"), 1000)
        } else {
          throw new Error("Falha no registro")
        }
      } else {
        // Authentication flow
        const optRes = await fetch("/api/jarvis/auth/login-options")
        const options = await optRes.json()
        const response = await startAuthentication({ optionsJSON: options })
        const verRes = await fetch("/api/jarvis/auth/login-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response, challenge: options.challenge }),
        })
        const result = await verRes.json()
        if (result.verified) {
          setStatus("success")
          setMessage("Acesso autorizado.")
          setTimeout(() => router.replace("/"), 800)
        } else {
          throw new Error("Autenticação falhou")
        }
      }
    } catch (e: any) {
      setStatus("error")
      const msg = e.message
      if (msg === "Senha incorreta") setMessage("Senha incorreta.")
      else if (msg?.includes("cancel")) setMessage("Cancelado.")
      else setMessage("Falha na autenticação.")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }

  if (registered === null) return null

  const isLoading = status === "loading"

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(0,200,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.1) 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
      }} />

      {/* Corner brackets */}
      {[["left-0 top-0","M0,40 L0,0 L40,0"],["right-0 top-0","M60,40 L60,0 L20,0"],["left-0 bottom-0","M0,20 L0,60 L40,60"],["right-0 bottom-0","M60,20 L60,60 L20,60"]].map(([pos, path], i) => (
        <div key={i} className={`pointer-events-none absolute ${pos} h-16 w-16`}>
          <svg viewBox="0 0 60 60" className="h-full w-full">
            <path d={path} fill="none" stroke="rgba(0,200,255,0.6)" strokeWidth="2" />
          </svg>
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="text-center">
          <div className="text-[10px] font-mono text-cyan-500/50 tracking-widest mb-1">STARK INDUSTRIES</div>
          <h1 className="text-4xl font-light font-mono tracking-[0.3em] text-cyan-400" style={{ textShadow: "0 0 20px rgba(0,200,255,0.8)" }}>
            JARVIS
          </h1>
          <div className="text-[10px] font-mono text-cyan-500/40 tracking-widest mt-1">v3.0 // SECURE ACCESS</div>
        </div>

        {/* Password field — only on registration */}
        {!registered && (
          <div className="flex flex-col gap-1 w-[220px]">
            <label className="text-[9px] font-mono text-cyan-500/50 tracking-widest uppercase">Código de acesso</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAuth()}
              disabled={isLoading}
              className="bg-transparent border border-cyan-500/30 rounded px-3 py-2 text-cyan-300 text-xs font-mono tracking-widest focus:outline-none focus:border-cyan-400/70 placeholder:text-cyan-500/20"
              placeholder="••••••••••••••••••••"
            />
          </div>
        )}

        {/* Auth button */}
        <button
          onClick={handleAuth}
          disabled={isLoading || (!registered && !password)}
          className="relative group disabled:opacity-40"
        >
          {/* Outer ring */}
          <svg width="180" height="180" className="absolute inset-0">
            <circle cx="90" cy="90" r="85" fill="none" stroke="rgba(0,200,255,0.15)" strokeWidth="1" strokeDasharray="6 6" className={isLoading ? "animate-spin" : ""} style={{ transformOrigin: "90px 90px", animationDuration: "8s" }} />
            <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(0,200,255,0.25)" strokeWidth="1" />
          </svg>

          {/* Main circle */}
          <div className={`w-[180px] h-[180px] rounded-full flex flex-col items-center justify-center gap-3 border transition-all duration-300
            ${status === "success" ? "border-green-400/60 bg-green-400/10" : ""}
            ${status === "error" ? "border-red-400/60 bg-red-400/10" : ""}
            ${status === "idle" || isLoading ? "border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400/70" : ""}
          `}>
            <svg width="52" height="52" viewBox="0 0 52 52" className={`transition-all duration-300 ${isLoading ? "animate-pulse" : "group-hover:scale-110"}`}>
              {status === "success" ? (
                <path d="M10,26 L22,38 L42,16" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <path d="M18,12 C18,12 12,16 12,26 C12,36 18,42 26,42" fill="none" stroke="rgba(0,200,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M34,12 C34,12 40,16 40,26 C40,36 34,42 26,42" fill="none" stroke="rgba(0,200,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M22,18 C22,18 18,20 18,26 C18,32 22,36 26,36" fill="none" stroke="rgba(0,200,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M30,18 C30,18 34,20 34,26 C34,32 30,36 26,36" fill="none" stroke="rgba(0,200,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="26" y1="16" x2="26" y2="38" stroke="rgba(0,200,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>

            <span className={`text-[10px] font-mono tracking-widest uppercase
              ${status === "success" ? "text-green-400" : ""}
              ${status === "error" ? "text-red-400" : ""}
              ${status === "idle" ? "text-cyan-400/70" : ""}
              ${isLoading ? "text-cyan-300 animate-pulse" : ""}
            `}>
              {isLoading ? "verificando..." : status === "success" ? "autorizado" : status === "error" ? "negado" : registered ? "autenticar" : "registrar"}
            </span>
          </div>
        </button>

        {/* Status message */}
        <div className="h-6 text-center">
          {message && (
            <p className={`text-xs font-mono tracking-wider ${status === "success" ? "text-green-400" : "text-red-400/80"}`}>
              {message}
            </p>
          )}
          {!message && (
            <p className="text-[10px] font-mono text-cyan-500/40 tracking-widest">
              {registered ? "USE FACE ID OU DIGITAL" : "INSIRA O CÓDIGO E REGISTRE"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

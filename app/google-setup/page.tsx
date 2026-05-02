"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function GoogleSetupContent() {
  const params = useSearchParams()
  const status = params.get("status")

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-[10px] font-mono text-cyan-500/50 tracking-widest">STARK INDUSTRIES</div>
        <h1 className="text-3xl font-light font-mono tracking-[0.3em] text-cyan-400" style={{ textShadow: "0 0 20px rgba(0,200,255,0.8)" }}>
          GOOGLE INTEGRATION
        </h1>

        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-green-400 font-mono text-sm tracking-wider">AUTORIZAÇÃO CONCLUÍDA</div>
            <p className="text-cyan-500/60 font-mono text-xs">Google Calendar e Gmail conectados ao JARVIS.</p>
            <a href="/" className="mt-4 px-6 py-2 border border-cyan-500/40 text-cyan-400 font-mono text-xs tracking-widest hover:border-cyan-400 transition-all">
              VOLTAR AO JARVIS
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-red-400 font-mono text-sm tracking-wider">ERRO NA AUTORIZAÇÃO</div>
            <a href="/api/jarvis/google-auth" className="mt-4 px-6 py-2 border border-cyan-500/40 text-cyan-400 font-mono text-xs tracking-widest hover:border-cyan-400 transition-all">
              TENTAR NOVAMENTE
            </a>
          </div>
        )}

        {!status && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-cyan-500/60 font-mono text-xs max-w-sm">
              Autorize o JARVIS a acessar seu Google Calendar e Gmail.
            </p>
            <a href="/api/jarvis/google-auth" className="mt-4 px-6 py-2 border border-cyan-500/40 text-cyan-400 font-mono text-xs tracking-widest hover:border-cyan-400 transition-all">
              AUTORIZAR GOOGLE
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GoogleSetupPage() {
  return (
    <Suspense>
      <GoogleSetupContent />
    </Suspense>
  )
}

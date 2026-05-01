"use client"

import { useState } from "react"

export interface SavedConversation {
  id: string
  title: string
  messages: { role: string; content: string; timestamp: string }[]
  createdAt: string
}

interface Props {
  onLoad: (conversation: SavedConversation) => void
  onNew: () => void
}

export function ConversationSidebar({ onLoad, onNew }: Props) {
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<SavedConversation[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("jarvis_conversations") || "[]")
    } catch {
      return []
    }
  })

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = conversations.filter((c) => c.id !== id)
    setConversations(updated)
    localStorage.setItem("jarvis_conversations", JSON.stringify(updated))
  }

  const handleLoad = (conv: SavedConversation) => {
    onLoad(conv)
    setOpen(false)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-secondary/80 backdrop-blur border border-border text-foreground hover:bg-secondary transition-colors"
        title="Histórico de conversas"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative w-72 h-full bg-background/95 backdrop-blur border-r border-border flex flex-col z-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Histórico</h2>
              <button
                onClick={onNew}
                className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                + Nova
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma conversa salva ainda
                </p>
              ) : (
                conversations
                  .slice()
                  .reverse()
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleLoad(conv)}
                      className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:text-red-400 transition-all"
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

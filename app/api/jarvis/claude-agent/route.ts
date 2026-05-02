import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"
import { getAuthenticatedClient } from "@/lib/google-client"
import { google } from "googleapis"

const execAsync = promisify(exec)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BLOCKED_COMMANDS = ["rm -rf", "sudo rm", "mkfs", "dd if=", ":(){", "chmod 777 /"]

async function runBash(command: string): Promise<string> {
  const isBlocked = BLOCKED_COMMANDS.some((b) => command.includes(b))
  if (isBlocked) return "Comando bloqueado por segurança."
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
    return (stdout || stderr || "(sem saída)").slice(0, 8000)
  } catch (e: any) {
    return `Erro: ${e.message}`
  }
}

async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content.length > 8000 ? content.slice(0, 8000) + "\n...(truncado)" : content
  } catch (e: any) {
    return `Erro ao ler arquivo: ${e.message}`
  }
}

async function writeFile(filePath: string, content: string): Promise<string> {
  try {
    await fs.writeFile(filePath, content, "utf-8")
    return `Arquivo salvo: ${filePath}`
  } catch (e: any) {
    return `Erro ao salvar: ${e.message}`
  }
}

async function createCalendarEvent(summary: string, start: string, end: string, description?: string, location?: string): Promise<string> {
  try {
    const auth = await getAuthenticatedClient()
    const calendar = google.calendar({ version: "v3", auth })
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: start, timeZone: "America/Sao_Paulo" },
        end: { dateTime: end, timeZone: "America/Sao_Paulo" },
      },
    })
    return `Evento criado: "${summary}" em ${start}. Link: ${event.data.htmlLink}`
  } catch (e: any) {
    return `Erro ao criar evento: ${e.message}`
  }
}

async function listCalendarEvents(maxResults = 10): Promise<string> {
  try {
    const auth = await getAuthenticatedClient()
    const calendar = google.calendar({ version: "v3", auth })
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    })
    const events = res.data.items || []
    if (!events.length) return "Nenhum evento encontrado."
    return events.map(e => {
      const start = e.start?.dateTime || e.start?.date || ""
      return `- ${e.summary} | ${new Date(start).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
    }).join("\n")
  } catch (e: any) {
    return `Erro ao listar eventos: ${e.message}`
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  try {
    const auth = await getAuthenticatedClient()
    const gmail = google.gmail({ version: "v1", auth })
    const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\n")
    const encoded = Buffer.from(message).toString("base64url")
    await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } })
    return `Email enviado para ${to} com assunto "${subject}".`
  } catch (e: any) {
    return `Erro ao enviar email: ${e.message}`
  }
}

async function listEmails(maxResults = 5, query = ""): Promise<string> {
  try {
    const auth = await getAuthenticatedClient()
    const gmail = google.gmail({ version: "v1", auth })
    const res = await gmail.users.messages.list({ userId: "me", maxResults, q: query || "in:inbox" })
    const messages = res.data.messages || []
    if (!messages.length) return "Nenhum email encontrado."

    const details = await Promise.all(messages.slice(0, 5).map(async (m) => {
      const msg = await gmail.users.messages.get({ userId: "me", id: m.id!, format: "metadata", metadataHeaders: ["From", "Subject", "Date"] })
      const headers = msg.data.payload?.headers || []
      const get = (name: string) => headers.find(h => h.name === name)?.value || ""
      return `- De: ${get("From")}\n  Assunto: ${get("Subject")}\n  Data: ${get("Date")}`
    }))
    return details.join("\n\n")
  } catch (e: any) {
    return `Erro ao listar emails: ${e.message}`
  }
}

const tools: any[] = [
  { type: "web_search_20250305", name: "web_search" },
  {
    name: "bash",
    description: "Executa um comando bash no servidor.",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "read_file",
    description: "Lê o conteúdo de um arquivo.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Escreve ou cria um arquivo.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
  {
    name: "create_calendar_event",
    description: "Cria um evento no Google Calendar do usuário.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Título do evento" },
        start: { type: "string", description: "Data/hora início em ISO 8601, ex: 2026-05-03T10:00:00" },
        end: { type: "string", description: "Data/hora fim em ISO 8601, ex: 2026-05-03T11:00:00" },
        description: { type: "string", description: "Descrição opcional" },
        location: { type: "string", description: "Local opcional" },
      },
      required: ["summary", "start", "end"],
    },
  },
  {
    name: "list_calendar_events",
    description: "Lista os próximos eventos do Google Calendar.",
    input_schema: {
      type: "object",
      properties: { maxResults: { type: "number", description: "Número máximo de eventos (padrão 10)" } },
    },
  },
  {
    name: "send_email",
    description: "Envia um email via Gmail.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Endereço de destino" },
        subject: { type: "string", description: "Assunto do email" },
        body: { type: "string", description: "Corpo do email em texto simples" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "list_emails",
    description: "Lista emails recentes da caixa de entrada do Gmail.",
    input_schema: {
      type: "object",
      properties: {
        maxResults: { type: "number", description: "Quantidade de emails (padrão 5)" },
        query: { type: "string", description: "Filtro de busca, ex: 'from:joao@example.com' ou 'subject:reunião'" },
      },
    },
  },
]

export async function POST(req: Request) {
  try {
    const { task } = await req.json()
    if (!task) return NextResponse.json({ error: "Task vazia" }, { status: 400 })

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }]
    let finalResult = ""

    while (true) {
      const response = await client.beta.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        betas: ["web-search-2025-03-05"],
        system: `Você é o executor do JARVIS. Recebe tarefas e as executa usando as ferramentas disponíveis.
Você tem acesso ao Google Calendar e Gmail do usuário. Use-os para criar eventos, listar agenda, enviar emails, etc.
Você pode buscar qualquer informação na internet em tempo real: clima, cotações, voos, notícias, etc.
Responda sempre em português. Seja direto — diga o que fez, não o que vai fazer.
A data/hora atual é: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
O fuso horário do usuário é America/Sao_Paulo (GMT-3).`,
        tools: tools as any,
        messages,
      })

      for (const block of response.content) {
        if (block.type === "text") finalResult = block.text
      }

      if (response.stop_reason === "end_turn") break

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content as any })

        const allToolUses = response.content.filter((b: any) => b.type === "tool_use") as Anthropic.ToolUseBlock[]
        // Web search is executed server-side by Anthropic — results already in response.content
        const localToolUses = allToolUses.filter((b) => b.name !== "web_search")

        if (localToolUses.length === 0) {
          // Only web search tools — just continue the loop, results are in content
          continue
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolUse of localToolUses) {
          const input = toolUse.input as Record<string, any>
          let result = ""

          switch (toolUse.name) {
            case "bash": result = await runBash(input.command); break
            case "read_file": result = await readFile(input.path); break
            case "write_file": result = await writeFile(input.path, input.content); break
            case "create_calendar_event": result = await createCalendarEvent(input.summary, input.start, input.end, input.description, input.location); break
            case "list_calendar_events": result = await listCalendarEvents(input.maxResults); break
            case "send_email": result = await sendEmail(input.to, input.subject, input.body); break
            case "list_emails": result = await listEmails(input.maxResults, input.query); break
            default: result = "Ferramenta desconhecida."
          }

          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result })
        }

        messages.push({ role: "user", content: toolResults })
        continue
      }

      break
    }

    return NextResponse.json({ success: true, result: finalResult || "Tarefa concluída." })
  } catch (e: any) {
    console.error("Claude agent error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

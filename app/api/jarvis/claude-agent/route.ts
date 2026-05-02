import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"

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

const tools: Anthropic.Tool[] = [
  {
    name: "bash",
    description: "Executa um comando bash no servidor/Mac. Use para criar eventos no Calendar via osascript, enviar emails, gerenciar arquivos, etc.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Comando bash a executar" },
      },
      required: ["command"],
    },
  },
  {
    name: "read_file",
    description: "Lê o conteúdo de um arquivo",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Caminho absoluto do arquivo" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Escreve ou cria um arquivo com o conteúdo fornecido",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Caminho absoluto do arquivo" },
        content: { type: "string", description: "Conteúdo a escrever" },
      },
      required: ["path", "content"],
    },
  },
]

export async function POST(req: Request) {
  try {
    const { task } = await req.json()
    if (!task) return NextResponse.json({ error: "Task vazia" }, { status: 400 })

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: task },
    ]

    let finalResult = ""

    // Agentic loop — Claude executa tools até concluir a tarefa
    while (true) {
      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        system: `Você é o executor do JARVIS. Recebe tarefas e as executa usando as ferramentas disponíveis.
Use bash para qualquer operação no sistema: criar eventos no Calendar (via osascript), enviar emails, manipular arquivos, etc.
Responda sempre em português. Seja direto — diga o que fez, não o que vai fazer.
Para criar eventos no macOS Calendar use osascript. Exemplo:
osascript -e 'tell application "Calendar" to tell calendar "Home" to make new event with properties {summary:"Reunião", start date:date "Friday, May 3, 2026 at 10:00:00 AM", end date:date "Friday, May 3, 2026 at 11:00:00 AM"}'`,
        tools,
        messages,
      })

      // Collect text from this response
      for (const block of response.content) {
        if (block.type === "text") {
          finalResult = block.text
        }
      }

      if (response.stop_reason === "end_turn") break

      if (response.stop_reason === "tool_use") {
        const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")

        messages.push({ role: "assistant", content: response.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolUse of toolUses) {
          let result = ""
          const input = toolUse.input as Record<string, string>

          if (toolUse.name === "bash") {
            result = await runBash(input.command)
          } else if (toolUse.name === "read_file") {
            result = await readFile(input.path)
          } else if (toolUse.name === "write_file") {
            result = await writeFile(input.path, input.content)
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          })
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

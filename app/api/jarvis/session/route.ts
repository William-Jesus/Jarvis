import { NextResponse } from "next/server"

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        modalities: ["text"],
        instructions: `Você é JARVIS (Just A Rather Very Intelligent System), o assistente de IA do Tony Stark.
Você é inteligente, sofisticado, levemente sarcástico e extremamente eficiente.
Responda sempre em português, de forma concisa e direta.
Trate o usuário com respeito, usando "senhor" ocasionalmente.
Mantenha respostas curtas e objetivas, adequadas para fala.`,
        tools: [
          {
            type: "function",
            name: "open_app",
            description: "Abre um aplicativo no Mac do usuário",
            parameters: {
              type: "object",
              properties: {
                app: {
                  type: "string",
                  description: "Nome do aplicativo a abrir (ex: chrome, spotify, vscode, terminal)",
                },
              },
              required: ["app"],
            },
          },
          {
            type: "function",
            name: "read_file",
            description: "Lê o conteúdo de um arquivo no computador do usuário",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string", description: "Caminho completo do arquivo (ex: /Users/william/Documents/notas.txt)" },
              },
              required: ["path"],
            },
          },
          {
            type: "function",
            name: "write_file",
            description: "Cria ou escreve conteúdo em um arquivo no computador",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string", description: "Caminho completo do arquivo" },
                content: { type: "string", description: "Conteúdo a escrever no arquivo" },
              },
              required: ["path", "content"],
            },
          },
          {
            type: "function",
            name: "list_directory",
            description: "Lista os arquivos e pastas de um diretório",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string", description: "Caminho da pasta (ex: /Users/william/Downloads)" },
              },
            },
          },
          {
            type: "function",
            name: "run_command",
            description: "Executa um comando no terminal do Mac",
            parameters: {
              type: "object",
              properties: {
                command: { type: "string", description: "Comando a executar (ex: npm install, git status, ls -la)" },
              },
              required: ["command"],
            },
          },
          {
            type: "function",
            name: "get_news",
            description: "Busca as últimas notícias, pode ser sobre um tema específico ou notícias gerais",
            parameters: {
              type: "object",
              properties: {
                topic: {
                  type: "string",
                  description: "Tema das notícias (ex: tecnologia, esportes, política). Deixar vazio para notícias gerais.",
                },
              },
            },
          },
          {
            type: "function",
            name: "search_web",
            description: "Busca informações na internet sobre qualquer assunto",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "O que pesquisar na internet",
                },
              },
              required: ["query"],
            },
          },
          {
            type: "function",
            name: "set_volume",
            description: "Define o volume do Mac entre 0 e 100",
            parameters: {
              type: "object",
              properties: {
                level: {
                  type: "number",
                  description: "Nível do volume de 0 a 100",
                },
              },
              required: ["level"],
            },
          },
          {
            type: "function",
            name: "mute",
            description: "Muta o som do Mac",
            parameters: { type: "object", properties: {} },
          },
          {
            type: "function",
            name: "unmute",
            description: "Ativa o som do Mac",
            parameters: { type: "object", properties: {} },
          },
        ],
        tool_choice: "auto",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          silence_duration_ms: 600,
          prefix_padding_ms: 300,
        },
        input_audio_transcription: {
          model: "whisper-1",
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Session error:", error)
      throw new Error("Failed to create session")
    }

    const data = await response.json()
    return NextResponse.json({ client_secret: data.client_secret })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}

import fs from "fs/promises"
import path from "path"

const FILE = path.join(process.cwd(), "data", "usage.json")

export interface DayStats {
  calls: number
  inputTokens: number
  outputTokens: number
  costUSD: number
}

export interface UsageData {
  claude: { today: DayStats; total: DayStats; date: string }
  gpt:    { today: { sessions: number }; total: { sessions: number }; date: string }
}

const empty = (): DayStats => ({ calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 })

async function read(): Promise<UsageData> {
  try {
    const raw = await fs.readFile(FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return {
      claude: { today: empty(), total: empty(), date: today() },
      gpt:    { today: { sessions: 0 }, total: { sessions: 0 }, date: today() },
    }
  }
}

async function write(data: UsageData) {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(data, null, 2))
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function resetIfNewDay(data: UsageData) {
  const t = today()
  if (data.claude.date !== t) { data.claude.today = empty(); data.claude.date = t }
  if (data.gpt.date !== t)    { data.gpt.today = { sessions: 0 }; data.gpt.date = t }
}

// Claude: $15/MTok input, $75/MTok output (claude-opus-4-7)
export async function trackClaude(inputTokens: number, outputTokens: number) {
  const cost = (inputTokens * 15 + outputTokens * 75) / 1_000_000
  const data = await read()
  resetIfNewDay(data)
  for (const scope of [data.claude.today, data.claude.total] as DayStats[]) {
    scope.calls++
    scope.inputTokens += inputTokens
    scope.outputTokens += outputTokens
    scope.costUSD = +(scope.costUSD + cost).toFixed(6)
  }
  await write(data)
}

export async function trackGptSession() {
  const data = await read()
  resetIfNewDay(data)
  data.gpt.today.sessions++
  data.gpt.total.sessions++
  await write(data)
}

export async function getUsage(): Promise<UsageData> {
  const data = await read()
  resetIfNewDay(data)
  return data
}

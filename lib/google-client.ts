import { google } from "googleapis"
import fs from "fs/promises"
import path from "path"

const TOKEN_PATH = path.join(process.cwd(), "data", "google-tokens.json")

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://jarvismkt.com/api/jarvis/google-callback"
  )
}

export async function getAuthenticatedClient() {
  const client = getOAuthClient()
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf-8")
    const tokens = JSON.parse(raw)
    client.setCredentials(tokens)
    // Auto-refresh if expired
    client.on("tokens", async (newTokens) => {
      if (newTokens.refresh_token) tokens.refresh_token = newTokens.refresh_token
      Object.assign(tokens, newTokens)
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2))
    })
    return client
  } catch {
    throw new Error("Google não autorizado. Acesse /google-setup para autorizar.")
  }
}

export async function saveTokens(tokens: object) {
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true })
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2))
}

export async function isAuthorized(): Promise<boolean> {
  try {
    await fs.readFile(TOKEN_PATH, "utf-8")
    return true
  } catch {
    return false
  }
}

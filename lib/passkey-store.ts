import fs from "fs/promises"
import path from "path"

const FILE = process.env.PASSKEY_PATH || path.join(process.cwd(), "data", "passkey.json")

export interface StoredCredential {
  id: string
  publicKey: string
  counter: number
  transports?: string[]
}

export async function getCredential(): Promise<StoredCredential | null> {
  try {
    const data = await fs.readFile(FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function saveCredential(cred: StoredCredential) {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(cred, null, 2))
}

export async function updateCounter(counter: number) {
  const cred = await getCredential()
  if (cred) await saveCredential({ ...cred, counter })
}

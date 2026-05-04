import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import os from "os"
import { getUsage } from "@/lib/usage-tracker"

const execAsync = promisify(exec)

async function getVpsStats() {
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100)

  let diskPercent = 0
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'")
    diskPercent = parseInt(stdout.trim().replace("%", "")) || 0
  } catch {}

  // Simple CPU usage estimate via load average
  const load = os.loadavg()[0]
  const cpuCount = cpus.length
  const cpuPercent = Math.min(100, Math.round((load / cpuCount) * 100))

  return { cpu: cpuPercent, memory: memPercent, disk: diskPercent }
}

export async function GET() {
  const [usage, vps] = await Promise.all([getUsage(), getVpsStats()])
  return NextResponse.json({ usage, vps })
}

#!/usr/bin/env python3
"""
JARVIS Local Agent - runs on Mac or Windows and connects to the JARVIS server.
Install: pip install websockets
Run: python jarvis_agent.py --server ws://YOUR_SERVER:3001
"""
import asyncio
import json
import os
import platform
import socket
import subprocess
import sys
import argparse

# pythonw.exe has no console — redirect stdout/stderr to avoid crashes
if sys.stdout is None:
    sys.stdout = open(os.path.join(os.path.expanduser("~"), "jarvis_agent.log"), "a", buffering=1)
if sys.stderr is None:
    sys.stderr = sys.stdout

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])

try:
    import psutil
except ImportError:
    print("Installing psutil...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
    import psutil
    import websockets

SYSTEM = platform.system()  # Darwin, Windows, Linux

APP_MAP_MAC = {
    "chrome": "Google Chrome", "google": "Google Chrome", "safari": "Safari",
    "spotify": "Spotify", "vscode": "Visual Studio Code", "terminal": "Terminal",
    "finder": "Finder", "slack": "Slack", "whatsapp": "WhatsApp", "zoom": "Zoom",
    "notion": "Notion", "figma": "Figma", "mail": "Mail", "notes": "Notes",
}

APP_MAP_WIN = {
    "chrome": "chrome.exe", "google": "chrome.exe", "spotify": "Spotify.exe",
    "vscode": "Code.exe", "terminal": "cmd.exe", "notepad": "notepad.exe",
    "explorer": "explorer.exe", "slack": "slack.exe", "zoom": "Zoom.exe",
    "excel": "excel.exe", "word": "winword.exe", "powerpoint": "powerpnt.exe",
}

BLOCKED = ["rm -rf", "mkfs", "dd if=", ":(){", "format c"]


def open_app(app_name: str) -> dict:
    name = app_name.lower()
    if SYSTEM == "Darwin":
        resolved = APP_MAP_MAC.get(name, app_name)
        subprocess.Popen(["open", "-a", resolved])
        return {"message": f"{resolved} aberto"}
    elif SYSTEM == "Windows":
        resolved = APP_MAP_WIN.get(name, app_name)
        os.startfile(resolved)
        return {"message": f"{resolved} aberto"}
    else:
        subprocess.Popen(["xdg-open", app_name])
        return {"message": f"{app_name} aberto"}


def set_volume(level: int) -> dict:
    level = max(0, min(100, level))
    if SYSTEM == "Darwin":
        subprocess.run(["osascript", "-e", f"set volume output volume {level}"])
    elif SYSTEM == "Windows":
        script = f"""
$vol = [int](655.35 * {level})
$wsh = New-Object -ComObject WScript.Shell
Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {{ int f(); int ff(); int fff(); int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext); }}
'@
"""
        subprocess.run(["powershell", "-Command", f"(New-Object -ComObject WScript.Shell).SendKeys([char]0xAD)"], capture_output=True)
    return {"message": f"Volume definido para {level}%"}


def mute_audio(muted: bool) -> dict:
    if SYSTEM == "Darwin":
        val = "true" if muted else "false"
        subprocess.run(["osascript", "-e", f"set volume output muted {val}"])
    elif SYSTEM == "Windows":
        subprocess.run(["powershell", "-Command",
            "(New-Object -ComObject WScript.Shell).SendKeys([char]0xAD)"], capture_output=True)
    return {"message": "Som mutado" if muted else "Som ativado"}


def read_file(file_path: str) -> dict:
    path = os.path.expanduser(file_path)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    preview = content[:2000] + "\n...(truncado)" if len(content) > 2000 else content
    return {"result": preview}


def write_file(file_path: str, content: str) -> dict:
    path = os.path.expanduser(file_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return {"message": f"Arquivo salvo em {path}"}


def list_directory(dir_path: str = None) -> dict:
    path = os.path.expanduser(dir_path or "~")
    entries = os.listdir(path)
    lines = []
    for e in entries:
        full = os.path.join(path, e)
        tag = "[pasta]" if os.path.isdir(full) else "[arquivo]"
        lines.append(f"{tag} {e}")
    return {"result": "\n".join(lines)}


def run_command(command: str) -> dict:
    if any(b in command for b in BLOCKED):
        return {"error": "Comando bloqueado por segurança"}
    result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=15)
    output = (result.stdout or result.stderr or "Executado sem saída")[:2000]
    return {"result": output}


def handle_action(action: str, params: dict) -> dict:
    try:
        if action == "open_app":
            return open_app(params.get("app", ""))
        elif action == "set_volume":
            return set_volume(int(params.get("level", 50)))
        elif action == "mute":
            return mute_audio(True)
        elif action == "unmute":
            return mute_audio(False)
        elif action == "read_file":
            return read_file(params.get("path", ""))
        elif action == "write_file":
            return write_file(params.get("path", ""), params.get("content", ""))
        elif action == "list_directory":
            return list_directory(params.get("path"))
        elif action == "run_command":
            return run_command(params.get("command", ""))
        else:
            return {"error": f"Ação desconhecida: {action}"}
    except Exception as e:
        return {"error": str(e)}


def get_system_stats() -> dict:
    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    temps = {}
    try:
        t = psutil.sensors_temperatures()
        if t:
            for name, entries in t.items():
                if entries:
                    temps["cpu"] = round(entries[0].current, 1)
                    break
    except Exception:
        pass
    return {
        "cpu": round(cpu, 1),
        "memory": round(mem.percent, 1),
        "disk": round(disk.percent, 1),
        "memory_total": round(mem.total / (1024**3), 1),
        "memory_used": round(mem.used / (1024**3), 1),
        "temp": temps.get("cpu"),
        "platform": SYSTEM,
        "hostname": socket.gethostname(),
    }


async def send_stats_loop(ws):
    while True:
        try:
            stats = get_system_stats()
            await ws.send(json.dumps({"type": "stats", "stats": stats}))
        except Exception:
            break
        await asyncio.sleep(5)


async def connect(server_url: str):
    print(f"🤖 JARVIS Agent ({SYSTEM}) conectando em {server_url}...")

    while True:
        try:
            async with websockets.connect(server_url) as ws:
                await ws.send(json.dumps({
                    "type": "register",
                    "platform": SYSTEM,
                    "hostname": socket.gethostname(),
                }))

                msg = json.loads(await ws.recv())
                agent_id = msg.get("agentId", "unknown")
                print(f"✅ Conectado! ID: {agent_id}")

                asyncio.create_task(send_stats_loop(ws))

                async for message in ws:
                    data = json.loads(message)
                    command_id = data.get("commandId")
                    action = data.get("action")
                    params = data.get("params", {})

                    print(f"▶ {action} {params}")
                    result = handle_action(action, params)

                    if "error" in result:
                        await ws.send(json.dumps({"type": "error", "commandId": command_id, "error": result["error"]}))
                    else:
                        await ws.send(json.dumps({"type": "result", "commandId": command_id, "result": result}))

        except Exception as e:
            print(f"⚠ Desconectado: {e}. Reconectando em 5s...")
            await asyncio.sleep(5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JARVIS Local Agent")
    parser.add_argument("--server", default="ws://localhost:3001", help="WebSocket server URL")
    args = parser.parse_args()
    asyncio.run(connect(args.server))

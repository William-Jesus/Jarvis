@echo off
echo Configurando JARVIS para iniciar automaticamente...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$startupFolder = [Environment]::GetFolderPath('Startup');" ^
  "$scriptDir = Split-Path -Parent '%~f0';" ^
  "$vbsPath = Join-Path $scriptDir 'start_agent.vbs';" ^
  "$shortcutPath = Join-Path $startupFolder 'JarvisAgent.lnk';" ^
  "$shell = New-Object -ComObject WScript.Shell;" ^
  "$shortcut = $shell.CreateShortcut($shortcutPath);" ^
  "$shortcut.TargetPath = 'wscript.exe';" ^
  "$shortcut.Arguments = '\"' + $vbsPath + '\"';" ^
  "$shortcut.WorkingDirectory = $scriptDir;" ^
  "$shortcut.Description = 'JARVIS Agent';" ^
  "$shortcut.Save();" ^
  "Write-Host 'Atalho criado em:' $shortcutPath"

if %errorlevel% == 0 (
    echo.
    echo JARVIS Agent configurado com sucesso!
    echo Ele iniciara automaticamente na proxima vez que o Windows ligar.
    echo.
    echo Iniciando agora...
    start "" wscript.exe "%~dp0start_agent.vbs"
) else (
    echo.
    echo Erro ao configurar o startup. Tente rodar como Administrador.
)

pause

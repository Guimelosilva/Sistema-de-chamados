@echo off
setlocal

set "PROJECT_DIR=D:\Trabalho\Site para Chamados"
set "BACKEND_DIR=%PROJECT_DIR%\backend"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

if not exist "%NODE_EXE%" (
  echo Nao foi encontrado o Node.js em C:\Program Files\nodejs\node.exe
  echo Verifique a instalacao do Node.js.
  pause
  exit /b 1
)

set "PY_EXE="
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "PY_EXE=%LocalAppData%\Programs\Python\Python311\python.exe"
if exist "%ProgramFiles%\Python311\python.exe" set "PY_EXE=%ProgramFiles%\Python311\python.exe"
if exist "%ProgramFiles(x86)%\Python311\python.exe" set "PY_EXE=%ProgramFiles(x86)%\Python311\python.exe"
if exist "%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\python.exe" set "PY_EXE=%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\python.exe"
if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" set "PY_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe"
if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe" set "PY_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe"

if not defined PY_EXE (
  echo Python nao encontrado nos caminhos padrao.
  echo Tentando usar 'py'...
  where py >nul 2>nul
  if not errorlevel 1 (
    set "PY_EXE=py"
  ) else (
    echo Nao foi possivel localizar o Python.
    pause
    exit /b 1
  )
)

start "Backend - Sistema de Chamados" cmd /k "cd /d "%BACKEND_DIR%" && "%NPM_CMD%" start"
if /I "%PY_EXE%" EQU "py" (
  start "Frontend - Sistema de Chamados" cmd /k "cd /d "%FRONTEND_DIR%" && py -m http.server 3000"
) else (
  start "Frontend - Sistema de Chamados" cmd /k "cd /d "%FRONTEND_DIR%" && "%PY_EXE%" -m http.server 3000"
)

start "" http://localhost:3000

echo.
echo Sistema iniciado com sucesso.
echo Backend e frontend foram abertos automaticamente.
pause

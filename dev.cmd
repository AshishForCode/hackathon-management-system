@echo off
set "PATH=C:\Program Files\nodejs;C:\Users\%USERNAME%\AppData\Roaming\npm;%PATH%"
if "%1"=="" (
  pnpm dev
) else (
  pnpm %*
)

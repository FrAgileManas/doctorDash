@echo off
start cmd /k "cd frontend && npm run dev"
start cmd /k "cd backend && npm run server"
start cmd /k "cd admin && npm run dev"

timeout /t 10 /nobreak > nul  REM Wait for 10 seconds (adjust as needed)

start "" "http://localhost:5173"  REM Assuming frontend runs on port 3000
start "" "http://localhost:5174"  REM Assuming admin runs on port 8000
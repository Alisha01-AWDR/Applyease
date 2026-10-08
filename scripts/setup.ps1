$ErrorActionPreference = "Stop"
Write-Host "ApplyEase setup"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Node/npm is required." }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "Python is required." }

npm install
python -m pip install -r backend/requirements.txt

Write-Host ""
Write-Host "Dependencies installed."
Write-Host "Start PostgreSQL, seed the DB, then run backend and frontend using README.md."

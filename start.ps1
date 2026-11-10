$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$viteLauncher = Join-Path $PSScriptRoot "node_modules\.bin\vite.cmd"
if (-not (Test-Path -LiteralPath $viteLauncher)) {
  Write-Host "Setting up Dukaan Suno's React interface (first launch only)..."
  npm install
  if ($LASTEXITCODE -ne 0) { throw "Could not install the app dependencies. Check your internet connection and run npm install again." }
}
$secret = Read-Host "Paste your Gnani API key (input stays hidden)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:GNANI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  npm start
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  Remove-Item Env:GNANI_API_KEY -ErrorAction SilentlyContinue
}

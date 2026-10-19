$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Find-Tool($names, $fallback) {
    foreach ($name in $names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    if ($fallback -and (Test-Path -LiteralPath $fallback)) { return $fallback }
    return $null
}

$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$uvTool = Find-Tool @('uv') (Join-Path $env:USERPROFILE '.local\bin\uv.exe')
$nodeTool = Find-Tool @('node') (Join-Path $runtimeRoot 'node\bin\node.exe')
if (-not $nodeTool) { throw 'Install Node.js 20.9+ and rerun this launcher.' }
$env:Path = (Split-Path $nodeTool) + ';' + $env:Path
$npmTool = Find-Tool @('npm.cmd') $null
$pnpmTool = Find-Tool @('pnpm.cmd') (Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd')
$pythonTool = Join-Path $projectRoot '.venv\Scripts\python.exe'
$bootstrapPython = Find-Tool @('python', 'python3') (Join-Path $runtimeRoot 'python\python.exe')

if (-not (Test-Path -LiteralPath $pythonTool)) {
    Write-Host 'Setting up Python dependencies (first run only)...'
    if ($uvTool) {
        if ($bootstrapPython) { & $uvTool venv --python $bootstrapPython .venv }
        else { & $uvTool venv --python 3.12 .venv }
        if ($LASTEXITCODE -ne 0) { throw 'Python environment setup failed.' }
        & $uvTool pip install --python $pythonTool -r solver\requirements.txt
    } else {
        $systemPython = Find-Tool @('python', 'python3') $null
        if (-not $systemPython) { throw 'Install Python 3.12+ or uv and rerun.' }
        & $systemPython -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Python environment setup failed.' }
        & $pythonTool -m pip install -r solver\requirements.txt
    }
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
}

if (-not (Test-Path -LiteralPath 'web\node_modules\next\dist\bin\next')) {
    Write-Host 'Setting up web dependencies (first run only)...'
    Push-Location web
    try {
        if ($pnpmTool) { & $pnpmTool install --frozen-lockfile --fetch-timeout=900000 }
        elseif ($npmTool) { & $npmTool install }
        else { throw 'Install npm or pnpm and rerun.' }
        if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
    } finally { Pop-Location }
}

New-Item -ItemType Directory -Path (Join-Path $projectRoot 'logs') -Force | Out-Null
function Is-Ready($url) {
    try { $null = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3; return $true }
    catch { return $false }
}

if (-not (Is-Ready 'http://127.0.0.1:8000/health')) {
    Start-Process -FilePath $pythonTool -ArgumentList '-B', 'solver/server.py' -WorkingDirectory $projectRoot -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $projectRoot 'logs\solver.log') -RedirectStandardError (Join-Path $projectRoot 'logs\solver-error.log') | Out-Null
}
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Is-Ready 'http://127.0.0.1:8000/health') { break }
    Start-Sleep -Seconds 1
}
if (-not (Is-Ready 'http://127.0.0.1:8000/health')) { throw 'Solver did not start. Check logs\solver-error.log.' }

if (-not (Is-Ready 'http://127.0.0.1:3000/api/data/status')) {
    Start-Process -FilePath $nodeTool -ArgumentList 'node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1' `
        -WorkingDirectory (Join-Path $projectRoot 'web') -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $projectRoot 'logs\web.log') -RedirectStandardError (Join-Path $projectRoot 'logs\web-error.log') | Out-Null
}
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (Is-Ready 'http://127.0.0.1:3000/api/data/status') { break }
    Start-Sleep -Seconds 1
}
if (-not (Is-Ready 'http://127.0.0.1:3000/api/data/status')) { throw 'Dashboard did not start. Check logs\web-error.log.' }
Write-Host 'BioCover is ready: http://127.0.0.1:3000/optimize'
Write-Host 'Use the map to locate sites and download their coordinates. Logs are in the logs folder.'

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
Write-Host "Project: $projectRoot"
Write-Host 'Checking Python and Node.js...'

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
if (-not $env:UV_CACHE_DIR) { $env:UV_CACHE_DIR = Join-Path $projectRoot 'logs\uv-cache' }

if (-not (Test-Path -LiteralPath $pythonTool)) {
    Write-Host 'Creating Python environment...'
    if ($uvTool) {
        if ($bootstrapPython) { & $uvTool venv --python $bootstrapPython .venv }
        else { & $uvTool venv --python 3.12 .venv }
        if ($LASTEXITCODE -ne 0) { throw 'Python environment setup failed.' }
    } else {
        if (-not $bootstrapPython) { throw 'Install Python 3.12+ or uv and rerun.' }
        & $bootstrapPython -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Python environment setup failed.' }
    }
}

# An interrupted installation can leave a valid interpreter without dependencies.
& $pythonTool -c "import importlib.util, sys; sys.exit(0 if all(importlib.util.find_spec(m) is not None for m in ['fastapi', 'uvicorn', 'pandas', 'pulp', 'requests', 'dotenv']) else 1)"
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Installing missing Python dependencies...'
    if ($uvTool) {
        & $uvTool pip install --python $pythonTool -r solver\requirements.txt
    } else {
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

function Wait-Service($url, $serviceProcess, $attempts, $errorLog, $label) {
    for ($attempt = 0; $attempt -lt $attempts; $attempt++) {
        if (Is-Ready $url) { return }
        if ($serviceProcess -and $serviceProcess.HasExited) {
            $details = Get-Content -LiteralPath $errorLog -Tail 20 -ErrorAction SilentlyContinue
            throw "$label exited (code $($serviceProcess.ExitCode)).`n$($details -join [Environment]::NewLine)"
        }
        Start-Sleep -Seconds 1
    }
    throw "$label did not become ready. Check $errorLog"
}

Write-Host 'Starting solver on http://127.0.0.1:8000...'
$solverProcess = $null
if (-not (Is-Ready 'http://127.0.0.1:8000/health')) {
    $solverProcess = Start-Process -FilePath $pythonTool -ArgumentList '-u', '-B', 'solver/server.py' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $projectRoot 'logs\solver.log') -RedirectStandardError (Join-Path $projectRoot 'logs\solver-error.log')
}
Wait-Service 'http://127.0.0.1:8000/health' $solverProcess 30 (Join-Path $projectRoot 'logs\solver-error.log') 'Solver'

Write-Host 'Starting dashboard on http://127.0.0.1:3000...'
$webProcess = $null
# Check the dashboard itself. Its data API also depends on the solver and can
# fail while an existing dashboard is already listening on port 3000.
if (-not (Is-Ready 'http://127.0.0.1:3000/optimize')) {
    $webProcess = Start-Process -FilePath $nodeTool -ArgumentList 'node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3000' `
        -WorkingDirectory (Join-Path $projectRoot 'web') -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $projectRoot 'logs\web.log') -RedirectStandardError (Join-Path $projectRoot 'logs\web-error.log')
}
Wait-Service 'http://127.0.0.1:3000/optimize' $webProcess 60 (Join-Path $projectRoot 'logs\web-error.log') 'Dashboard'
Write-Host 'BioCover is ready: http://127.0.0.1:3000/optimize'
Write-Host 'Use the map to locate sites and download their coordinates. Logs are in the logs folder.'

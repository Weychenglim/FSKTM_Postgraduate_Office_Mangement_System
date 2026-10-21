[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$taskRepository = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskBackend = Join-Path $taskRepository 'backend'
$taskPython = Join-Path $taskRepository '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    throw 'The repository Python virtual environment is missing.'
}
$taskLogDirectory = Join-Path $env:LOCALAPPDATA 'FSKTM/deadline-reminders'
New-Item -ItemType Directory -Path $taskLogDirectory -Force | Out-Null
$taskArguments = @('-u', (Join-Path $taskBackend 'manage.py'), 'send_deadline_reminders', '--days', '3')
if ($DryRun) { $taskArguments += '--dry-run' }
Push-Location -LiteralPath $taskBackend
try {
    & $taskPython @taskArguments 1>> (Join-Path $taskLogDirectory 'stdout.log') 2>> (Join-Path $taskLogDirectory 'stderr.log')
    $taskExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $taskExitCode

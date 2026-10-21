[CmdletBinding(SupportsShouldProcess)]
param([switch]$EnableDelivery)

$ErrorActionPreference = 'Stop'
$taskRunner = Join-Path $PSScriptRoot 'run-deadline-reminders.ps1'
if (-not (Test-Path -LiteralPath $taskRunner)) { throw 'Deadline runner script is missing.' }
$taskName = 'FSKTM deadline reminders'
$taskPowerShell = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$taskArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $taskRunner + '"'
if (-not $EnableDelivery) { $taskArguments += ' -DryRun' }
$taskAction = New-ScheduledTaskAction -Execute $taskPowerShell -Argument $taskArguments -WorkingDirectory $PSScriptRoot
$taskTrigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(5)) -RepetitionInterval (New-TimeSpan -Minutes 15)
$taskSettings = New-ScheduledTaskSettingsSet -Hidden -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$taskIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskIdentity -LogonType Interactive -RunLevel Limited
if ($PSCmdlet.ShouldProcess($taskName, 'Register the application deadline job')) {
    Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Principal $taskPrincipal -Description 'FSKTM operational-period reminders; use the installer EnableDelivery switch to activate actual notification delivery.' -Force | Out-Null
    $taskMode = if ($EnableDelivery) { 'delivery enabled' } else { 'preview only; no notifications or emails' }
    Write-Output "$taskName registered every 15 minutes: $taskMode. Runs while this Windows user is signed in."
}

param([Parameter(Mandatory=$true)][string]$Python,[Parameter(Mandatory=$true)][string]$Script,[Parameter(Mandatory=$true)][string]$Config)
$ErrorActionPreference='Stop'
$workerProcess=Start-Process -FilePath $Python -ArgumentList @(('"'+$Script+'"'),'--config',('"'+$Config+'"')) -WindowStyle Hidden -Wait -PassThru
exit $workerProcess.ExitCode

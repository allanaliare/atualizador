param(
  [Parameter(Mandatory=$true)][string]$SourceDirectory,
  [Parameter(Mandatory=$true)][string]$OutputZip
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path (Join-Path $SourceDirectory 'manifest.json'))) {
  throw 'manifest.json nao encontrado na pasta de origem.'
}

if (Test-Path $OutputZip) { Remove-Item $OutputZip }
Compress-Archive -Path (Join-Path $SourceDirectory '*') -DestinationPath $OutputZip -CompressionLevel Optimal
$File = Get-Item $OutputZip
$Hash = (Get-FileHash -Algorithm SHA256 $OutputZip).Hash.ToLowerInvariant()

[PSCustomObject]@{
  file = $File.FullName
  sizeBytes = $File.Length
  sha256 = $Hash
} | ConvertTo-Json

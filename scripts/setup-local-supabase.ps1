[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]{20}$')]
  [string]$ProjectRef,
  [switch]$RefreshBaseline
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BaselinePath = Join-Path $RepoRoot 'supabase\migrations\20260717000000_remote_public_baseline.sql'
$EnvPath = Join-Path $RepoRoot '.env.local'

function Invoke-Supabase {
  param([string[]]$CommandArgs)

  Write-Host "`n> npx supabase $($CommandArgs -join ' ')" -ForegroundColor Cyan
  & npx --yes supabase @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Falló: npx supabase $($CommandArgs -join ' ')"
  }
}

function Get-JsonValue {
  param(
    [object]$Object,
    [string[]]$Names
  )

  foreach ($Name in $Names) {
    $Property = $Object.PSObject.Properties[$Name]
    if ($null -ne $Property -and $null -ne $Property.Value -and "$($Property.Value)" -ne '') {
      return "$($Property.Value)"
    }
  }

  return $null
}

function Confirm-SupabaseProjectLink {
  Write-Host "Project ref de destino: $ProjectRef" -ForegroundColor Yellow
  $Confirmation = Read-Host 'Escribe exactamente el project ref para confirmar el enlace'

  if ($Confirmation -cne $ProjectRef) {
    throw 'El project ref confirmado no coincide. No se ejecutará supabase link.'
  }
}

Write-Host 'IsiVoltPro OT - Supabase local gratuito' -ForegroundColor Green
Write-Host 'Este script no ejecuta db push ni db reset --linked.' -ForegroundColor Yellow
Write-Host 'El proyecto remoto se usa solamente para leer su esquema público.' -ForegroundColor Yellow

Push-Location $RepoRoot
try {
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker no está iniciado. Abre Docker Desktop y vuelve a ejecutar el comando.'
  }

  $NodeMajor = [int](& node -p "process.versions.node.split('.')[0]")
  if ($LASTEXITCODE -ne 0 -or $NodeMajor -lt 20) {
    throw 'Se necesita Node.js 20 o posterior.'
  }

  $RequiresRemoteBaseline = $RefreshBaseline -or -not (Test-Path $BaselinePath)

  if ($RequiresRemoteBaseline) {
    Confirm-SupabaseProjectLink
  }

  if ($RefreshBaseline -and (Test-Path $BaselinePath)) {
    Remove-Item $BaselinePath -Force
  }

  if (-not (Test-Path $BaselinePath)) {
    Write-Host "`nFalta la copia local del esquema heredado." -ForegroundColor Yellow
    Write-Host 'Se abrirá el acceso de Supabase y puede solicitar la contraseña de la base.'
    Write-Host 'No escribas la contraseña en GitHub, ChatGPT ni archivos del repositorio.' -ForegroundColor Yellow

    Invoke-Supabase @('login')
    Invoke-Supabase @('link', '--project-ref', $ProjectRef)
    Invoke-Supabase @(
      'db', 'dump',
      '--linked',
      '--schema', 'public',
      '-f', $BaselinePath
    )

    # El Postgres local ya contiene el esquema public. Convertimos únicamente
    # esa sentencia para que la restauración del dump sea repetible.
    $Baseline = Get-Content -Raw -Path $BaselinePath
    $Baseline = $Baseline -replace '(?m)^CREATE SCHEMA public;\s*$', 'CREATE SCHEMA IF NOT EXISTS public;'
    Set-Content -Path $BaselinePath -Value $Baseline -Encoding UTF8

    Write-Host "Esquema guardado en $BaselinePath" -ForegroundColor Green
  }

  Invoke-Supabase @('start')
  Invoke-Supabase @('db', 'reset')
  Invoke-Supabase @('db', 'lint', '--level', 'warning')
  Invoke-Supabase @('test', 'db')

  Write-Host "`nGenerando .env.local para conectar Vite al Supabase local..." -ForegroundColor Cyan
  $StatusText = (& npx --yes supabase status -o json 2>$null) -join [Environment]::NewLine
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo obtener el estado del Supabase local.'
  }

  $Status = $StatusText | ConvertFrom-Json
  $ApiUrl = Get-JsonValue $Status @('API_URL', 'api_url', 'ApiUrl')
  $PublishableKey = Get-JsonValue $Status @(
    'PUBLISHABLE_KEY',
    'publishable_key',
    'PublishableKey',
    'ANON_KEY',
    'anon_key',
    'AnonKey'
  )

  if ($null -ne $ApiUrl -and $null -ne $PublishableKey) {
    @(
      "VITE_SUPABASE_URL=$ApiUrl",
      "VITE_SUPABASE_PUBLISHABLE_KEY=$PublishableKey"
    ) | Set-Content -Path $EnvPath -Encoding UTF8
    Write-Host '.env.local creado correctamente.' -ForegroundColor Green
  }
  else {
    Write-Host 'No se pudo generar .env.local automáticamente.' -ForegroundColor Yellow
    Write-Host 'Ejecuta: npx supabase status y copia Project URL y Publishable key.'
  }

  Write-Host "`nEntorno listo." -ForegroundColor Green
  Write-Host 'Supabase Studio: http://127.0.0.1:54323'
  Write-Host 'Aplicación: npm run dev'
  Write-Host 'Parar Supabase: npm run supabase:stop'
}
finally {
  Pop-Location
}

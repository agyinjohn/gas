# Run Flutter with caches on G: (avoids filling C:)
$ErrorActionPreference = "Stop"
$cacheRoot = "G:\dev-cache"
New-Item -ItemType Directory -Force -Path "$cacheRoot\gradle", "$cacheRoot\pub", "$cacheRoot\temp" | Out-Null

$env:GRADLE_USER_HOME = "$cacheRoot\gradle"
$env:PUB_CACHE        = "$cacheRoot\pub"
$env:TEMP             = "$cacheRoot\temp"
$env:TMP              = "$cacheRoot\temp"

Set-Location $PSScriptRoot
dart run tool/sync_env.dart 2>$null
flutter run --dart-define=API_URL=http://192.168.100.2:4000 @args

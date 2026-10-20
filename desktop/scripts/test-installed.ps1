$ErrorActionPreference = 'Stop'
if (-not $env:CI) { throw 'This destructive installation test is restricted to a disposable CI runner.' }
$installer = Get-ChildItem release/*-x64-Setup.exe | Select-Object -First 1
if (-not $installer) { throw 'No x64 installer found.' }
$installDir = Join-Path $env:RUNNER_TEMP 'StudyAtlas-installed'
$p = Start-Process -FilePath $installer.FullName -ArgumentList @('/S', "/D=$installDir") -PassThru -Wait
if ($p.ExitCode -ne 0) { throw "Install failed: $($p.ExitCode)" }
$env:STUDY_ATLAS_EXECUTABLE = Join-Path $installDir 'Study Atlas.exe'
$env:STUDY_ATLAS_PERSIST_TEST_PROFILE = Join-Path $env:APPDATA 'Study Atlas'
npm run test:electron
if ($LASTEXITCODE -ne 0) { throw 'Installed app smoke failed.' }
# Reinstall the candidate to verify NSIS preserves a populated profile; a prior
# schema upgrade is separately exercised by tests. This is not an old-release upgrade.
$p = Start-Process -FilePath $installer.FullName -ArgumentList @('/S', "/D=$installDir") -PassThru -Wait
if ($p.ExitCode -ne 0) { throw 'Reinstall failed.' }
$env:STUDY_ATLAS_EXPECT_EXISTING = '1'
npm run test:electron
if ($LASTEXITCODE -ne 0) { throw 'Persistence after reinstall failed.' }
$db = Join-Path $env:STUDY_ATLAS_PERSIST_TEST_PROFILE 'atlas.sqlite'
$hash = (Get-FileHash $db -Algorithm SHA256).Hash
$uninstaller = Get-ChildItem $installDir/*Uninstall*.exe | Select-Object -First 1
if (-not $uninstaller) { throw 'Uninstaller missing.' }
$p = Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -PassThru -Wait
if ($p.ExitCode -ne 0) { throw "Uninstall failed: $($p.ExitCode)" }
if (-not (Test-Path $db)) { throw 'Uninstall removed user data.' }
if ((Get-FileHash $db -Algorithm SHA256).Hash -ne $hash) { throw 'Uninstall changed user data.' }
@{installed=$true;reinstalled=$true;uninstallPreservedProfile=$true;priorReleaseUpgrade=$false;architecture='x64'} | ConvertTo-Json | Set-Content test-evidence/installed-windows.json

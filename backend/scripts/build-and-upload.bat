@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ================== CONFIGURACAO ==================
set "API_URL=http://192.168.5.22:3333"
set "PRODUCT=pdv"
set "CHANNEL=production"
set "TOKEN_FILE=%~dp0ci-api-token.txt"
set "LOG_FILE=%~dp0ci-upload.log"

set "PDV=C:\Projetos\PDV\PDV\Win32\Release\PDV.exe"
set "INTEGRADOR=C:\Projetos\PDV\Integrador\Win32\Release\Integrador.exe"
set "BACKUP=C:\Projetos\PDV\backup\Backup.exe"

set "DESTINO=%~dp0"
set "TEMP_DIR=%DESTINO%Temp"

rem ================== TOKEN ==================
if not exist "%TOKEN_FILE%" (
    echo Token de API nao encontrado.
    echo Gere o token no portal e cole o valor abaixo.
    echo O token sera salvo em:
    echo %TOKEN_FILE%
    echo.
    set /p "TOKEN=Token de API: "
    if not defined TOKEN (
        echo [ERRO] Token nao informado.
        pause
        exit /b 1
    )
    >"%TOKEN_FILE%" echo(!TOKEN!
    echo Token salvo com sucesso.
) else (
    set /p "TOKEN="<"%TOKEN_FILE%"
)

if not defined TOKEN (
    echo [ERRO] O arquivo de token esta vazio:
    echo %TOKEN_FILE%
    pause
    exit /b 1
)

rem ================== VALIDACAO ==================
if not exist "%PDV%" (
    echo [ERRO] PDV nao encontrado:
    echo %PDV%
    pause
    exit /b 1
)

for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "(Get-Item '%PDV%').VersionInfo.FileVersion.Trim()"`) do set "VERSAO=%%V"

if not defined VERSAO (
    echo [ERRO] Nao foi possivel obter a versao do PDV.
    pause
    exit /b 1
)

echo Versao encontrada: [%VERSAO%]

if not "%CHANNEL%"=="test" if not "%CHANNEL%"=="beta" if not "%CHANNEL%"=="production" (
    echo [ERRO] CHANNEL invalido: %CHANNEL%
    echo Use test, beta ou production.
    pause
    exit /b 1
)

rem ================== GERACAO DO ZIP ==================
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel criar a pasta temporaria.
    pause
    exit /b 1
)

move /Y "%PDV%" "%TEMP_DIR%\" >nul
if errorlevel 1 (
    echo [ERRO] Nao foi possivel mover o PDV para a pasta temporaria.
    rd /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

if exist "%INTEGRADOR%" move /Y "%INTEGRADOR%" "%TEMP_DIR%\" >nul
if exist "%BACKUP%" move /Y "%BACKUP%" "%TEMP_DIR%\" >nul

set "ZIP_FILE=%DESTINO%%VERSAO%.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel criar o ZIP.
    rd /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

rd /s /q "%TEMP_DIR%"

echo ZIP criado:
echo %ZIP_FILE%

rem ================== ENVIO PARA A API ==================
where curl.exe >nul 2>&1
if errorlevel 1 (
    echo [ERRO] curl.exe nao foi encontrado no PATH.
    echo Instale ou habilite o curl do Windows antes de continuar.
        pause
    exit /b 1
)

echo Enviando para %API_URL% ...
if exist "%LOG_FILE%" del /q "%LOG_FILE%"
curl.exe --fail --silent --show-error --retry 2 ^
  -X POST "%API_URL%/api/v1/ci/artifacts" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "artifact=@%ZIP_FILE%;type=application/zip" ^
  -F "product=%PRODUCT%" ^
  -F "version=%VERSAO%" ^
    -F "channel=%CHANNEL%" > "%LOG_FILE%" 2>&1

type "%LOG_FILE%"

if errorlevel 1 (
    echo.
    echo [ERRO] O upload falhou.
    echo Consulte o log:
    echo %LOG_FILE%
    echo O ZIP foi mantido para uma nova tentativa.
    pause
    exit /b 1
)

echo.
echo Upload concluido com sucesso.
echo Produto: %PRODUCT%
echo Versao: %VERSAO%
echo Canal: %CHANNEL%

exit /b 0

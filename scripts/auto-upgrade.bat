@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo  HE THONG TU DONG NANG CAP & KHOI DONG LAI MAY CHU
echo ========================================================

echo [1/5] Kich hoat che do bao tri...
echo {"started_at":"%DATE% %TIME%"} > .maintenance

echo [2/5] Kiem tra xem co thu vien package.json nao thay doi khong...
set NEED_INSTALL=0
for /f "tokens=*" %%F in ('git diff --name-only HEAD origin/main ^| findstr /i "package.json"') do (
    set NEED_INSTALL=1
)

echo [3/5] Dang keo ma nguon moi nhat tu GitHub...
call git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the pull code tu GitHub!
    if exist .maintenance del .maintenance
    exit /b %ERRORLEVEL%
)

if "!NEED_INSTALL!"=="1" (
    echo [3.1/5] Phat hien goi thu vien moi, dang cai dat (npm install)...
    call npm install
) else (
    echo [3.1/5] Khong co goi thu vien moi, bo qua npm install de tang toc do nang cap!
)

echo [4/5] Dang toi uu va bien dich he thong (npm run build)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Bien dich bi loi!
    if exist .maintenance del .maintenance
    exit /b %ERRORLEVEL%
)

echo [5/5] Hoan tat! Go co bao tri va khoi dong lai may chu...
if exist .maintenance del .maintenance

echo Dang giai phong port 3000...
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

timeout /t 2 /nobreak >nul

echo Dang khoi dong lai may chu Next.js san sang phuc vu...
start "Tuition Admin Server" cmd.exe /c "npm start"

echo ========================================================
echo  NANG CAP THANH CONG! MAY CHU DA HOAT DONG TRO LAI.
echo ========================================================

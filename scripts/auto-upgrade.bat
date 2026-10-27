@echo off
echo ========================================================
echo  HE THONG TU DONG NANG CAP & KHOI DONG LAI MAY CHU
echo ========================================================
echo [1/5] Kich hoat che do bao tri...
echo {"started_at":"%DATE% %TIME%"} > .maintenance

echo [2/5] Dang tai ban cap nhat moi nhat tu GitHub...
call git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the pull code tu GitHub!
    if exist .maintenance del .maintenance
    exit /b %ERRORLEVEL%
)

echo [3/5] Dang kiem tra va cai dat goi thu vien moi (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the cai dat thu vien!
    if exist .maintenance del .maintenance
    exit /b %ERRORLEVEL%
)

echo [4/5] Dang toi uu va bien dich he thong (npm run build)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Bien dich bi loi!
    if exist .maintenance del .maintenance
    exit /b %ERRORLEVEL%
)

echo [5/5] Hoan tat! Go co bao tri va khoi dong lai dich vu...
if exist .maintenance del .maintenance

echo Giai phong port 3000 neu dang bi chiem dung...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Dang khoi dong may chu Next.js...
start "" /b npm start
echo ========================================================
echo  NANG CAP THANH CONG! MAY CHU DA HOAT DONG BINH THUONG.
echo ========================================================

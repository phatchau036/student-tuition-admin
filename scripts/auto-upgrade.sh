#!/bin/bash
set -e

echo "========================================================"
echo " HE THONG TU DONG NANG CAP & KHOI DONG LAI MAY CHU"
echo "========================================================"

echo "[1/5] Kich hoat che do bao tri..."
echo '{"started_at":"'$(date)'"}' > .maintenance

NEED_INSTALL=0
if git diff --name-only HEAD origin/main | grep -i "package.json" > /dev/null; then
    NEED_INSTALL=1
fi

echo "[2/5] Dang tai ban cap nhat moi nhat tu GitHub..."
git pull origin main

if [ "$NEED_INSTALL" -eq 1 ]; then
    echo "[3/5] Phat hien thu vien moi, dang chay npm install..."
    npm install
else
    echo "[3/5] Khong co goi moi, bo qua npm install de tang toc!"
fi

echo "[4/5] Dang bien dich he thong (npm run build)..."
npm run build

echo "[5/5] Hoan tat! Go co bao tri va khoi dong lai dich vu..."
rm -f .maintenance

echo "Giai phong port 3000..."
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

echo "Dang khoi dong lai may chu Next.js..."
nohup npm start > server.log 2>&1 &
echo "========================================================"
echo " NANG CAP THANH CONG! MAY CHU DA HOAT DONG TRO LAI."
echo "========================================================"

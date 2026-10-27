#!/bin/bash
set -e

echo "========================================================"
echo " HE THONG TU DONG NANG CAP & KHOI DONG LAI MAY CHU"
echo "========================================================"

echo "[1/5] Kich hoat che do bao tri..."
echo '{"started_at":"'$(date)'"}' > .maintenance

echo "[2/5] Dang tai ban cap nhat moi nhat tu GitHub..."
git pull origin main

echo "[3/5] Dang kiem tra va cai dat thu vien moi (npm install)..."
npm install

echo "[4/5] Dang bien dich he thong (npm run build)..."
npm run build

echo "[5/5] Hoan tat! Go co bao tri va khoi dong lai dich vu..."
rm -f .maintenance

echo "Giai phong port 3000 neu dang bi chiem dung..."
fuser -k 3000/tcp || true

echo "Dang khoi dong lai may chu Next.js..."
nohup npm start > server.log 2>&1 &
echo "NANG CAP THANH CONG!"

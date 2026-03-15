@echo off
echo 啟動 Spring Boot 後端...
start cmd /k "cd SERVER\server && mvn spring-boot:run"

echo 啟動 Vite + React 前端...
start cmd /k "cd src && npm run dev"

echo 前後端啟動完成。
pause
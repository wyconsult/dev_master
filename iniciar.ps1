# LicitaTraker - Script de inicialização para Windows PowerShell
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LicitaTraker - Sistema de Licitacoes" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "Acesse: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""

$env:NODE_ENV = "development"
npx tsx server/index.ts
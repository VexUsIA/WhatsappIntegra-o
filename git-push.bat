@echo off
echo ========================================
echo  Subindo projeto para GitHub
echo ========================================
echo.

REM Inicializar Git
echo [1/6] Inicializando repositorio Git...
git init
if %errorlevel% neq 0 (
    echo ERRO: Git nao encontrado. Verifique se o Git esta instalado.
    pause
    exit /b 1
)
echo OK!
echo.

REM Adicionar remote
echo [2/6] Adicionando remote do GitHub...
git remote add origin https://github.com/VexUsIA/WhatsappIntegra-o.git
if %errorlevel% neq 0 (
    echo Aviso: Remote ja pode existir. Continuando...
    git remote set-url origin https://github.com/VexUsIA/WhatsappIntegra-o.git
)
echo OK!
echo.

REM Verificar status
echo [3/6] Verificando arquivos...
git status
echo.

REM Adicionar arquivos
echo [4/6] Adicionando arquivos ao staging...
git add .
echo OK!
echo.

REM Commit
echo [5/6] Criando commit inicial...
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"
if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar commit
    pause
    exit /b 1
)
echo OK!
echo.

REM Push
echo [6/6] Enviando para GitHub...
git branch -M main
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Falha ao fazer push
    echo.
    echo Possiveis causas:
    echo - Voce precisa fazer login no Git
    echo - O repositorio nao existe no GitHub
    echo - Voce nao tem permissao
    echo.
    echo Tente executar manualmente:
    echo   git push -u origin main
    echo.
    pause
    exit /b 1
)
echo.

echo ========================================
echo  SUCESSO! Projeto enviado para GitHub
echo ========================================
echo.
echo Acesse: https://github.com/VexUsIA/WhatsappIntegra-o
echo.
pause

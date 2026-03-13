# 🚀 Guia Manual - Subir para GitHub

## Opção 1: Executar Script Automático

1. Abra o **Git Bash** (não o CMD normal)
2. Navegue até a pasta do projeto:
   ```bash
   cd "/c/Users/leand/OneDrive/Área de Trabalho/Projeto Whatsapp"
   ```
3. Execute os comandos abaixo

## Opção 2: Comandos Manuais (Git Bash)

Abra o **Git Bash** e execute:

```bash
# 1. Navegar até a pasta
cd "/c/Users/leand/OneDrive/Área de Trabalho/Projeto Whatsapp"

# 2. Inicializar Git
git init

# 3. Adicionar remote
git remote add origin https://github.com/VexUsIA/WhatsappIntegra-o.git

# 4. Verificar o que será commitado
git status

# 5. Adicionar todos os arquivos
git add .

# 6. Criar commit
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"

# 7. Renomear branch para main
git branch -M main

# 8. Push para GitHub
git push -u origin main
```

## Opção 3: Usar GitHub Desktop

1. Baixe e instale: https://desktop.github.com/
2. Abra GitHub Desktop
3. File → Add Local Repository
4. Selecione a pasta do projeto
5. Clique em "Publish repository"
6. Escolha o repositório: `VexUsIA/WhatsappIntegra-o`
7. Clique em "Publish"

## Opção 4: Usar VS Code

1. Abra a pasta no VS Code
2. Vá na aba "Source Control" (Ctrl+Shift+G)
3. Clique em "Initialize Repository"
4. Clique nos "..." → Remote → Add Remote
5. Cole: `https://github.com/VexUsIA/WhatsappIntegra-o.git`
6. Digite uma mensagem de commit: "feat: initial commit"
7. Clique em "Commit"
8. Clique em "Publish Branch"

## ⚠️ Se der erro de autenticação:

### Configurar Git (primeira vez):

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

### Autenticar no GitHub:

**Opção A - Token (Recomendado):**
1. Vá em: https://github.com/settings/tokens
2. Generate new token (classic)
3. Marque: `repo` (full control)
4. Copie o token
5. Quando pedir senha no push, cole o token

**Opção B - GitHub CLI:**
```bash
# Instalar: https://cli.github.com/
gh auth login
```

## ✅ Verificar se subiu:

Acesse: https://github.com/VexUsIA/WhatsappIntegra-o

Deve aparecer todos os arquivos!

## 🐛 Problemas Comuns:

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/VexUsIA/WhatsappIntegra-o.git
```

### "failed to push some refs"
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### "Permission denied"
- Verifique se está logado no GitHub
- Use token de acesso pessoal em vez de senha

---

Qualquer dúvida, me avise! 🚀

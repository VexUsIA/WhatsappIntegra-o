# 🔧 Correção do Erro "src refspec main does not match any"

## O Problema

A branch `main` não existe porque o commit ainda não foi feito corretamente.

## Solução Rápida

Execute estes comandos no **Git Bash**:

```bash
# 1. Verificar status
git status

# 2. Se houver arquivos não commitados, adicione:
git add .

# 3. Fazer o commit
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"

# 4. Verificar qual branch você está
git branch

# 5. Se estiver em 'master', renomeie para 'main':
git branch -M main

# 6. Agora sim, push:
git push -u origin main
```

## Passo a Passo Detalhado

### 1. Verificar se há commit

```bash
git log
```

**Se der erro "does not have any commits yet"**, faça:

```bash
git add .
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"
```

### 2. Verificar branch atual

```bash
git branch
```

**Se aparecer `* master`**, renomeie:

```bash
git branch -M main
```

### 3. Push

```bash
git push -u origin main
```

## Se AINDA der erro

### Opção A: Forçar criação da branch

```bash
git checkout -b main
git push -u origin main
```

### Opção B: Usar master em vez de main

```bash
git push -u origin master
```

Depois no GitHub:
1. Settings → Branches
2. Mude default branch para `master`

### Opção C: Resetar tudo e começar de novo

```bash
# Remover .git
rm -rf .git

# Começar do zero
git init
git add .
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"
git branch -M main
git remote add origin https://github.com/VexUsIA/WhatsappIntegra-o.git
git push -u origin main
```

## Comandos para Copiar e Colar

```bash
cd "/c/Users/leand/OneDrive/Área de Trabalho/Projeto Whatsapp"
git add .
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"
git branch -M main
git push -u origin main
```

---

Execute isso e me diga o resultado! 🚀

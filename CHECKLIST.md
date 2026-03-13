# ✅ Checklist Antes de Subir no GitHub

## Arquivos Sensíveis

- [ ] Arquivo `.env` NÃO está commitado
- [ ] Nenhuma credencial no código
- [ ] Nenhum token ou API key exposto
- [ ] Auth states do WhatsApp não incluídos

## Configuração

- [ ] `.gitignore` está correto
- [ ] `.env.example` está atualizado
- [ ] `.env.simulador` está incluído
- [ ] `package.json` tem informações corretas

## Documentação

- [ ] README.md está completo
- [ ] Instruções de instalação estão claras
- [ ] Links funcionam
- [ ] Screenshots/GIFs adicionados (opcional)

## Código

- [ ] Código compila sem erros (`npm run build`)
- [ ] Não há console.logs desnecessários
- [ ] Comentários úteis adicionados
- [ ] Código formatado

## Testes

- [ ] Testado localmente com simulador
- [ ] Painel web funciona
- [ ] Envio de mensagens funciona
- [ ] QR Code aparece

## GitHub

- [ ] Repositório criado no GitHub
- [ ] README.md tem badges (opcional)
- [ ] LICENSE escolhida
- [ ] Topics/tags configuradas

## Comandos para Subir

```bash
# 1. Inicializar Git (se ainda não fez)
git init

# 2. Adicionar remote
git remote add origin https://github.com/seu-usuario/scom-whatsapp-integration.git

# 3. Verificar o que será commitado
git status

# 4. Adicionar arquivos
git add .

# 5. Commit
git commit -m "feat: initial commit - SCOM WhatsApp Integration v1.0.0"

# 6. Push
git branch -M main
git push -u origin main
```

## Após Subir

- [ ] Verificar se todos os arquivos subiram
- [ ] Testar clone em outra pasta
- [ ] Adicionar descrição no GitHub
- [ ] Adicionar topics: whatsapp, erp, nodejs, typescript, baileys
- [ ] Criar primeira release (v1.0.0)
- [ ] Adicionar badges no README (opcional)

## Badges Sugeridas (README.md)

```markdown
![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-%5E5.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
```

---

✅ Tudo pronto? Pode subir! 🚀

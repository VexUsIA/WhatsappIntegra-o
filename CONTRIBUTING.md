# Contribuindo para SCOM WhatsApp Integration

Obrigado por considerar contribuir com este projeto! 🎉

## Como Contribuir

### 1. Fork o Projeto

Clique no botão "Fork" no topo da página do GitHub.

### 2. Clone seu Fork

```bash
git clone https://github.com/seu-usuario/scom-whatsapp-integration.git
cd scom-whatsapp-integration
```

### 3. Crie uma Branch

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-bugfix
```

### 4. Configure o Ambiente

```bash
# Subir simulador
cd "Simulador ERP/docker"
docker-compose up -d
cd ../..

# Configurar
cp .env.simulador .env
npm install
npm run prisma:generate
npm run create:store
```

### 5. Faça suas Alterações

- Escreva código limpo e bem documentado
- Siga os padrões do projeto
- Adicione testes se possível

### 6. Teste suas Alterações

```bash
npm run dev
```

Teste manualmente:
- Painel web: http://localhost:3000
- Simulador: Abra `Simulador ERP/painel/index.html`
- Verifique logs: `tail -f logs/combined.log`

### 7. Commit suas Alterações

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

**Padrão de commits**:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

### 8. Push para seu Fork

```bash
git push origin feature/minha-feature
```

### 9. Abra um Pull Request

Vá até o repositório original e clique em "New Pull Request".

## Diretrizes

### Código

- Use TypeScript
- Siga o ESLint (se configurado)
- Mantenha funções pequenas e focadas
- Comente código complexo

### Documentação

- Atualize o README.md se necessário
- Documente novas funcionalidades
- Adicione exemplos de uso

### Testes

- Teste localmente antes de enviar
- Verifique se não quebrou funcionalidades existentes

## Reportar Bugs

Abra uma issue com:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots se aplicável
- Versão do Node.js e sistema operacional

## Sugerir Funcionalidades

Abra uma issue com:
- Descrição da funcionalidade
- Por que seria útil
- Exemplos de uso

## Dúvidas?

Abra uma issue com a tag `question`.

---

Obrigado por contribuir! 🚀

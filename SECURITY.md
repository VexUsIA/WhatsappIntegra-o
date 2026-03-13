# Política de Segurança

## Versões Suportadas

| Versão | Suportada          |
| ------ | ------------------ |
| 1.0.x  | :white_check_mark: |

## Reportar uma Vulnerabilidade

Se você descobrir uma vulnerabilidade de segurança, por favor **NÃO** abra uma issue pública.

### Como Reportar

1. **Email**: Envie detalhes para [seu-email@exemplo.com]
2. **Informações necessárias**:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestões de correção (se houver)

### O que esperar

- Resposta inicial em até 48 horas
- Avaliação da vulnerabilidade em até 7 dias
- Correção e release em até 30 dias (dependendo da gravidade)

## Boas Práticas de Segurança

### Para Usuários

1. **Nunca compartilhe**:
   - Arquivo `.env`
   - Tokens JWT
   - Credenciais do banco
   - Auth states do WhatsApp

2. **Em Produção**:
   - Use senhas fortes
   - Mude `JWT_SECRET` para valor aleatório
   - Configure HTTPS
   - Use firewall
   - Mantenha dependências atualizadas

3. **Backup**:
   - Faça backup regular do PostgreSQL
   - Guarde auth_states em local seguro

### Para Desenvolvedores

1. **Nunca commite**:
   - Arquivos `.env`
   - Credenciais
   - Tokens
   - Dados sensíveis

2. **Code Review**:
   - Revise código antes de merge
   - Verifique injeção SQL
   - Valide inputs do usuário

3. **Dependências**:
   - Mantenha atualizadas
   - Use `npm audit` regularmente
   - Revise dependências novas

## Vulnerabilidades Conhecidas

Nenhuma no momento.

## Atualizações de Segurança

Atualizações críticas serão anunciadas via:
- GitHub Releases
- Issues com tag `security`

---

Obrigado por ajudar a manter este projeto seguro! 🔒

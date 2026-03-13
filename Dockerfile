# Use Node.js 20 LTS
FROM node:20-alpine

# Instalar dependências do sistema (incluindo git)
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Criar diretório da aplicação
WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm install --omit=dev && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build TypeScript (precisa das devDependencies)
RUN npm install && \
    npm run build && \
    npm prune --omit=dev

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]

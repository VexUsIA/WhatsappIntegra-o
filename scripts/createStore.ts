import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

async function createStore() {
  console.log('\n=== Criar Nova Loja ===\n');

  const id         = await ask('ID da loja (ex: loja_001): ');
  const storeCode  = await ask('Codigo (ex: LOJA01): ');
  const storeName  = await ask('Nome da loja: ');
  const email      = await ask('Email de acesso: ');
  const password   = await ask('Senha: ');

  rl.close();

  const hashed = await bcrypt.hash(password, 10);

  const store = await prisma.store.create({
    data: { id, storeCode, storeName, email, password: hashed, isActive: true },
  });

  console.log('\nLoja criada com sucesso!');
  console.log(`ID:    ${store.id}`);
  console.log(`Email: ${store.email}`);
  console.log(`Acesse http://localhost:3000 para fazer login.\n`);
}

createStore()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createStore() {
  const email = 'admin@loja01.com';
  const password = 'senha123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Usar o mesmo ID do simulador para compatibilidade
  const store = await prisma.store.create({
    data: {
      id: 'loja_001', // Mesmo tenant_id do simulador
      storeCode: 'LOJA01',
      storeName: 'Loja do João - Centro',
      email,
      password: hashedPassword,
      isActive: true,
    },
  });

  console.log('✅ Loja criada com sucesso!');
  console.log('ID:', store.id);
  console.log('Email:', email);
  console.log('Senha:', password);
  console.log('');
  console.log('Agora crie uma conexão WhatsApp:');
  console.log('Acesse http://localhost:3000 e faça login');
  console.log('Ou execute no Adminer (http://localhost:8080):');
  console.log('');
  console.log(`INSERT INTO whatsapp_connections (id, store_id, connection_name, phone_number, is_active)`);
  console.log(`VALUES (gen_random_uuid(), 'loja_001', 'Vendas', '5511999999999', true);`);
}

createStore()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

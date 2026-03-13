#!/bin/bash

echo "Commitando correções de TypeScript..."

git add .
git commit -m "fix: resolve TypeScript errors for Railway deployment

- Add @types/pg dependency
- Fix Redis connection configuration (use connection options instead of IORedis instance)
- Fix messageQueue import path in poller
- Fix queue name consistency (whatsapp-messages)"

git push

echo "Pronto! Agora o Railway vai fazer novo deploy automaticamente."

#!/bin/bash

echo "Gerando package-lock.json..."

# Se você tiver npm instalado localmente, execute:
# npm install

# Ou crie um package-lock.json vazio para o Railway gerar
echo '{
  "name": "scom-whatsapp-integration",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {}
}' > package-lock.json

echo "package-lock.json criado!"

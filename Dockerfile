
FROM node:20-alpine 
RUN apk update && apk upgrade

# Define a pasta de trabalho
WORKDIR /app

# Copia os arquivos de dependências primeiro (otimiza o build)
COPY package*.json ./

# Instala apenas dependências de produção (economiza espaço)
RUN npm install --omit=dev

# Copia a pasta compilada (Certifique-se que o nome na sua máquina é 'build')
COPY build/ ./build

# Informa que a aplicação usa a porta 5002
EXPOSE 5002

# Comando para iniciar a aplicação direto pelo Node (mais rápido)
CMD ["node", "build/server.js"]
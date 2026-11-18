FROM node:24-alpine

# Instala ferramentas do sistema para extração e manipulação gráfica de PDFs
RUN apk add --no-cache poppler-utils imagemagick imagemagick-svg librsvg

WORKDIR /app

# Copia arquivos do projeto (zero dependências npm de produção)
COPY package.json ./
COPY bin ./bin
COPY src ./src

# Garante permissões de execução
RUN chmod +x bin/tatupeba.js

# Variáveis padrão
ENV PORT=3001
ENV SYNC_INTERVAL_HOURS=2

EXPOSE 3001

CMD ["node", "bin/tatupeba.js", "serve", "--port", "3001"]

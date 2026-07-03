FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json README.md ./
COPY api ./api
COPY credentials ./credentials
COPY nodes ./nodes
COPY index.ts ./index.ts
COPY scripts ./scripts
COPY test ./test

RUN npm ci
RUN npm test
RUN npm run build

FROM n8nio/n8n:latest

USER root

RUN mkdir -p /home/node/.n8n/custom/node_modules/n8n-nodes-dokaai

COPY --from=builder /app/package.json /home/node/.n8n/custom/node_modules/n8n-nodes-dokaai/package.json
COPY --from=builder /app/README.md /home/node/.n8n/custom/node_modules/n8n-nodes-dokaai/README.md
COPY --from=builder /app/dist /home/node/.n8n/custom/node_modules/n8n-nodes-dokaai/dist

RUN chown -R node:node /home/node/.n8n/custom

USER node

ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom

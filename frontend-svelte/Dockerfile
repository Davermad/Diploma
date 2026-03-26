FROM node:22-alpine
WORKDIR /app
EXPOSE 5173
# Код монтируется в /app; node_modules — именованный volume в compose.
# Первый запуск: npm ci ставит зависимости в volume.
CMD ["sh", "-c", "npm ci && npm run dev -- --host 0.0.0.0 --port 5173"]

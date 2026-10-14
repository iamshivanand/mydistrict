FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/
RUN npm install --workspaces --include-workspace-root || npm install
COPY . .
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

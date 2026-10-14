FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/
RUN npm install --workspaces --include-workspace-root || npm install
COPY . .
WORKDIR /app/apps/admin
EXPOSE 3001
CMD ["npm", "run", "dev"]

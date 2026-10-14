FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json ./services/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/
RUN npm install --workspaces --include-workspace-root || npm install
COPY . .
WORKDIR /app/services/api
EXPOSE 4000
CMD ["npm", "run", "dev"]

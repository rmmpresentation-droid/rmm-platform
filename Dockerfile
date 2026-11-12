FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY . .
ENV NODE_ENV=development
EXPOSE 8081
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8081"]

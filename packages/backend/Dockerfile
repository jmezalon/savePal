# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm install

# Copy backend source code
COPY packages/backend ./packages/backend

# Generate Prisma client
WORKDIR /app/packages/backend
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

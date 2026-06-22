FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Expo CLI globally
RUN npm install -g expo-cli

# Copy the rest of the application
COPY . .

# Expose Metro bundler ports
EXPOSE 8081 19000 19001 19002

# Start the Expo server
CMD ["npm", "start"]

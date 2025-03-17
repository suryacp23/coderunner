# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    openjdk17 \
    python3 \
    py3-pip \
    g++ \
    gcc \
    make 

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --omit=dev  # Omit dev dependencies for production

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 3001

# Define the command to run the application
CMD ["node", "server.js"]

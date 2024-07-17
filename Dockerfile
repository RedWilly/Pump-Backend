# Use an official Node runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# If you're using TypeScript, you might need to install it globally
RUN npm install -g typescript

# Copy the rest of the application code
COPY . .

# If you have any build steps (e.g., for TypeScript), run them here
RUN npm run build

# Expose the port the app runs on
EXPOSE 9006

# Command to run the application
CMD ["npm", "start"]
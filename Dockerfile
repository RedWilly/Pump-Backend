# Use an official Node runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the range of ports the app might use
EXPOSE 9006-9106

# Add a health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$(cat /tmp/app_port) || exit 1

# Command to run the application
CMD npm start | tee /dev/stderr | sed -n 's/.*Server running on port \([0-9]*\).*/\1/p' > /tmp/app_port && tail -f /dev/null
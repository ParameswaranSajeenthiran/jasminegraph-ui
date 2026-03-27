# Use the prebuilt prerequisites image instead of rebuilding from node:18-alpine
FROM jasminegraph/jasminegraph-ui-frontend-prerequisites:20251129T095516

WORKDIR /app

# Copy only the app source code (excluding node_modules or package.json again)
COPY . .

# Pass build-time env variable
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the app
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]

# Stage 1: build the app with Node
FROM node:22-alpine AS build
WORKDIR /app
# Install dependencies before copying the code, so this layer is cached when only code changes
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Test stage: only built when asked for, with `docker build --progress=plain --no-cache-filter test --target test frontend`
FROM build AS test
RUN npm test

# Stage 2: serve the built files with nginx (Node isn't needed at runtime)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

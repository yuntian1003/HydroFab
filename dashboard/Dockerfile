# ------- build stage -------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ------- runtime stage (nginx) -------
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config to support Angular routing + proxy to API
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/hydrofab-dashboard/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

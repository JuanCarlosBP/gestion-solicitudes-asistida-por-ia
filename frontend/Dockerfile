FROM node:24.13.0-bookworm-slim@sha256:4660b1ca8b28d6d1906fd644abe34b2ed81d15434d26d845ef0aced307cf4b6f AS construccion
WORKDIR /construccion
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY angular.json tsconfig*.json ./
COPY src src
COPY public public
RUN npm run build

FROM nginx:1.28.3-trixie@sha256:146adea4768b83c607d0bdfa4188464e3da6e0a3ad4475db1d1d8f64f27c29cc
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=construccion /construccion/dist/gestion-solicitudes-frontend/browser /usr/share/nginx/html
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]

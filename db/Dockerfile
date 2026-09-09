FROM postgres:16-alpine

ENV POSTGRES_DB=hydrofab
ENV POSTGRES_USER=fab
ENV POSTGRES_PASSWORD=fab_secret

COPY init.sql /docker-entrypoint-initdb.d/

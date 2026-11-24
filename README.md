# Preparcial — Usuarios y roles (NestJS)

## Requisitos

- Node.js y npm.
- Docker Desktop encendido.
- Una terminal ubicada en la carpeta que contiene `package.json` y `compose.yaml`.

## Ejecutar por primera vez

Ejecuta **uno por uno** desde la carpeta principal:

```bash
npm ci
npm run preparar:env
docker compose up -d --wait
npm run db:preparar
npm run start:dev
```

- `preparar:env` crea un `.env` con una clave JWT aleatoria, **sin reemplazar** el que ya tengas.
- `db:preparar` crea las tablas y **solo el rol `admin` y su usuario**, si faltan. No borra datos existentes.
- API: `http://localhost:3000`.

## Siguientes arranques

En la carpeta del proyecto:

```bash
docker compose up -d --wait
npm run start:dev
```

## Detener

Presiona **Control + C** en la terminal de NestJS. Después:

```bash
docker compose stop
```

## Reiniciar una base local de ejercicios (opcional)

**Peligro: esto elimina definitivamente los datos almacenados en el volumen PostgreSQL de este proyecto.** No lo ejecutes si quieres conservar usuarios y roles creados.

```bash
docker compose down -v
docker compose up -d --wait
npm run db:preparar
```

Tras el reinicio habrá únicamente el usuario y el rol administrador iniciales.

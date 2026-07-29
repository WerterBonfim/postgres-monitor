# Postgres Monitor

Ferramentas de monitoramento e análise PostgreSQL.

## Portas

- API: `http://localhost:5001`
- Docs (Scalar, Development): `http://localhost:5001/scalar`
- OpenAPI: `http://localhost:5001/openapi/v1.json`
- Frontend: `http://localhost:5174`
- Postgres (Docker, na raiz do monorepo): `localhost:5432`

## Postgres local

Na raiz do monorepo:

```bash
docker compose up -d
```

## Backend

```bash
cd backend/PostgresMonitor.Api
dotnet run
```

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

API padrão: `VITE_API_BASE_URL=http://localhost:5001` (ver `.env.example`).

## Build

```bash
# API
cd backend && dotnet build PostgresMonitor.slnx

# Frontend
cd frontend && pnpm build
```

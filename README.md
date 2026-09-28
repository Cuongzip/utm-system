# UTM System Microservices

Backend microservices built with **Spring Boot 4** (Java 21), **PostgreSQL 16**, **Nginx API Gateway**, fully containerized with **Docker Compose**.

## Tech Stack

| | Technology |
|---|---|
| **Framework** | Spring Boot 4.0.2, Spring Cloud 2025.1.1 |
| **Database** | PostgreSQL 16, Liquibase (migration) |
| **Security** | Spring Security OAuth2 Resource Server |
| **API Docs** | SpringDoc OpenAPI 3 / Swagger UI |
| **Gateway** | Nginx 1.27.2 (reverse proxy) |
| **Build** | Maven multi-module, Docker multi-stage build |

## Architecture

```
Client ──► Nginx :8081 ──┬──► Backoffice BFF :8082 ──► Keycloak :8080 (Auth / Token)
                         ├──► Drone Service :8085 ──► PostgreSQL :5432
                         └──► Swagger UI :8080
```

- **Nginx** routes `/backoffice-bff/*` → Backoffice BFF, `/drone/*` (and `/api/v1/drones/*`) → Drone Service, `/swagger-ui/*` → Swagger UI
- **Liquibase** handles DB migrations on startup
- **common-library** module shares base entities, exception handling, security config across services

## Quick Start

1. Create the environment file:
```bash
cp .env.example .env
```

2. Build and start services:
```bash
docker compose up -d --build
```

## Access

| Service | URL |
|---|---|
| Swagger UI (qua Nginx) | http://localhost:8081/swagger-ui/ |
| Backoffice BFF API (qua Nginx) | http://localhost:8081/backoffice-bff/auth/login |
| Drone API (qua Nginx) | http://localhost:8081/drone/api/v1/drones |
| Keycloak Admin Console | http://localhost:8080/admin/ |
| pgAdmin | http://localhost:5050 |
| PostgreSQL | `localhost:54320` |

**pgAdmin login:** `admin@utm.com` / `admin`

**PostgreSQL connection (inside pgAdmin):**

| Field | Value |
|---|---|
| Host | `postgres` |
| Port | `5432` |
| Database | `utm_drone` |
| Username / Password | `admin` / `admin` |

## Local Development

Run only infrastructure, then start the service on your machine:

```bash
docker compose up -d postgres pgadmin nginx swagger-ui
./mvnw -pl drone spring-boot:run
```

## License

[MIT](LICENSE)

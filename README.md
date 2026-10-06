# UTM (Unmanned Traffic Management) System

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-21-blue.svg)](https://www.oracle.com/java/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Keycloak](https://img.shields.io/badge/Keycloak-26.0.2-red.svg)](https://www.keycloak.org/)
[![Nginx](https://img.shields.io/badge/Nginx-1.27.2-green.svg)](https://nginx.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A cloud-native, microservices-based platform designed for **Unmanned Aircraft System Traffic Management (UTM)**. The platform provides airspace volume reservations, drone registry and tracking, vertiport/hub operations, flight authorization planning, simulated telemetry ingestion, automated conflict detection & resolution, and backoffice administration.

---

## Tech Stack

| Component              | Technology                        | Version / Notes                                              |
| :--------------------- | :-------------------------------- | :----------------------------------------------------------- |
| **Language & Runtime** | Java                              | OpenJDK 21 (LTS)                                             |
| **Framework**          | Spring Boot / Spring Cloud        | Spring Boot `4.0.2`, Spring Cloud `2025.1.1`                 |
| **Security & IAM**     | Keycloak / OAuth2 Resource Server | Keycloak `26.0.2`, JWT validation, Role-based Access Control |
| **Database**           | PostgreSQL                        | PostgreSQL `16-alpine`, Database-per-service pattern         |
| **Schema Migration**   | Liquibase                         | Automated schema evolution on service startup                |
| **API Gateway**        | Nginx                             | Nginx `1.27.2` (Reverse proxy, path routing, virtual hosts)  |
| **API Documentation**  | SpringDoc OpenAPI & Swagger UI    | OpenAPI 3, SpringDoc `3.0.1`, Swagger UI `v5.17.14`          |
| **Object Mapping**     | MapStruct & Lombok                | MapStruct `1.6.3`, Lombok `1.18.42`                          |
| **Containerization**   | Docker & Docker Compose           | Multi-stage Dockerfiles for optimized production images      |

---

## Microservices Catalog

| Service              | Host Port | Context Path      | Primary Responsibilities                                                                                                                   |
| :------------------- | :-------- | :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **`common-library`** | —         | —                 | Shared foundation module: Base entities, standardized API responses, global exception handling, security filter configs, and common DTOs.  |
| **`backoffice-bff`** | `8082`    | `/backoffice-bff` | Backend-For-Frontend for management consoles; orchestrates user authentication with Keycloak, userinfo retrieval, and service aggregation. |
| **`drone`**          | `8085`    | `/drone`          | Drone & UAS fleet management, registration, operator linkage, specifications, and operational status.                                      |
| **`hub`**            | `8084`    | `/hub`            | Drone hubs, vertiports, landing pads, charging stations, and physical docking facilities.                                                  |
| **`flight`**         | `8086`    | `/flight`         | Flight plan creation, route approval workflow, schedule validations, and mission tracking.                                                 |
| **`airspace`**       | `8087`    | `/airspace`       | Airspace volume definitions, geofencing, restricted flight zones (NFZ), and airspace segment capacity.                                     |
| **`telemetry`**      | `8089`    | `/telemetry`      | Real-time drone position telemetry ingestion (GPS coordinates, altitude, velocity, heading, battery).                                      |
| **`simulation`**     | `8090`    | `/simulation`     | Autonomous flight simulation engine and virtual flight mission execution generating synthetic telemetry streams.                           |
| **`conflict`**       | `8092`    | `/conflict`       | Tactical & strategic conflict detection watchdog, separation loss alerting, CPA/TCPA prediction, and resolution management.                |

---

## Access & Routing Matrix

All APIs are exposed through the Nginx Gateway on port **`8081`**, but can also be reached directly via their assigned host ports during development.

### Application Services

| Service                | Access via Nginx Gateway (Port 8081)                                                   | Direct Container / Host Port            | OpenAPI Docs Endpoint                 |
| :--------------------- | :------------------------------------------------------------------------------------- | :-------------------------------------- | :------------------------------------ |
| **Unified Swagger UI** | [http://localhost:8081/swagger-ui/](http://localhost:8081/swagger-ui/) _(or root `/`)_ | `http://localhost:8088`                 | Aggregated dashboard for all services |
| **Backoffice BFF**     | `http://localhost:8081/backoffice-bff/`                                                | `http://localhost:8082/backoffice-bff/` | `/backoffice-bff/v3/api-docs`         |
| **Drone Service**      | `http://localhost:8081/drone/api/v1/drones`                                            | `http://localhost:8085/drone/`          | `/drone/v3/api-docs`                  |
| **Hub Service**        | `http://localhost:8081/hub/api/v1/hubs`                                                | `http://localhost:8084/hub/`            | `/hub/v3/api-docs`                    |
| **Flight Service**     | `http://localhost:8081/flight/api/v1/flights`                                          | `http://localhost:8086/flight/`         | `/flight/v3/api-docs`                 |
| **Airspace Service**   | `http://localhost:8081/airspace/api/v1/airspace`                                       | `http://localhost:8087/airspace/`       | `/airspace/v3/api-docs`               |
| **Telemetry Service**  | `http://localhost:8081/telemetry/api/v1/telemetry`                                     | `http://localhost:8089/telemetry/`      | `/telemetry/v3/api-docs`              |
| **Simulation Service** | `http://localhost:8081/simulation/api/v1/simulation`                                   | `http://localhost:8090/simulation/`     | `/simulation/v3/api-docs`             |
| **Conflict Service**   | `http://localhost:8081/conflict/api/v1/conflicts`                                      | `http://localhost:8092/conflict/`       | `/conflict/v3/api-docs`               |

### Infrastructure Services

| Service                        | URL                                                                   | Credentials / Notes                                                                                                    |
| :----------------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Keycloak IAM Admin Console** | [http://localhost:8080/admin/](http://localhost:8080/admin/)          | Username: `admin` \| Password: `admin`<br/>Pre-configured Realm: `UTM`                                                 |
| **pgAdmin 4**                  | [http://localhost:5050](http://localhost:5050)                        | Email: `admin@utm.com` \| Password: `admin`                                                                            |
| **PostgreSQL Database**        | `localhost:54320` _(External)_ \| `postgres:5432` _(Docker internal)_ | Username: `admin` \| Password: `admin`<br/>Auto-initializes 8 service DBs via [`postgres_init.sql`](postgres_init.sql) |

---

## Getting Started

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) (v24.0+) & [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- [Java Development Kit (JDK)](https://adoptium.net/) 21 or higher _(for local builds)_
- [Apache Maven](https://maven.apache.org/) 3.9+ _(for local builds)_

### 1. Environment Configuration

Clone the repository and copy the sample environment file:

```bash
cp .env.example .env
```

Review `.env` to customize default ports or credentials if necessary.

### 2. Run the Entire System with Docker Compose

Build all services and start containers in detached mode:

```bash
docker compose up -d --build
```

Verify that all containers are healthy:

```bash
docker compose ps
```

Access the unified OpenAPI documentation at [http://localhost:8081/swagger-ui/](http://localhost:8081/swagger-ui/).

---

## Local Development Workflow

When developing or debugging an individual microservice, it is recommended to run the infrastructure containers (databases, Keycloak, Nginx, Swagger) via Docker, while executing your target service directly on your host machine.

### Step 1: Build the Shared Library

Because all microservices depend on `common-library`, you **must** install it to your local Maven cache first:

```bash
mvn clean install -pl common-library -DskipTests
```

_(Alternatively, run `mvn clean install -DskipTests` from the root directory to compile all modules.)_

### Step 2: Spin Up Infrastructure Services

Launch only the required backing services:

```bash
docker compose up -d postgres pgadmin identity nginx swagger-ui
```

### Step 3: Run the Desired Microservice Locally

Run your service using Maven:

```bash
# Example: Run Drone Service
mvn -pl drone spring-boot:run

# Example: Run Flight Service
mvn -pl flight spring-boot:run

# Example: Run Backoffice BFF
mvn -pl backoffice-bff spring-boot:run
```

The service will automatically connect to PostgreSQL on port `5432` (or adjust `POSTGRES_PORT` in your IDE run configuration to `54320` when running outside Docker).

---

## Authentication & Security

1. **Realm**: The system imports the pre-configured realm `UTM` from [`identity/realm-export.json`](identity/realm-export.json) upon Keycloak initialization.
2. **Backoffice Login Flow**:
    - Authentication requests can be sent through the Backoffice BFF:

        ```http
        POST /backoffice-bff/auth/login
        Content-Type: application/json

        {
          "username": "admin",
          "password": "admin"
        }
        ```

    - The BFF exchanges credentials with Keycloak and returns JWT tokens (`access_token`, `refresh_token`).

3. **Resource Server Protection**: Core microservices validate JWT signatures and permissions issued by Keycloak before processing requests.

---

## Project Structure

```text
utm-system/
├── airspace/              # Airspace management microservice
├── backoffice-bff/        # Backoffice BFF & Keycloak auth aggregation
├── common-library/        # Shared core library (Base entities, DTOs, Security)
├── conflict/              # Conflict detection, loss-of-separation & resolution microservice
├── docs/                  # Architectural diagrams & design documentation
├── drone/                 # Drone fleet and registry microservice
├── flight/                # Flight operation & route planning microservice
├── hub/                   # Vertiport, hub & landing station microservice
├── identity/              # Keycloak realm configuration & theme assets
├── nginx/                 # Nginx API Gateway configuration & templates
├── simulation/            # Flight simulation engine microservice
├── telemetry/             # Real-time drone telemetry tracking microservice
├── docker-compose.yml     # Complete container composition
├── pom.xml                # Multi-module root Maven configuration
├── postgres_init.sql      # Multi-database initialization script
└── README.md
```

---

## License

This project is licensed under the [MIT License](LICENSE).

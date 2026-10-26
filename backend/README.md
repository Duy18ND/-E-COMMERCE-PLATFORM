# E-Commerce Microservices Platform

> **Migration**: Monolith → Full Microservices Architecture  
> **Day 1 (26/10)**: Project scaffold, Docker infrastructure, Service Discovery, API Gateway

## 🏗️ Architecture Overview

```
Client (Browser/Mobile)
        │
        ▼
  [API Gateway :8080]  ← Spring Cloud Gateway + Load Balancer
        │
   ┌────┴──────────────────────┐
   │         Eureka Registry    │
   │         :8761              │
   └────────────────────────────┘
        │
   ┌────┴────────────────────────────────┐
   ▼         ▼           ▼          ▼
[Auth]   [Product]   [Order]   [Payment]
:8081    :8082       :8083     :8084
   │         │           │          │
   └──────── MySQL ──────┘     Kafka ↔ Kafka
            :3306              :9092
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Java 21
- (Optional) IntelliJ IDEA / VS Code

### 1. Start Infrastructure Only (Recommended for Day 1)

```bash
cd backend

# Start only infra (MySQL, Redis, Kafka, Zookeeper)
docker compose up mysql redis zookeeper kafka kafka-ui -d

# Verify all services healthy
docker compose ps
```

### 2. Start All Services (after building)

```bash
# Build all modules
./gradlew build -x test

# Start everything
docker compose up -d

# View logs
docker compose logs -f
```

### 3. Run Services Locally (Development mode)

```bash
# Terminal 1: Discovery Server
./gradlew :discovery-server:bootRun

# Terminal 2: API Gateway
./gradlew :api-gateway:bootRun

# Terminal 3: Auth Service
./gradlew :auth-service:bootRun

# Terminal 4: Product Service
./gradlew :product-service:bootRun

# Terminal 5: Order Service
./gradlew :order-service:bootRun

# Terminal 6: Payment Service
./gradlew :payment-service:bootRun
```

## 📦 Project Structure

```
backend/
├── build.gradle                    # Root build — shared BOM, versions
├── settings.gradle                 # Multi-module declarations
├── docker-compose.yml              # Infrastructure + all services
├── docker/
│   └── mysql/
│       └── init.sql                # Creates 4 databases + grants
│
├── discovery-server/               # Netflix Eureka Server (:8761)
│   ├── build.gradle
│   ├── Dockerfile
│   └── src/main/
│       ├── java/com/ecommerce/discovery/
│       │   ├── DiscoveryServerApplication.java
│       │   └── config/SecurityConfig.java
│       └── resources/application.yml
│
├── api-gateway/                    # Spring Cloud Gateway (:8080)
│   ├── build.gradle
│   ├── Dockerfile
│   └── src/main/
│       ├── java/com/ecommerce/gateway/
│       │   ├── ApiGatewayApplication.java
│       │   └── controller/FallbackController.java
│       └── resources/application.yml
│
├── auth-service/                   # JWT Auth (:8081)
├── product-service/                # Product Catalog (:8082)
├── order-service/                  # Orders & Cart (:8083)
└── payment-service/                # Payments (:8084)
```

## 🔌 Service URLs

| Service           | Port  | URL                                    |
|-------------------|-------|----------------------------------------|
| API Gateway       | 8080  | http://localhost:8080                  |
| Eureka Dashboard  | 8761  | http://localhost:8761 (eureka/eurekapassword) |
| Auth Service      | 8081  | http://localhost:8081/swagger-ui.html  |
| Product Service   | 8082  | http://localhost:8082/swagger-ui.html  |
| Order Service     | 8083  | http://localhost:8083/swagger-ui.html  |
| Payment Service   | 8084  | http://localhost:8084/swagger-ui.html  |
| Kafka UI          | 8090  | http://localhost:8090                  |

## 🛠️ Tech Stack

| Component         | Technology                    | Version  |
|-------------------|-------------------------------|----------|
| Language          | Java                          | 21       |
| Framework         | Spring Boot                   | 3.2.5    |
| Cloud             | Spring Cloud                  | 2023.0.1 |
| Service Discovery | Spring Cloud Netflix Eureka   | -        |
| API Gateway       | Spring Cloud Gateway          | -        |
| Database          | MySQL                         | 8.2      |
| Cache             | Redis                         | 7.2      |
| Messaging         | Apache Kafka                  | 7.6.1    |
| Build Tool        | Gradle                        | 8.7      |
| Container         | Docker + Docker Compose       | -        |

## 📅 5-Day Migration Plan

| Day  | Date  | Task                                              | Status    |
|------|-------|---------------------------------------------------|-----------|
| 1    | 26/10 | Project scaffold, Docker infra, Gateway, Discovery | ✅ Done   |
| 2    | 27/10 | Auth Service — JWT, Security, User management     | ⏳ Next   |
| 3    | 28/10 | Product Service — CRUD, Inventory, Redis cache    | ⏳ Pending|
| 4    | 29/10 | Order + Payment — Kafka Event-Driven flow          | ⏳ Pending|
| 5    | 30/10 | Integration tests, Docker build, final polish     | ⏳ Pending|

## 🔑 Default Credentials

| Service   | Username       | Password         |
|-----------|----------------|------------------|
| Eureka    | eureka         | eurekapassword   |
| MySQL     | ecommerce_user | ecommerce_pass   |
| Redis     | -              | redispassword    |

> ⚠️ **Security Note**: Change all credentials before deploying to production!

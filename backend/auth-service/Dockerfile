# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — Auth Service
# ─────────────────────────────────────────────────────────────

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY auth-service/build.gradle auth-service/

RUN chmod +x gradlew && ./gradlew :auth-service:dependencies --no-daemon 2>/dev/null || true

COPY auth-service/src auth-service/src
RUN ./gradlew :auth-service:bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /workspace/auth-service/build/libs/*.jar app.jar

RUN chown spring:spring app.jar
USER spring

EXPOSE 8081

ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]

# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — Payment Service
# ─────────────────────────────────────────────────────────────

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY payment-service/build.gradle payment-service/

RUN chmod +x gradlew && ./gradlew :payment-service:dependencies --no-daemon 2>/dev/null || true

COPY payment-service/src payment-service/src
RUN ./gradlew :payment-service:bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /workspace/payment-service/build/libs/*.jar app.jar

RUN chown spring:spring app.jar
USER spring

EXPOSE 8084

ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]

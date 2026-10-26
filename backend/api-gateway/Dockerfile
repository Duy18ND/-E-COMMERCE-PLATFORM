# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — API Gateway
# ─────────────────────────────────────────────────────────────

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY api-gateway/build.gradle api-gateway/

RUN chmod +x gradlew && ./gradlew :api-gateway:dependencies --no-daemon 2>/dev/null || true

COPY api-gateway/src api-gateway/src
RUN ./gradlew :api-gateway:bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /workspace/api-gateway/build/libs/*.jar app.jar

RUN chown spring:spring app.jar
USER spring

EXPOSE 8080

ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]

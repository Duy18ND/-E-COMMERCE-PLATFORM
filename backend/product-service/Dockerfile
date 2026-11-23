# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — Product Service
# ─────────────────────────────────────────────────────────────

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY product-service/build.gradle product-service/

RUN chmod +x gradlew && ./gradlew :product-service:dependencies \
    --no-daemon \
    --max-workers=2 \
    -Dorg.gradle.internal.http.connectionTimeout=60000 \
    -Dorg.gradle.internal.http.socketTimeout=60000 \
    -Dorg.gradle.internal.repository.max.tentatives=5 \
    -Dorg.gradle.internal.repository.initial.backoff=2000 \
    -Dorg.gradle.internal.network.retry.max.attempts=5 \
    -Dorg.gradle.internal.network.retry.initial.backOff=2000

COPY product-service/src product-service/src
RUN ./gradlew :product-service:bootJar \
    --no-daemon \
    -x test \
    --max-workers=2 \
    -Dorg.gradle.internal.http.connectionTimeout=60000 \
    -Dorg.gradle.internal.http.socketTimeout=60000 \
    -Dorg.gradle.internal.repository.max.tentatives=5 \
    -Dorg.gradle.internal.repository.initial.backoff=2000 \
    -Dorg.gradle.internal.network.retry.max.attempts=5 \
    -Dorg.gradle.internal.network.retry.initial.backOff=2000

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /workspace/product-service/build/libs/*.jar app.jar

RUN chown spring:spring app.jar
USER spring

EXPOSE 8082

ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]

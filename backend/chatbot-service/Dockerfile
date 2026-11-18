# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — Chatbot Service (Port 8085)
# ─────────────────────────────────────────────────────────────

FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY chatbot-service/build.gradle chatbot-service/

RUN --mount=type=cache,target=/root/.gradle chmod +x gradlew && ./gradlew :chatbot-service:dependencies --no-daemon 2>/dev/null || true

COPY chatbot-service/src chatbot-service/src
RUN --mount=type=cache,target=/root/.gradle ./gradlew :chatbot-service:bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /workspace/chatbot-service/build/libs/*.jar app.jar

RUN chown spring:spring app.jar
USER spring

EXPOSE 8085

ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]


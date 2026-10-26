# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — Discovery Server
#  Stage 1: Build with Gradle
#  Stage 2: Minimal JRE runtime image
# ─────────────────────────────────────────────────────────────

# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy Gradle wrapper and build files first (cache layer)
COPY gradle/ gradle/
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
COPY discovery-server/build.gradle discovery-server/

# Download dependencies (cached layer)
RUN chmod +x gradlew && ./gradlew :discovery-server:dependencies --no-daemon 2>/dev/null || true

# Copy source and build
COPY discovery-server/src discovery-server/src
RUN ./gradlew :discovery-server:bootJar --no-daemon -x test

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /workspace/discovery-server/build/libs/*.jar app.jar

RUN chown spring:spring app.jar
USER spring

EXPOSE 8761

ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]

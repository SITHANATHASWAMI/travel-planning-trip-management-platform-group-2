# ── Stage 1: Build ──────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy pom first for layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# Copy source
COPY src ./src

# Build jar (skip tests for faster deploy)
RUN mvn package -DskipTests -B -q

# ── Stage 2: Run ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

# Create upload directory
RUN mkdir -p uploads/documents

COPY --from=builder /app/target/tripnest-backend-0.1.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -Dspring.profiles.active=${APP_PROFILE:-postgres} -jar app.jar"]

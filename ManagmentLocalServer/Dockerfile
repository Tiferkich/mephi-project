FROM openjdk:21-jdk-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy Maven wrapper and pom.xml
COPY mvnw pom.xml ./
COPY .mvn .mvn

# Copy source code
COPY src ./src

# Build application
RUN chmod +x mvnw && ./mvnw package -DskipTests

# Create data and logs directories with proper permissions
RUN mkdir -p /app/data /app/logs && \
    chmod 755 /app/data /app/logs

# Copy the built jar
RUN cp target/*.jar app.jar

# Expose port
EXPOSE 3001

# Create non-root user
RUN useradd -r -s /bin/false appuser && \
    chown -R appuser:appuser /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"] 
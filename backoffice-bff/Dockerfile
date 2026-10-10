FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml ./
COPY common-library ./common-library
COPY drone ./drone
COPY hub ./hub
COPY flight ./flight
COPY airspace ./airspace
COPY telemetry ./telemetry
COPY simulation ./simulation
COPY conflict ./conflict
COPY alert ./alert
COPY connectivity ./connectivity
COPY backoffice-bff ./backoffice-bff
RUN mvn clean package -pl backoffice-bff -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/backoffice-bff/target/backoffice-bff*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

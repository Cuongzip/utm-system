FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY common-library ./common-library
COPY backoffice-bff ./backoffice-bff
COPY drone ./drone
COPY hub ./hub
COPY flight ./flight
COPY airspace ./airspace
COPY telemetry ./telemetry
COPY simulation ./simulation
COPY conflict ./conflict
COPY alert ./alert
RUN mvn clean package -pl flight -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/flight/target/flight*.jar app.jar
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "app.jar"]

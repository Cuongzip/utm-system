FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn -N install -DskipTests

COPY common-library ./common-library
RUN mvn -f common-library/pom.xml clean install -DskipTests

COPY hub ./hub
RUN mvn -f hub/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/hub/target/hub*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]

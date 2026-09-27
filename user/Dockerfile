
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml ./
COPY common-library ./common-library
COPY user ./user
RUN mvn clean package -pl user -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/user/target/user*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

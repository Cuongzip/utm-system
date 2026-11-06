FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY common-library ./common-library
COPY organization ./organization
RUN mvn -N install && \
    mvn -f common-library/pom.xml clean install -DskipTests && \
    mvn -f organization/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/organization/target/organization*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]

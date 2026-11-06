FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn -N io.vavr:vavr:0.10.4:help > /dev/null 2>&1 || true && \
    mvn -N install -DskipTests

COPY common-library ./common-library
RUN mvn -f common-library/pom.xml clean install -DskipTests

COPY connectivity/pom.xml ./connectivity/
COPY connectivity/src ./connectivity/src
RUN mvn -f connectivity/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/connectivity/target/connectivity*.jar app.jar
EXPOSE 8094
ENTRYPOINT ["java", "-jar", "app.jar"]

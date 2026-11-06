FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -N io.vavr:vavr:0.10.4:help > /dev/null 2>&1 || true && \
    mvn -N install -DskipTests

COPY common-library ./common-library
RUN --mount=type=cache,target=/root/.m2 \
    mvn -f common-library/pom.xml clean install -DskipTests

COPY hub/pom.xml ./hub/
COPY hub/src ./hub/src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -f hub/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/hub/target/hub*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]

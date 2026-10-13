FROM eclipse-temurin:21.0.12.1_1-jdk-noble@sha256:b468c3fc688b14450571494f588bd939378e7fd542ed5a73f8efc13f17872a87 AS construccion
RUN apt-get update && apt-get install -y --no-install-recommends unzip=6.0-28ubuntu4.1 && rm -rf /var/lib/apt/lists/*
WORKDIR /construccion/backend
ENV MAVEN_USER_HOME=/construccion/tmp/maven-user
COPY .mvn .mvn
COPY mvnw pom.xml spotbugs-exclusiones.xml ./
RUN chmod +x mvnw
COPY src src
# Los tests y los controles obligatorios se ejecutan en QA y CI antes de aceptar.
# compiler/package se invocan directamente para separar el artefacto del QA de Docker.
RUN ./mvnw -B -ntp resources:resources compiler:compile jar:jar spring-boot:repackage

FROM eclipse-temurin:21.0.12.1_1-jre-noble@sha256:000fd431958bc81a24abe1e8e5f0f0fd3ae365a594bd50aadb20696805f9408c
WORKDIR /aplicacion
RUN groupadd --gid 10001 aplicacion && useradd --uid 10001 --gid 10001 --no-create-home aplicacion
COPY --from=construccion --chown=10001:10001 /construccion/backend/target/gestion-solicitudes-0.0.1.jar aplicacion.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-jar", "aplicacion.jar"]

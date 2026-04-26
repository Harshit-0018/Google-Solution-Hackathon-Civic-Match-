FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/sra-backend.jar app.jar
COPY src/main/resources/serviceAccountKey.json serviceAccountKey.json
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

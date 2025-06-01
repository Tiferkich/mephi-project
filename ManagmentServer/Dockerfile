# Используем официальный JDK образ
FROM eclipse-temurin:17-jdk-alpine

# Указываем рабочую директорию
WORKDIR /app

# Копируем и собираем проект (если предварительно собран — копируем jar)
COPY target/ManagmentServer-0.0.1-SNAPSHOT.jar app.jar

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]
@echo off
echo ==============================================
echo   🔐 Password Management System Startup
echo ==============================================
echo.

echo 📍 Server Addresses:
echo   - Remote Server (ManagmentServer):  http://localhost:8080
echo   - Local Server (ManagmentLocalServer): http://localhost:3001
echo.

echo 🧹 Cleaning previous containers and cache...
docker-compose -f ManagmentServer/compose.yaml down -v 2>nul
docker-compose -f ManagmentLocalServer/compose.yaml down -v 2>nul
docker system prune -f
docker builder prune -f

echo.
echo 🏗️  Building and starting Remote Server (PostgreSQL + Spring)...
cd ManagmentServer
call mvnw.cmd clean package -DskipTests
if errorlevel 1 (
    echo ❌ Failed to build ManagmentServer
    pause
    exit /b 1
)

docker-compose up -d --build --force-recreate --no-deps
if errorlevel 1 (
    echo ❌ Failed to start ManagmentServer with Docker
    pause
    exit /b 1
)

echo ✅ Remote Server started on http://localhost:8080
echo    - Swagger UI: http://localhost:8080/swagger-ui.html
echo    - Health Check: http://localhost:8080/actuator/health
echo.

echo 🏗️  Building and starting Local Server (SQLite + Spring)...
cd ../ManagmentLocalServer
call mvnw.cmd clean package -DskipTests
if errorlevel 1 (
    echo ❌ Failed to build ManagmentLocalServer
    pause
    exit /b 1
)

docker-compose build --no-cache
docker-compose up -d --force-recreate --no-deps
if errorlevel 1 (
    echo ❌ Failed to start ManagmentLocalServer with Docker
    pause
    exit /b 1
)

echo ✅ Local Server started on http://localhost:3001
echo    - Swagger UI: http://localhost:3001/swagger-ui.html
echo    - Health Check: http://localhost:3001/actuator/health
echo.

cd ..

echo 🎉 Both servers are running!
echo.
echo 📖 Usage Instructions:
echo   1. Access Local Server UI: http://localhost:3001/swagger-ui.html
echo   2. Create local account: POST /auth/setup
echo   3. Login locally: POST /auth/login
echo   4. Link to remote: POST /remote/register
echo   5. Sync data: POST /sync/push, GET /sync/pull
echo.
echo 🛑 To stop servers: run stop-servers.bat
echo.

echo 🔍 Checking server status...
timeout /t 10 /nobreak >nul
curl -s http://localhost:3001/actuator/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Local Server not responding yet, may need more time to start
) else (
    echo ✅ Local Server is responding
)

curl -s http://localhost:8080/actuator/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Remote Server not responding yet, may need more time to start
) else (
    echo ✅ Remote Server is responding
)

echo.
echo Press any key to exit...
pause >nul 
echo ==============================================
echo   🔐 Password Management System Startup
echo ==============================================
echo.

echo 📍 Server Addresses:
echo   - Remote Server (ManagmentServer):  http://localhost:8080
echo   - Local Server (ManagmentLocalServer): http://localhost:3001
echo.

echo 🧹 Cleaning previous containers and cache...
docker-compose -f ManagmentServer/compose.yaml down -v 2>nul
docker-compose -f ManagmentLocalServer/compose.yaml down -v 2>nul
docker system prune -f
docker builder prune -f

echo.
echo 🏗️  Building and starting Remote Server (PostgreSQL + Spring)...
cd ManagmentServer
call mvnw.cmd clean package -DskipTests
if errorlevel 1 (
    echo ❌ Failed to build ManagmentServer
    pause
    exit /b 1
)

docker-compose up -d --build --force-recreate --no-deps
if errorlevel 1 (
    echo ❌ Failed to start ManagmentServer with Docker
    pause
    exit /b 1
)

echo ✅ Remote Server started on http://localhost:8080
echo    - Swagger UI: http://localhost:8080/swagger-ui.html
echo    - Health Check: http://localhost:8080/actuator/health
echo.

echo 🏗️  Building and starting Local Server (SQLite + Spring)...
cd ../ManagmentLocalServer
call mvnw.cmd clean package -DskipTests
if errorlevel 1 (
    echo ❌ Failed to build ManagmentLocalServer
    pause
    exit /b 1
)

docker-compose build --no-cache
docker-compose up -d --force-recreate --no-deps
if errorlevel 1 (
    echo ❌ Failed to start ManagmentLocalServer with Docker
    pause
    exit /b 1
)

echo ✅ Local Server started on http://localhost:3001
echo    - Swagger UI: http://localhost:3001/swagger-ui.html
echo    - Health Check: http://localhost:3001/actuator/health
echo.

cd ..

echo 🎉 Both servers are running!
echo.
echo 📖 Usage Instructions:
echo   1. Access Local Server UI: http://localhost:3001/swagger-ui.html
echo   2. Create local account: POST /auth/setup
echo   3. Login locally: POST /auth/login
echo   4. Link to remote: POST /remote/register
echo   5. Sync data: POST /sync/push, GET /sync/pull
echo.
echo 🛑 To stop servers: run stop-servers.bat
echo.

echo 🔍 Checking server status...
timeout /t 10 /nobreak >nul
curl -s http://localhost:3001/actuator/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Local Server not responding yet, may need more time to start
) else (
    echo ✅ Local Server is responding
)

curl -s http://localhost:8080/actuator/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Remote Server not responding yet, may need more time to start
) else (
    echo ✅ Remote Server is responding
)

echo.
echo Press any key to exit...
pause >nul 
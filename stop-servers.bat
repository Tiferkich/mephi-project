@echo off
echo ==============================================
echo   🛑 Stopping Password Management System
echo ==============================================
echo.

echo 🔍 Stopping containers...

echo Stopping Remote Server (ManagmentServer)...
docker-compose -f ManagmentServer/compose.yaml down
if errorlevel 1 (
    echo ⚠️  Failed to stop ManagmentServer containers
) else (
    echo ✅ Remote Server stopped
)

echo.
echo Stopping Local Server (ManagmentLocalServer)...
docker-compose -f ManagmentLocalServer/compose.yaml down
if errorlevel 1 (
    echo ⚠️  Failed to stop ManagmentLocalServer containers  
) else (
    echo ✅ Local Server stopped
)

echo.
echo 🧹 Cleaning up unused Docker resources...
docker system prune -f --volumes 2>nul

echo.
echo ✅ All servers stopped successfully!
echo.
pause 
echo ==============================================
echo   🛑 Stopping Password Management System
echo ==============================================
echo.

echo 🔍 Stopping containers...

echo Stopping Remote Server (ManagmentServer)...
docker-compose -f ManagmentServer/compose.yaml down
if errorlevel 1 (
    echo ⚠️  Failed to stop ManagmentServer containers
) else (
    echo ✅ Remote Server stopped
)

echo.
echo Stopping Local Server (ManagmentLocalServer)...
docker-compose -f ManagmentLocalServer/compose.yaml down
if errorlevel 1 (
    echo ⚠️  Failed to stop ManagmentLocalServer containers  
) else (
    echo ✅ Local Server stopped
)

echo.
echo 🧹 Cleaning up unused Docker resources...
docker system prune -f --volumes 2>nul

echo.
echo ✅ All servers stopped successfully!
echo.
pause 
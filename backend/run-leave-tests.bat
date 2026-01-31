@echo off
REM Backend Leave Module Test Runner (Windows)
REM Runs all leave-related tests with coverage reporting

echo ==================================
echo Backend Leave Module Test Suite
echo ==================================
echo.

set MODE=%1
if "%MODE%"=="" set MODE=all

if "%MODE%"=="service" (
  echo Running core service tests only...
  call npx vitest run src/modules/leave/leave.service.test.ts
  goto end
)

if "%MODE%"=="coverage" (
  echo Running all tests with coverage report...
  call npx vitest run --coverage src/modules/leave/
  goto end
)

if "%MODE%"=="watch" (
  echo Running tests in watch mode...
  call npx vitest watch src/modules/leave/
  goto end
)

REM Default: run all tests
echo Running all leave module tests...
echo.

call npx vitest run src/modules/leave/leave.service.test.ts
if errorlevel 1 goto failed
echo [32m✓ Service tests passed[0m
echo.

echo [32m==================================
echo All Leave Module Tests Passed! ✓
echo ==================================[0m
goto end

:failed
echo [31m✗ Tests failed[0m
exit /b 1

:end
echo.
echo Usage:
echo   run-leave-tests.bat           # Run all tests
echo   run-leave-tests.bat service   # Run core service tests only
echo   run-leave-tests.bat coverage  # Run with coverage report
echo   run-leave-tests.bat watch     # Run in watch mode

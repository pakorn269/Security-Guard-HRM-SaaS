@echo off
REM Run Leave Management Module Tests
REM This script runs all leave-related tests with detailed output

echo ======================================
echo Leave Management Module - Test Suite
echo ======================================
echo.

REM Check if we're in the frontend directory
if not exist "package.json" (
    echo ❌ Error: Not in frontend directory
    echo Please run this script from the frontend directory
    exit /b 1
)

echo 📦 Installing dependencies (if needed)...
call npm ci --silent

echo.
echo 🧪 Running Leave Module Tests...
echo.

REM Run all leave-related tests
call npm test -- ^
    --run ^
    --reporter=verbose ^
    src/pages/leave/LeavePage.test.tsx ^
    src/pages/leave/LeaveTypesPage.test.tsx ^
    src/pages/leave/LeaveBalancesPage.test.tsx ^
    src/pages/liff/LiffLeavePage.test.tsx ^
    src/components/leave/LeaveCalendar.test.tsx

set TEST_EXIT_CODE=%ERRORLEVEL%

echo.
echo ======================================
if %TEST_EXIT_CODE% equ 0 (
    echo ✅ All tests passed!
) else (
    echo ❌ Some tests failed (exit code: %TEST_EXIT_CODE%^)
)
echo ======================================
echo.

echo 📊 To see coverage report, run:
echo    npm run test:coverage
echo.

exit /b %TEST_EXIT_CODE%

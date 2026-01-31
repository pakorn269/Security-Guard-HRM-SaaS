#!/bin/bash

# Run Leave Management Module Tests
# This script runs all leave-related tests with detailed output

echo "======================================"
echo "Leave Management Module - Test Suite"
echo "======================================"
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in frontend directory"
    echo "Please run this script from the frontend directory"
    exit 1
fi

echo "📦 Installing dependencies (if needed)..."
npm ci --silent

echo ""
echo "🧪 Running Leave Module Tests..."
echo ""

# Run all leave-related tests
npm test -- \
    --run \
    --reporter=verbose \
    src/pages/leave/LeavePage.test.tsx \
    src/pages/leave/LeaveTypesPage.test.tsx \
    src/pages/leave/LeaveBalancesPage.test.tsx \
    src/pages/liff/LiffLeavePage.test.tsx \
    src/components/leave/LeaveCalendar.test.tsx

TEST_EXIT_CODE=$?

echo ""
echo "======================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi
echo "======================================"
echo ""

echo "📊 To see coverage report, run:"
echo "   npm run test:coverage"
echo ""

exit $TEST_EXIT_CODE

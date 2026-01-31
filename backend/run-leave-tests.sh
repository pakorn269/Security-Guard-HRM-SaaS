#!/bin/bash

# Backend Leave Module Test Runner
# Runs all leave-related tests with coverage reporting

echo "=================================="
echo "Backend Leave Module Test Suite"
echo "=================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test files to run
TEST_FILES=(
  "src/modules/leave/leave.service.test.ts"
)

# Run mode: default is all tests
MODE=${1:-all}

case $MODE in
  "service")
    echo -e "${BLUE}Running core service tests only...${NC}"
    npx vitest run src/modules/leave/leave.service.test.ts
    ;;
  "coverage")
    echo -e "${BLUE}Running all tests with coverage report...${NC}"
    npx vitest run --coverage src/modules/leave/
    ;;
  "watch")
    echo -e "${BLUE}Running tests in watch mode...${NC}"
    npx vitest watch src/modules/leave/
    ;;
  "all"|*)
    echo -e "${BLUE}Running all leave module tests...${NC}"
    echo ""
    for test_file in "${TEST_FILES[@]}"; do
      echo -e "${YELLOW}Running: $test_file${NC}"
      npx vitest run "$test_file"
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Passed${NC}"
      else
        echo -e "\033[0;31m✗ Failed${NC}"
        exit 1
      fi
      echo ""
    done
    echo -e "${GREEN}=================================="
    echo -e "All Leave Module Tests Passed! ✓"
    echo -e "==================================${NC}"
    ;;
esac

echo ""
echo "Usage:"
echo "  ./run-leave-tests.sh           # Run all tests"
echo "  ./run-leave-tests.sh service   # Run core service tests only"
echo "  ./run-leave-tests.sh coverage  # Run with coverage report"
echo "  ./run-leave-tests.sh watch     # Run in watch mode"

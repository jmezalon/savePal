#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api"

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

print_test() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

increment_test() {
    ((TOTAL_TESTS++))
}

# Test 1: Register users
print_test "TEST 1: Register 3 test users"
increment_test

USER1=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123",
    "firstName": "User",
    "lastName": "One"
  }')

USER1_TOKEN=$(echo $USER1 | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$USER1_TOKEN" ]; then
    print_success "User 1 registered"
else
    print_error "User 1 registration failed"
    echo "Response: $USER1"
fi

USER2=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "password123",
    "firstName": "User",
    "lastName": "Two"
  }')

USER2_TOKEN=$(echo $USER2 | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$USER2_TOKEN" ]; then
    print_success "User 2 registered"
else
    print_error "User 2 registration failed"
fi

USER3=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user3@test.com",
    "password": "password123",
    "firstName": "User",
    "lastName": "Three"
  }')

USER3_TOKEN=$(echo $USER3 | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$USER3_TOKEN" ]; then
    print_success "User 3 registered"
else
    print_error "User 3 registration failed"
fi

# Test 2: Create a group
print_test "TEST 2: Create a savings group"
increment_test

GROUP=$(curl -s -X POST "$BASE_URL/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{
    "name": "Test Savings Group",
    "description": "Testing cycle management",
    "contributionAmount": 100,
    "frequency": "MONTHLY",
    "payoutMethod": "SEQUENTIAL",
    "maxMembers": 3,
    "startDate": "2025-11-01T00:00:00.000Z"
  }')

GROUP_ID=$(echo $GROUP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
INVITE_CODE=$(echo $GROUP | grep -o '"inviteCode":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$GROUP_ID" ]; then
    print_success "Group created with ID: $GROUP_ID"
    print_success "Invite code: $INVITE_CODE"
else
    print_error "Group creation failed"
    echo "Response: $GROUP"
fi

# Test 3: Join group with other users
print_test "TEST 3: Other users join the group"
increment_test

JOIN2=$(curl -s -X POST "$BASE_URL/groups/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -d "{
    \"inviteCode\": \"$INVITE_CODE\"
  }")

if echo "$JOIN2" | grep -q '"success":true'; then
    print_success "User 2 joined the group"
else
    print_error "User 2 failed to join"
    echo "Response: $JOIN2"
fi

JOIN3=$(curl -s -X POST "$BASE_URL/groups/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER3_TOKEN" \
  -d "{
    \"inviteCode\": \"$INVITE_CODE\"
  }")

if echo "$JOIN3" | grep -q '"success":true'; then
    print_success "User 3 joined the group"
else
    print_error "User 3 failed to join"
fi

# Test 4: Start the group (this should create cycles)
print_test "TEST 4: Start the group and create cycles"
increment_test

START=$(curl -s -X POST "$BASE_URL/groups/$GROUP_ID/start" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$START" | grep -q '"status":"ACTIVE"'; then
    print_success "Group started successfully"
else
    print_error "Failed to start group"
    echo "Response: $START"
fi

# Test 5: Get all cycles for the group
print_test "TEST 5: Get all cycles for the group"
increment_test

CYCLES=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/cycles" \
  -H "Authorization: Bearer $USER1_TOKEN")

CYCLE_COUNT=$(echo $CYCLES | grep -o '"cycleNumber":' | wc -l | tr -d ' ')

if [ "$CYCLE_COUNT" -eq "3" ]; then
    print_success "Found 3 cycles as expected"
    echo "$CYCLES" | jq '.data[] | {cycleNumber, dueDate, recipientId, totalAmount}'
else
    print_error "Expected 3 cycles, found $CYCLE_COUNT"
    echo "Response: $CYCLES"
fi

# Test 6: Get current cycle
print_test "TEST 6: Get current active cycle"
increment_test

CURRENT_CYCLE=$(curl -s -X GET "$BASE_URL/groups/$GROUP_ID/cycles/current" \
  -H "Authorization: Bearer $USER1_TOKEN")

CURRENT_CYCLE_ID=$(echo $CURRENT_CYCLE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$CURRENT_CYCLE_ID" ]; then
    print_success "Current cycle ID: $CURRENT_CYCLE_ID"
    echo "$CURRENT_CYCLE" | jq '.data | {cycleNumber, dueDate, recipientId, isCompleted}'
else
    print_error "Failed to get current cycle"
fi

# Test 7: Get cycle details
print_test "TEST 7: Get specific cycle details"
increment_test

CYCLE_DETAILS=$(curl -s -X GET "$BASE_URL/cycles/$CURRENT_CYCLE_ID" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$CYCLE_DETAILS" | grep -q '"success":true'; then
    print_success "Retrieved cycle details"
    echo "$CYCLE_DETAILS" | jq '.data | {cycleNumber, dueDate, totalAmount, payments: .payments | length}'
else
    print_error "Failed to get cycle details"
fi

# Test 8: Get payments for the cycle
print_test "TEST 8: Get all payments for the cycle"
increment_test

PAYMENTS=$(curl -s -X GET "$BASE_URL/cycles/$CURRENT_CYCLE_ID/payments" \
  -H "Authorization: Bearer $USER1_TOKEN")

PAYMENT_COUNT=$(echo $PAYMENTS | grep -o '"status":"PENDING"' | wc -l | tr -d ' ')

if [ "$PAYMENT_COUNT" -eq "3" ]; then
    print_success "Found 3 pending payments"
    echo "$PAYMENTS" | jq '.data[] | {userId: .user.firstName, amount, status}'
else
    print_error "Expected 3 payments, found $PAYMENT_COUNT"
fi

# Test 9: Get user's pending payments
print_test "TEST 9: Get user's pending payments"
increment_test

MY_PAYMENTS=$(curl -s -X GET "$BASE_URL/payments/my-payments/pending" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$MY_PAYMENTS" | grep -q '"success":true'; then
    print_success "Retrieved user's pending payments"
    echo "$MY_PAYMENTS" | jq '.data[] | {amount, status, cycle: .cycle.group.name}'
else
    print_error "Failed to get user's payments"
fi

# Test 10: Get user's payment for current cycle
print_test "TEST 10: Get user's payment for current cycle"
increment_test

MY_CYCLE_PAYMENT=$(curl -s -X GET "$BASE_URL/cycles/$CURRENT_CYCLE_ID/my-payment" \
  -H "Authorization: Bearer $USER1_TOKEN")

USER1_PAYMENT_ID=$(echo $MY_CYCLE_PAYMENT | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$USER1_PAYMENT_ID" ]; then
    print_success "Found user's payment: $USER1_PAYMENT_ID"
    echo "$MY_CYCLE_PAYMENT" | jq '.data | {amount, status}'
else
    print_error "Failed to get user's cycle payment"
fi

# Test 11: Process a payment
print_test "TEST 11: Process user 1's payment"
increment_test

PROCESS_PAYMENT=$(curl -s -X POST "$BASE_URL/payments/$USER1_PAYMENT_ID/process" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{
    "transactionReference": "TEST_TXN_001"
  }')

if echo "$PROCESS_PAYMENT" | grep -q '"status":"COMPLETED"'; then
    print_success "Payment processed successfully"
else
    print_error "Failed to process payment"
    echo "Response: $PROCESS_PAYMENT"
fi

# Test 12: Get payment statistics
print_test "TEST 12: Get user's payment statistics"
increment_test

PAYMENT_STATS=$(curl -s -X GET "$BASE_URL/payments/my-stats" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$PAYMENT_STATS" | grep -q '"total":'; then
    print_success "Retrieved payment statistics"
    echo "$PAYMENT_STATS" | jq '.data'
else
    print_error "Failed to get payment stats"
fi

# Test 13: Get payout information
print_test "TEST 13: Get payout for the cycle"
increment_test

PAYOUT=$(curl -s -X GET "$BASE_URL/cycles/$CURRENT_CYCLE_ID/payout" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$PAYOUT" | grep -q '"success":'; then
    if echo "$PAYOUT" | grep -q '"data":null'; then
        print_success "No payout yet (cycle not completed)"
    else
        print_success "Payout information retrieved"
        echo "$PAYOUT" | jq '.data | {amount, feeAmount, netAmount, status}'
    fi
else
    print_error "Failed to get payout info"
fi

# Test 14: Get all groups and check cycles are included
print_test "TEST 14: Get groups with cycle information"
increment_test

GROUPS=$(curl -s -X GET "$BASE_URL/groups" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$GROUPS" | grep -q '"success":true'; then
    print_success "Retrieved user's groups"
    echo "$GROUPS" | jq '.data[] | {name, status, maxMembers, currentMembers}'
else
    print_error "Failed to get groups"
fi

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi

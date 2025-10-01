# Testing the Auth API

## Prerequisites

1. **Set up database** (see DATABASE_SETUP.md)
2. **Push schema to database**:
   ```bash
   npm run db:push
   ```

## Method 1: Using cURL (Terminal)

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the token from the response!**

### 4. Get Profile (Replace TOKEN with your actual token)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Method 2: Using Postman or Insomnia

1. Import the endpoints from `test-auth.http`
2. Create requests for each endpoint
3. For protected routes, add `Authorization: Bearer <token>` header

## Method 3: Using VS Code REST Client Extension

1. Install "REST Client" extension in VS Code
2. Open `test-auth.http` file
3. Click "Send Request" above each request
4. Update the `@token` variable after login

## Expected Responses

### Successful Registration
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "emailVerified": false,
      "phoneVerified": false,
      "trustScore": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Successful Login
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Get Profile
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "stats": {
      "totalSaved": 0,
      "activeGroups": 0,
      "completedGroups": 0
    }
  }
}
```

## Running the Server

Start the backend server:
```bash
npm run dev:backend
```

Or run both frontend and backend:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

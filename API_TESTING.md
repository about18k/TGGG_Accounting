# API Testing Guide

## Test Login Endpoint

### Using cURL
```bash
curl -X POST http://localhost:8000/api/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.accounting@example.com",
    "password": "Test1234!"
  }'
```

### Using Postman
1. Create new POST request
2. URL: `http://localhost:8000/api/accounts/login/`
3. Body (raw JSON):
```json
{
  "email": "john.accounting@example.com",
  "password": "Test1234!"
}
```

Expected Response:
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "john.accounting@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "employee_id": null,
    "department": 1,
    "department_name": "Accounting Department",
    "role": "employee",
    "permissions": []
  }
}
```

---

## Get Departments

### Using cURL
```bash
curl -X GET http://localhost:8000/api/accounts/departments/
```

### Expected Response
```json
[
  {
    "id": 1,
    "name": "Accounting Department",
    "description": "Handles financial records, accounting, and reporting"
  },
  {
    "id": 2,
    "name": "Design Department",
    "description": "Creative design and UI/UX services"
  },
  {
    "id": 3,
    "name": "Engineering Department",
    "description": "Software development and technical infrastructure"
  },
  {
    "id": 4,
    "name": "Planning Department",
    "description": "Project planning and resource management"
  },
  {
    "id": 5,
    "name": "IT Department",
    "description": "Information technology and systems management"
  }
]
```

---

## Get User Profile (Authenticated)

### Using cURL
```bash
curl -X GET http://localhost:8000/api/accounts/profile/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with the token from login response.

### Expected Response
```json
{
  "id": 1,
  "email": "john.accounting@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "employee_id": null,
  "phone_number": null,
  "department": 1,
  "department_name": "Accounting Department",
  "role": "employee",
  "permissions": []
}
```

---

## Error Responses

### Invalid Email/Password
```json
{
  "error": "Invalid credentials"
}
```
Status: 401 Unauthorized

### Missing Fields
```json
{
  "error": "Email and password are required"
}
```
Status: 400 Bad Request

### Unauthorized (Missing Token)
```json
{
  "detail": "Authentication credentials were not provided."
}
```
Status: 401 Unauthorized

---

## Testing Workflow

1. **Get Departments** (no auth needed)
   ```bash
   curl http://localhost:8000/api/accounts/departments/
   ```

2. **Create Test User** via admin panel
   - Go to http://localhost:8000/admin
   - Add user with department

3. **Login**
   ```bash
   curl -X POST http://localhost:8000/api/accounts/login/ \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password"}'
   ```

4. **Save the token** from response

5. **Get Profile** (authenticated)
   ```bash
   curl -X GET http://localhost:8000/api/accounts/profile/ \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   ```

6. **Test Frontend** with the credentials
   - Go to http://localhost:5173
   - Enter email and password
   - Should redirect to department dashboard

---

## Common Issues & Solutions

### "Connection refused"
- Make sure Django server is running: `python manage.py runserver`

### "CORS error"
- Check CORS settings in `core/settings.py`
- Make sure frontend URL is in `CORS_ALLOWED_ORIGINS`

### "Invalid credentials"
- Check user exists in admin panel
- Verify email is correct (case-sensitive)
- Make sure you set a password for the user

### "Token invalid or expired"
- Token expires after 15 minutes (configurable)
- Get a new token by logging in again
- Or use refresh token to get new access token

---

## Postman Collection

Save as `postman_collection.json`:

```json
{
  "info": {
    "name": "TGGG Accounting API",
    "description": "Authentication & Department Management APIs"
  },
  "item": [
    {
      "name": "Get Departments",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:8000/api/accounts/departments/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "accounts", "departments"]
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\": \"john.accounting@example.com\", \"password\": \"Test1234!\"}"
        },
        "url": {
          "raw": "http://localhost:8000/api/accounts/login/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "accounts", "login"]
        }
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:8000/api/accounts/profile/",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["api", "accounts", "profile"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

1. Import this in Postman
2. After successful login, copy the token
3. Paste in `{{token}}` variable
4. Use Profile request with authorization

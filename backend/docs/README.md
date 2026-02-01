# API Documentation

Complete OpenAPI/Swagger documentation for the Security Guard HRM API.

## 📚 Access Documentation

### Interactive Documentation (Swagger UI)
**URL:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

The interactive Swagger UI provides:
- **Try it out** functionality to test endpoints directly
- Detailed request/response schemas
- Example values for all parameters
- Authentication testing with Bearer tokens
- Filter and search capabilities
- Dark mode support

### OpenAPI Specification (JSON)
**URL:** [http://localhost:3001/api-docs.json](http://localhost:3001/api-docs.json)

Download the raw OpenAPI 3.0 specification in JSON format for:
- Importing into Postman, Insomnia, or other API clients
- Generating API client code
- Integration testing
- Code documentation

## 🚀 Quick Start

### 1. Start the Development Server

```bash
cd backend
npm run dev
```

### 2. Access Swagger UI

Open your browser and navigate to:
```
http://localhost:3001/api-docs
```

### 3. Authenticate

1. Click the **"Authorize"** button (lock icon) in the top right
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click **"Authorize"** and then **"Close"**
4. All subsequent requests will include authentication

To get a token:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

### 4. Test Endpoints

1. Expand any endpoint group (Leave Types, Leave Requests, etc.)
2. Click on an endpoint to view details
3. Click **"Try it out"**
4. Fill in required parameters
5. Click **"Execute"**
6. View the response

## 📖 Documentation Features

### Complete Coverage

The documentation covers all Leave Management endpoints:

#### 🏷️ Leave Types
- `GET /api/v1/leave-types` - List all leave types
- `GET /api/v1/leave-types/{id}` - Get leave type by ID
- `POST /api/v1/leave-types` - Create leave type (Manager+)
- `PUT /api/v1/leave-types/{id}` - Update leave type (Manager+)
- `DELETE /api/v1/leave-types/{id}` - Delete leave type (Manager+)

#### 📝 Leave Requests
- `GET /api/v1/leave-requests/my` - Get my leave requests
- `POST /api/v1/leave-requests` - Submit leave request
- `GET /api/v1/leave-requests` - List all requests (Manager+)
- `GET /api/v1/leave-requests/{id}` - Get request details (Manager+)
- `POST /api/v1/leave-requests/{id}/approve` - Approve request (Manager+)
- `POST /api/v1/leave-requests/{id}/reject` - Reject request (Manager+)
- `POST /api/v1/leave-requests/{id}/cancel` - Cancel my request
- `POST /api/v1/leave-requests/{id}/approve-with-replacements` - Approve with guard replacements (Manager+)
- `POST /api/v1/leave-requests/{id}/assign-replacements` - Assign replacements (Manager+)

#### 💰 Leave Balances
- `GET /api/v1/leave-balances/my` - Get my balances
- `GET /api/v1/leave-balances` - List all balances (Manager+)
- `PUT /api/v1/leave-balances/{employeeId}/{leaveTypeId}` - Update balance (Manager+)
- `POST /api/v1/leave-balances/initialize` - Initialize balances (Manager+)
- `POST /api/v1/leave-balances/{id}/adjust` - Adjust balance with audit (Manager+)
- `GET /api/v1/leave-balances/{id}/adjustments` - Get adjustment history (Manager+)
- `GET /api/v1/leave-balances/adjustments` - List all adjustments (Manager+)
- `POST /api/v1/leave-balances/bulk-adjust` - Bulk adjust balances (Manager+)

#### 📋 Leave Templates
- `GET /api/v1/leave-templates` - List all templates
- `GET /api/v1/leave-templates/{id}` - Get template by ID
- `POST /api/v1/leave-templates` - Create template (Manager+)
- `PUT /api/v1/leave-templates/{id}` - Update template (Manager+)
- `DELETE /api/v1/leave-templates/{id}` - Delete template (Manager+)
- `POST /api/v1/leave-templates/{id}/apply` - Apply template to get draft data

#### 📊 Analytics & Reports
- `GET /api/v1/leave/reports/kpi` - Get KPI summary (Manager+)
- `GET /api/v1/leave/reports/utilization` - Get utilization report (Manager+)
- `GET /api/v1/leave/calendar` - Get leave calendar (Manager+)

### Schema Validation

All schemas are automatically generated from Zod validation schemas, ensuring:
- ✅ Documentation always matches implementation
- ✅ Request validation is identical to actual API behavior
- ✅ Type safety with TypeScript
- ✅ No manual documentation maintenance

### Response Examples

Every endpoint includes:
- Success response (200/201) with full data schema
- Error responses (400/401/403/404) with error format
- Pagination details where applicable
- Request body examples with required/optional fields

## 🔧 Development

### Generate OpenAPI Spec

To regenerate the OpenAPI specification JSON file:

```bash
npm run generate:openapi
```

This creates `backend/docs/openapi.json` (78+ KB) which can be:
- Imported into Postman via **Import → File**
- Used with Insomnia via **Create → Import**
- Shared with frontend developers
- Used for automated testing

### Update Documentation

The documentation is automatically generated from:
1. **Zod Schemas** (`leave.validation.ts`) - Request/response validation
2. **OpenAPI Generator** (`docs/openapi.ts`) - Path definitions
3. **JSDoc Comments** (`leave.controller.ts`) - Endpoint descriptions

To update documentation:
1. Modify Zod schemas in `leave.validation.ts`
2. Update path definitions in `docs/openapi.ts`
3. Add/update JSDoc comments in `leave.controller.ts`
4. Restart the server - changes are applied automatically

### Customize Swagger UI

Edit `src/app.ts` to customize Swagger UI options:

```typescript
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Security Guard HRM API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};
```

## 📥 Import to API Clients

### Postman

1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose `backend/docs/openapi.json`
5. Click **Import**
6. All endpoints will be organized in folders

### Insomnia

1. Open Insomnia
2. Click **Create** → **Import**
3. Select `backend/docs/openapi.json`
4. Click **Import**
5. Endpoints will be grouped by tags

### cURL Examples

Get leave types:
```bash
curl -X GET "http://localhost:3001/api/v1/leave-types" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Create leave request:
```bash
curl -X POST "http://localhost:3001/api/v1/leave-requests" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveTypeId": "uuid-here",
    "startDate": "2026-02-15",
    "endDate": "2026-02-17",
    "reason": "Family vacation"
  }'
```

## 🔐 Security

### Authentication

All endpoints require JWT Bearer token authentication:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access

- **Guard**: Can submit and view own requests
- **Manager**: Can approve/reject, manage balances, view reports
- **Company Admin**: Full company access
- **Super Admin**: Platform-wide access

### Rate Limiting

Production environments enforce rate limits:
- 100 requests per minute per user
- 1000 requests per hour per user

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Annual Leave",
    ...
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 150,
    "totalPages": 3
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Leave type not found",
    "code": "NOT_FOUND",
    "details": {}
  }
}
```

## 🎯 Best Practices

### Testing Endpoints

1. Start with `GET` endpoints (read-only, safe to test)
2. Use authentication tokens from test/development accounts
3. Test error cases (invalid IDs, missing fields)
4. Verify response schemas match documentation

### Common Issues

**401 Unauthorized**
- Check that token is included in Authorization header
- Verify token format: `Bearer <token>`
- Ensure token hasn't expired

**403 Forbidden**
- User role doesn't have permission for this endpoint
- Manager/Admin role required

**400 Bad Request**
- Check request body against schema
- Ensure all required fields are present
- Validate date formats (YYYY-MM-DD)
- Check UUID formats

## 🌐 Production Deployment

For production environments:

1. Update server URL in `docs/openapi.ts`:
```typescript
servers: [
  {
    url: 'https://api.securityguard-hrm.com',
    description: 'Production server',
  },
],
```

2. Secure Swagger UI with authentication:
```typescript
// Add middleware before Swagger UI route
app.use('/api-docs', authMiddleware, swaggerUi.serve, ...);
```

3. Consider disabling Swagger UI in production:
```typescript
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}
```

## 📞 Support

For API documentation issues or questions:
- Email: dev@securityguard-hrm.com
- Slack: #api-documentation
- GitHub: Create an issue

## 📄 License

Proprietary - Security Guard HRM Team

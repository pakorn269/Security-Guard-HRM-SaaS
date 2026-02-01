/**
 * OpenAPI/Swagger Documentation Generator
 * Auto-generates API documentation from Zod schemas
 */

import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  // Leave Types
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  listLeaveTypesQuerySchema,
  // Leave Requests
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  rejectLeaveRequestSchema,
  cancelLeaveRequestSchema,
  listLeaveRequestsQuerySchema,
  myLeaveQuerySchema,
  leaveCalendarQuerySchema,
  approveLeaveWithReplacementsSchema,
  assignReplacementsSchema,
  // Leave Balances
  updateLeaveBalanceSchema,
  initializeBalancesSchema,
  listLeaveBalancesQuerySchema,
  adjustBalanceSchema,
  listAdjustmentsQuerySchema,
  bulkAdjustSchema,
  // Templates
  createTemplateSchema,
  updateTemplateSchema,
  applyTemplateSchema,
  listTemplatesQuerySchema,
} from '../modules/leave/leave.validation.js';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// ============================================================================
// REGISTRY SETUP
// ============================================================================

const registry = new OpenAPIRegistry();

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

// Error Response Schema
const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    }),
  })
);

// Success Response Schema (Generic)
const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// Pagination Response Schema
const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
  });

// ============================================================================
// DATA MODELS
// ============================================================================

// Leave Type Model
const leaveTypeSchema = registry.register(
  'LeaveType',
  z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    name: z.string(),
    nameTh: z.string().nullable(),
    description: z.string().nullable(),
    isPaid: z.boolean(),
    maxDaysPerYear: z.number().nullable(),
    requiresApproval: z.boolean(),
    requiresDocument: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

// Leave Request Model
const leaveRequestSchema = registry.register(
  'LeaveRequest',
  z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    employeeId: z.string().uuid(),
    leaveTypeId: z.string().uuid(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    totalDays: z.number(),
    reason: z.string().nullable(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
    documentUrl: z.string().nullable(),
    reviewedBy: z.string().uuid().nullable(),
    reviewNotes: z.string().nullable(),
    reviewedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

// Leave Balance Model
const leaveBalanceSchema = registry.register(
  'LeaveBalance',
  z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    employeeId: z.string().uuid(),
    leaveTypeId: z.string().uuid(),
    year: z.number(),
    entitledDays: z.number(),
    usedDays: z.number(),
    pendingDays: z.number(),
    remainingDays: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

// Leave Template Model
const leaveTemplateSchema = registry.register(
  'LeaveTemplate',
  z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    name: z.string(),
    nameTh: z.string().nullable(),
    description: z.string().nullable(),
    leaveTypeId: z.string().uuid(),
    defaultDaysCount: z.number().nullable(),
    defaultReason: z.string().nullable(),
    isActive: z.boolean(),
    sortOrder: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

// Balance Adjustment Model
const balanceAdjustmentSchema = registry.register(
  'BalanceAdjustment',
  z.object({
    id: z.string().uuid(),
    balanceId: z.string().uuid(),
    fieldName: z.enum(['entitled_days', 'used_days', 'pending_days']),
    previousValue: z.number(),
    newValue: z.number(),
    adjustmentType: z.enum(['pro_rated', 'correction', 'special_allowance', 'carry_forward', 'manual']),
    reason: z.string(),
    adjustedBy: z.string().uuid(),
    createdAt: z.string().datetime(),
  })
);

// ============================================================================
// SECURITY SCHEMES
// ============================================================================

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token obtained from /api/v1/auth/login',
});

// ============================================================================
// LEAVE TYPES ENDPOINTS
// ============================================================================

// GET /api/v1/leave-types
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-types',
  summary: 'List all leave types',
  description: 'Retrieve a list of leave types for the company. Optionally include inactive types.',
  tags: ['Leave Types'],
  security: [{ bearerAuth: [] }],
  request: {
    query: listLeaveTypesQuerySchema,
  },
  responses: {
    200: {
      description: 'List of leave types',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(leaveTypeSchema)),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/leave-types/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-types/{id}',
  summary: 'Get leave type by ID',
  description: 'Retrieve a specific leave type by its ID',
  tags: ['Leave Types'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Leave type details',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveTypeSchema),
        },
      },
    },
    404: {
      description: 'Leave type not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/v1/leave-types
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-types',
  summary: 'Create a new leave type',
  description: 'Create a new leave type. Requires manager role or above.',
  tags: ['Leave Types'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createLeaveTypeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Leave type created successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveTypeSchema),
        },
      },
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: 'Insufficient permissions',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// PUT /api/v1/leave-types/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/leave-types/{id}',
  summary: 'Update a leave type',
  description: 'Update an existing leave type. Requires manager role or above.',
  tags: ['Leave Types'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateLeaveTypeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Leave type updated successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveTypeSchema),
        },
      },
    },
    404: {
      description: 'Leave type not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// DELETE /api/v1/leave-types/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/leave-types/{id}',
  summary: 'Delete a leave type',
  description: 'Delete a leave type (soft delete by setting isActive to false). Requires manager role or above.',
  tags: ['Leave Types'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Leave type deleted successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(z.object({ message: z.string() })),
        },
      },
    },
    404: {
      description: 'Leave type not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// LEAVE REQUESTS ENDPOINTS
// ============================================================================

// GET /api/v1/leave-requests/my
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-requests/my',
  summary: 'Get my leave requests',
  description: 'Retrieve leave requests for the authenticated employee',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    query: myLeaveQuerySchema,
  },
  responses: {
    200: {
      description: 'My leave requests',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(leaveRequestSchema)),
        },
      },
    },
  },
});

// POST /api/v1/leave-requests
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-requests',
  summary: 'Create a leave request',
  description: 'Submit a new leave request',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createLeaveRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Leave request created successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveRequestSchema),
        },
      },
    },
    400: {
      description: 'Invalid request or insufficient balance',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/leave-requests
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-requests',
  summary: 'List all leave requests',
  description: 'Retrieve a paginated list of leave requests. Requires manager role or above.',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    query: listLeaveRequestsQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated list of leave requests',
      content: {
        'application/json': {
          schema: paginatedResponseSchema(leaveRequestSchema),
        },
      },
    },
  },
});

// GET /api/v1/leave-requests/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-requests/{id}',
  summary: 'Get leave request by ID',
  description: 'Retrieve a specific leave request. Requires manager role or above.',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Leave request details',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveRequestSchema),
        },
      },
    },
    404: {
      description: 'Leave request not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/v1/leave-requests/{id}/approve
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-requests/{id}/approve',
  summary: 'Approve a leave request',
  description: 'Approve a pending leave request. Requires manager role or above.',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: approveLeaveRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Leave request approved successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveRequestSchema),
        },
      },
    },
    400: {
      description: 'Request cannot be approved (already processed or cancelled)',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/v1/leave-requests/{id}/reject
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-requests/{id}/reject',
  summary: 'Reject a leave request',
  description: 'Reject a pending leave request. Requires manager role or above.',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: rejectLeaveRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Leave request rejected successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveRequestSchema),
        },
      },
    },
    400: {
      description: 'Request cannot be rejected',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// POST /api/v1/leave-requests/{id}/cancel
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-requests/{id}/cancel',
  summary: 'Cancel my leave request',
  description: 'Cancel a pending or approved leave request',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: cancelLeaveRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Leave request cancelled successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveRequestSchema),
        },
      },
    },
  },
});

// POST /api/v1/leave-requests/{id}/approve-with-replacements
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-requests/{id}/approve-with-replacements',
  summary: 'Approve leave with replacement assignments',
  description: 'Approve a leave request and assign replacement guards for affected shifts. Requires manager role or above.',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: approveLeaveWithReplacementsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Leave approved and replacements assigned',
      content: {
        'application/json': {
          schema: successResponseSchema(
            z.object({
              leaveRequest: leaveRequestSchema,
              replacements: z.array(z.any()),
            })
          ),
        },
      },
    },
  },
});

// POST /api/v1/leave-requests/{id}/assign-replacements
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-requests/{id}/assign-replacements',
  summary: 'Assign replacement guards',
  description: 'Assign replacement guards for an approved leave request. Requires manager role or above.',
  tags: ['Leave Requests'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: assignReplacementsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Replacements assigned successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(z.any())),
        },
      },
    },
  },
});

// ============================================================================
// LEAVE BALANCES ENDPOINTS
// ============================================================================

// GET /api/v1/leave-balances/my
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-balances/my',
  summary: 'Get my leave balances',
  description: 'Retrieve leave balances for the authenticated employee',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    query: myLeaveQuerySchema,
  },
  responses: {
    200: {
      description: 'My leave balances',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(leaveBalanceSchema)),
        },
      },
    },
  },
});

// GET /api/v1/leave-balances
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-balances',
  summary: 'List all leave balances',
  description: 'Retrieve paginated leave balances. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    query: listLeaveBalancesQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated list of leave balances',
      content: {
        'application/json': {
          schema: paginatedResponseSchema(leaveBalanceSchema),
        },
      },
    },
  },
});

// PUT /api/v1/leave-balances/{employeeId}/{leaveTypeId}
registry.registerPath({
  method: 'put',
  path: '/api/v1/leave-balances/{employeeId}/{leaveTypeId}',
  summary: 'Update leave balance',
  description: 'Update entitled days for an employee leave balance. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      employeeId: z.string().uuid(),
      leaveTypeId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateLeaveBalanceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Balance updated successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveBalanceSchema),
        },
      },
    },
  },
});

// POST /api/v1/leave-balances/initialize
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-balances/initialize',
  summary: 'Initialize balances for a year',
  description: 'Initialize leave balances for all or specific employees. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: initializeBalancesSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Balances initialized successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(
            z.object({
              message: z.string(),
              count: z.number(),
            })
          ),
        },
      },
    },
  },
});

// POST /api/v1/leave-balances/{id}/adjust
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-balances/{id}/adjust',
  summary: 'Adjust leave balance',
  description: 'Adjust a specific balance field with audit trail. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: adjustBalanceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Balance adjusted successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(
            z.object({
              balance: leaveBalanceSchema,
              adjustment: balanceAdjustmentSchema,
            })
          ),
        },
      },
    },
  },
});

// GET /api/v1/leave-balances/{id}/adjustments
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-balances/{id}/adjustments',
  summary: 'Get adjustment history',
  description: 'Retrieve adjustment history for a specific balance. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Adjustment history',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(balanceAdjustmentSchema)),
        },
      },
    },
  },
});

// GET /api/v1/leave-balances/adjustments
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-balances/adjustments',
  summary: 'List all adjustments',
  description: 'Retrieve paginated list of all balance adjustments. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    query: listAdjustmentsQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated list of adjustments',
      content: {
        'application/json': {
          schema: paginatedResponseSchema(balanceAdjustmentSchema),
        },
      },
    },
  },
});

// POST /api/v1/leave-balances/bulk-adjust
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-balances/bulk-adjust',
  summary: 'Bulk adjust balances',
  description: 'Adjust multiple leave balances in a single transaction. Requires manager role or above.',
  tags: ['Leave Balances'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: bulkAdjustSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Bulk adjustments completed',
      content: {
        'application/json': {
          schema: successResponseSchema(
            z.object({
              message: z.string(),
              count: z.number(),
              adjustments: z.array(balanceAdjustmentSchema),
            })
          ),
        },
      },
    },
  },
});

// ============================================================================
// LEAVE TEMPLATES ENDPOINTS
// ============================================================================

// GET /api/v1/leave-templates
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-templates',
  summary: 'List all leave templates',
  description: 'Retrieve all leave request templates',
  tags: ['Leave Templates'],
  security: [{ bearerAuth: [] }],
  request: {
    query: listTemplatesQuerySchema,
  },
  responses: {
    200: {
      description: 'List of templates',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(leaveTemplateSchema)),
        },
      },
    },
  },
});

// GET /api/v1/leave-templates/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave-templates/{id}',
  summary: 'Get template by ID',
  description: 'Retrieve a specific leave template',
  tags: ['Leave Templates'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Template details',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveTemplateSchema),
        },
      },
    },
  },
});

// POST /api/v1/leave-templates
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-templates',
  summary: 'Create a new template',
  description: 'Create a new leave request template. Requires manager role or above.',
  tags: ['Leave Templates'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTemplateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Template created successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveTemplateSchema),
        },
      },
    },
  },
});

// PUT /api/v1/leave-templates/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/leave-templates/{id}',
  summary: 'Update a template',
  description: 'Update an existing template. Requires manager role or above.',
  tags: ['Leave Templates'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateTemplateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Template updated successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(leaveTemplateSchema),
        },
      },
    },
  },
});

// DELETE /api/v1/leave-templates/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/leave-templates/{id}',
  summary: 'Delete a template',
  description: 'Delete a leave template. Requires manager role or above.',
  tags: ['Leave Templates'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Template deleted successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(z.object({ message: z.string() })),
        },
      },
    },
  },
});

// POST /api/v1/leave-templates/{id}/apply
registry.registerPath({
  method: 'post',
  path: '/api/v1/leave-templates/{id}/apply',
  summary: 'Apply a template',
  description: 'Generate draft leave request data from a template',
  tags: ['Leave Templates'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: applyTemplateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Template applied successfully',
      content: {
        'application/json': {
          schema: successResponseSchema(
            z.object({
              leaveTypeId: z.string().uuid(),
              startDate: z.string().optional(),
              endDate: z.string().optional(),
              reason: z.string().optional(),
            })
          ),
        },
      },
    },
  },
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// GET /api/v1/leave/reports/kpi
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave/reports/kpi',
  summary: 'Get KPI summary',
  description: 'Retrieve key performance indicators for leave management. Requires manager role or above.',
  tags: ['Analytics & Reports'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'KPI summary data',
      content: {
        'application/json': {
          schema: successResponseSchema(z.any()),
        },
      },
    },
  },
});

// GET /api/v1/leave/reports/utilization
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave/reports/utilization',
  summary: 'Get utilization report',
  description: 'Retrieve leave utilization statistics. Requires manager role or above.',
  tags: ['Analytics & Reports'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Utilization report data',
      content: {
        'application/json': {
          schema: successResponseSchema(z.any()),
        },
      },
    },
  },
});

// GET /api/v1/leave/calendar
registry.registerPath({
  method: 'get',
  path: '/api/v1/leave/calendar',
  summary: 'Get leave calendar',
  description: 'Retrieve leave calendar for a date range. Requires manager role or above.',
  tags: ['Analytics & Reports'],
  security: [{ bearerAuth: [] }],
  request: {
    query: leaveCalendarQuerySchema,
  },
  responses: {
    200: {
      description: 'Leave calendar data',
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(z.any())),
        },
      },
    },
  },
});

// ============================================================================
// GENERATE OPENAPI SPEC
// ============================================================================

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Security Guard HRM API',
    version: '1.0.0',
    description: `
# Security Guard HRM API Documentation

Multi-tenant Human Resource Management System for Thai security companies.

## Features
- **Leave Management**: Request, approve, and track employee leave
- **Leave Balances**: Track entitlements, usage, and adjustments
- **Leave Templates**: Quick leave request templates
- **Analytics**: Comprehensive reporting and analytics
- **Multi-tenant**: Secure data isolation per company

## Authentication
All endpoints require JWT authentication via Bearer token. Obtain a token by logging in via \`POST /api/v1/auth/login\`.

## Roles & Permissions
- **Guard**: Can submit and view own leave requests
- **Manager**: Can approve/reject requests, view team data, manage balances
- **Company Admin**: Full access to company data and settings
- **Super Admin**: Platform-wide access

## Response Format
All responses follow a consistent format:

**Success Response:**
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
\`\`\`

## Rate Limiting
API requests are rate-limited per user. Current limits:
- 100 requests per minute
- 1000 requests per hour

## Support
For API support, contact: dev@securityguard-hrm.com
    `.trim(),
    contact: {
      name: 'Security Guard HRM Team',
      email: 'dev@securityguard-hrm.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.securityguard-hrm.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Leave Types',
      description: 'Manage leave types (annual, sick, personal, etc.)',
    },
    {
      name: 'Leave Requests',
      description: 'Submit, approve, and manage leave requests',
    },
    {
      name: 'Leave Balances',
      description: 'Track and adjust employee leave balances',
    },
    {
      name: 'Leave Templates',
      description: 'Quick leave request templates for common scenarios',
    },
    {
      name: 'Analytics & Reports',
      description: 'Leave analytics, reports, and calendar views',
    },
  ],
});

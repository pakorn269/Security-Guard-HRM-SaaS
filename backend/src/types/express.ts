import { Request } from 'express';
import { JwtPayload } from '../middleware/auth.middleware.js';

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

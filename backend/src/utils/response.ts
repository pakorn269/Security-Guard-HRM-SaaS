import { Response } from 'express';

export interface SuccessResponse<T> {
    success: true;
    data: T;
    meta?: {
        page?: number;
        pageSize?: number;
        total?: number;
        totalPages?: number;
    };
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        message_th?: string;
        details?: Array<{
            field: string;
            message: string;
            message_th?: string;
        }>;
    };
}

export const sendSuccess = <T>(
    res: Response,
    data: T,
    statusCode = 200,
    meta?: SuccessResponse<T>['meta']
): Response => {
    const response: SuccessResponse<T> = {
        success: true,
        data,
    };
    if (meta) {
        response.meta = meta;
    }
    return res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
    messageTh?: string,
    details?: ErrorResponse['error']['details']
): Response => {
    const response: ErrorResponse = {
        success: false,
        error: {
            code,
            message,
            message_th: messageTh,
            details,
        },
    };
    return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T): Response => {
    return sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): Response => {
    return res.status(204).send();
};

export const sendPaginated = <T>(
    res: Response,
    data: T[],
    page: number,
    pageSize: number,
    total: number
): Response => {
    return sendSuccess(res, data, 200, {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    });
};

import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Upload Middleware
 * Configures Multer for file upload validation
 */

// Allowed MIME types for leave documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * File filter function for Multer
 * Validates file type based on MIME type
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  // Check if MIME type is allowed
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    logger.warn('Invalid file type upload attempt', {
      filename: file.originalname,
      mimetype: file.mimetype,
      userId: (req as any).user?.id,
    });
    callback(
      new AppError(
        'Invalid file type. Only PDF, JPG, and PNG files are allowed',
        'INVALID_FILE_TYPE',
        400
      )
    );
  }
};

/**
 * Multer configuration for leave document uploads
 * Uses memory storage to handle file buffer directly
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only one file per request
  },
  fileFilter: fileFilter,
});

/**
 * Middleware to handle single file upload
 * Field name: 'document'
 */
export const uploadLeaveDocument = upload.single('document');

/**
 * Error handler middleware for Multer errors
 * Converts Multer errors to AppError format
 */
export const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    // Handle Multer-specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError(
          'File size exceeds maximum limit of 5MB',
          'FILE_TOO_LARGE',
          400
        )
      );
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(
        new AppError(
          'Only one file can be uploaded at a time',
          'TOO_MANY_FILES',
          400
        )
      );
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError(
          'Unexpected field in upload. Use "document" field name',
          'UNEXPECTED_FIELD',
          400
        )
      );
    }

    // Generic Multer error
    logger.error('Multer error during file upload', {
      code: error.code,
      message: error.message,
    });
    return next(
      new AppError(
        'File upload failed. Please try again',
        'UPLOAD_ERROR',
        400
      )
    );
  }

  // Pass non-Multer errors to next error handler
  next(error);
};

/**
 * Middleware to validate that a file was uploaded
 * Use after uploadLeaveDocument middleware
 */
export const requireFile = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    return next(
      new AppError(
        'No file uploaded. Please select a file to upload',
        'NO_FILE_UPLOADED',
        400
      )
    );
  }
  next();
};

/**
 * Middleware to validate file size and type after upload
 * Additional validation layer for security
 */
export const validateUploadedFile = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const file = req.file;

  if (!file) {
    return next();
  }

  // Validate buffer size (redundant check, but good practice)
  if (file.size > MAX_FILE_SIZE) {
    return next(
      new AppError(
        'File size exceeds maximum limit of 5MB',
        'FILE_TOO_LARGE',
        400
      )
    );
  }

  // Validate MIME type (redundant check)
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return next(
      new AppError(
        'Invalid file type. Only PDF, JPG, and PNG files are allowed',
        'INVALID_FILE_TYPE',
        400
      )
    );
  }

  // Validate file buffer magic numbers for extra security
  const buffer = file.buffer;

  // PDF magic number: %PDF
  if (file.mimetype === 'application/pdf') {
    if (buffer.slice(0, 4).toString() !== '%PDF') {
      logger.warn('Invalid PDF file detected', {
        filename: file.originalname,
        userId: (req as any).user?.id,
      });
      return next(
        new AppError(
          'Invalid PDF file. File may be corrupted',
          'INVALID_FILE_CONTENT',
          400
        )
      );
    }
  }

  // JPEG magic number: FF D8 FF
  if (file.mimetype === 'image/jpeg') {
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
      logger.warn('Invalid JPEG file detected', {
        filename: file.originalname,
        userId: (req as any).user?.id,
      });
      return next(
        new AppError(
          'Invalid JPEG file. File may be corrupted',
          'INVALID_FILE_CONTENT',
          400
        )
      );
    }
  }

  // PNG magic number: 89 50 4E 47
  if (file.mimetype === 'image/png') {
    if (
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4E ||
      buffer[3] !== 0x47
    ) {
      logger.warn('Invalid PNG file detected', {
        filename: file.originalname,
        userId: (req as any).user?.id,
      });
      return next(
        new AppError(
          'Invalid PNG file. File may be corrupted',
          'INVALID_FILE_CONTENT',
          400
        )
      );
    }
  }

  logger.info('File validation passed', {
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    userId: (req as any).user?.id,
  });

  next();
};

/**
 * Combined middleware for leave document upload
 * Includes upload, error handling, and validation
 */
export const leaveDocumentUpload = [
  uploadLeaveDocument,
  handleUploadError,
  requireFile,
  validateUploadedFile,
];

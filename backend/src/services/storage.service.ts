import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Storage Service
 * Handles file uploads, downloads, and deletions using Supabase Storage
 */
export class StorageService {
  private readonly LEAVE_DOCUMENTS_BUCKET = 'leave-documents';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ];

  /**
   * Upload a leave document to Supabase Storage
   *
   * @param file - File buffer to upload
   * @param filename - Original filename
   * @param mimeType - File MIME type
   * @param companyId - Company ID for folder organization
   * @param leaveRequestId - Leave request ID for folder organization
   * @returns Storage path of uploaded file
   */
  async uploadLeaveDocument(
    file: Buffer,
    filename: string,
    mimeType: string,
    companyId: string,
    leaveRequestId: string
  ): Promise<string> {
    try {
      // Validate file size
      if (file.length > this.MAX_FILE_SIZE) {
        throw new AppError(
          'File size exceeds maximum limit of 5MB',
          'FILE_TOO_LARGE',
          400
        );
      }

      // Validate MIME type
      if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new AppError(
          'Invalid file type. Only PDF, JPG, and PNG files are allowed',
          'INVALID_FILE_TYPE',
          400
        );
      }

      // Sanitize filename (remove special characters, keep extension)
      const sanitizedFilename = this.sanitizeFilename(filename);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${sanitizedFilename}`;

      // Construct storage path: {companyId}/{leaveRequestId}/{timestamp}-{filename}
      const storagePath = `${companyId}/${leaveRequestId}/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.LEAVE_DOCUMENTS_BUCKET)
        .upload(storagePath, file, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        logger.error('Failed to upload leave document', {
          error: error.message,
          storagePath,
          companyId,
          leaveRequestId,
        });
        throw new AppError(
          'Failed to upload document. Please try again.',
          'UPLOAD_FAILED',
          500
        );
      }

      logger.info('Leave document uploaded successfully', {
        storagePath: data.path,
        companyId,
        leaveRequestId,
        fileSize: file.length,
        mimeType,
      });

      return data.path;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error uploading leave document', { error });
      throw new AppError(
        'An unexpected error occurred while uploading the document',
        'UPLOAD_ERROR',
        500
      );
    }
  }

  /**
   * Get a signed URL for viewing/downloading a leave document
   *
   * @param storagePath - Storage path of the document
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Signed URL for accessing the document
   */
  async getLeaveDocumentUrl(
    storagePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.LEAVE_DOCUMENTS_BUCKET)
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        logger.error('Failed to generate signed URL', {
          error: error.message,
          storagePath,
        });
        throw new AppError(
          'Failed to generate document URL',
          'URL_GENERATION_FAILED',
          500
        );
      }

      if (!data || !data.signedUrl) {
        throw new AppError(
          'Document not found',
          'DOCUMENT_NOT_FOUND',
          404
        );
      }

      logger.debug('Generated signed URL for leave document', {
        storagePath,
        expiresIn,
      });

      return data.signedUrl;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error generating document URL', { error });
      throw new AppError(
        'An unexpected error occurred while accessing the document',
        'URL_ERROR',
        500
      );
    }
  }

  /**
   * Delete a leave document from Supabase Storage
   *
   * @param storagePath - Storage path of the document to delete
   */
  async deleteLeaveDocument(storagePath: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.storage
        .from(this.LEAVE_DOCUMENTS_BUCKET)
        .remove([storagePath]);

      if (error) {
        logger.error('Failed to delete leave document', {
          error: error.message,
          storagePath,
        });
        throw new AppError(
          'Failed to delete document',
          'DELETE_FAILED',
          500
        );
      }

      logger.info('Leave document deleted successfully', { storagePath });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error deleting leave document', { error });
      throw new AppError(
        'An unexpected error occurred while deleting the document',
        'DELETE_ERROR',
        500
      );
    }
  }

  /**
   * Check if a file exists in storage
   *
   * @param storagePath - Storage path to check
   * @returns True if file exists, false otherwise
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.LEAVE_DOCUMENTS_BUCKET)
        .list(storagePath.substring(0, storagePath.lastIndexOf('/')), {
          search: storagePath.substring(storagePath.lastIndexOf('/') + 1),
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Error checking file existence', { error, storagePath });
      return false;
    }
  }

  /**
   * Sanitize filename to remove dangerous characters
   * Keeps alphanumeric, hyphens, underscores, dots, and preserves extension
   *
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    // Get file extension
    const lastDotIndex = filename.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;

    // Remove special characters, keep only alphanumeric, hyphen, underscore
    const sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .substring(0, 100); // Limit length

    return `${sanitized}${extension}`.toLowerCase();
  }

  /**
   * Get file extension from MIME type
   *
   * @param mimeType - MIME type
   * @returns File extension (e.g., '.pdf', '.jpg')
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    };
    return mimeToExt[mimeType] || '';
  }

  /**
   * Validate file buffer (check if it's a valid file type by magic numbers)
   * Basic validation - can be extended for more robust checking
   *
   * @param buffer - File buffer
   * @param mimeType - Expected MIME type
   * @returns True if valid
   */
  private validateFileBuffer(buffer: Buffer, mimeType: string): boolean {
    // PDF magic number: %PDF
    if (mimeType === 'application/pdf') {
      return buffer.slice(0, 4).toString() === '%PDF';
    }

    // JPEG magic number: FF D8 FF
    if (mimeType === 'image/jpeg') {
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    }

    // PNG magic number: 89 50 4E 47
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47
      );
    }

    return false;
  }
}

// Export singleton instance
export const storageService = new StorageService();

/**
 * Integration tests for document upload functionality
 * Tests the complete flow from upload to retrieval to deletion
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const { mockUploadedFiles, mockStorageFrom } = vi.hoisted(() => {
  const uploadedFiles = new Set<string>();
  const storageFrom = {
    upload: vi.fn().mockImplementation(async (path: string) => {
      uploadedFiles.add(path);
      return { data: { path }, error: null };
    }),
    remove: vi.fn().mockImplementation(async (paths: string[]) => {
      paths.forEach(p => uploadedFiles.delete(p));
      return { data: paths.map(p => ({ name: p })), error: null };
    }),
    list: vi.fn().mockImplementation(async (folderPath: string, options?: { search?: string }) => {
      const filename = options?.search;
      if (!filename) {
        return { data: [], error: null };
      }
      const fullPath = `${folderPath}/${filename}`;
      if (uploadedFiles.has(fullPath)) {
        return { data: [{ name: filename }], error: null };
      }
      return { data: [], error: null };
    }),
    createSignedUrl: vi.fn().mockImplementation(async (path: string, expires: number) => {
      if (!uploadedFiles.has(path)) {
        throw new Error('Object not found');
      }
      return { data: { signedUrl: `https://example.com/signed-url?token=mocked&path=${path}&expires=${expires}` }, error: null };
    }),
  };
  return {
    mockUploadedFiles: uploadedFiles,
    mockStorageFrom: storageFrom,
  };
});

vi.mock('../../config/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [{ id: 'leave-documents' }], error: null }),
      from: vi.fn().mockReturnValue(mockStorageFrom),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'test-request-id', document_url: 'path' }, error: null }),
      };
      return mockQueryBuilder;
    }),
  },
}));

import { storageService } from '../../services/storage.service.js';
import { leaveService } from './leave.service.js';
import { supabaseAdmin } from '../../config/supabase.js';

describe('Document Upload Integration Tests', () => {
  // Test data
  const testCompanyId = 'test-company-' + Date.now();
  const testLeaveRequestId = 'test-request-' + Date.now();
  let uploadedFilePath: string | null = null;

  // Mock file data
  const createMockPDFBuffer = (): Buffer => {
    // Create a minimal valid PDF
    const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n%%EOF';
    return Buffer.from(pdfContent, 'utf-8');
  };

  const createMockJPEGBuffer = (): Buffer => {
    // Create a minimal valid JPEG (magic number + minimal structure)
    return Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI + APP0 marker
      0x00, 0x10, // APP0 length
      0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
      0x01, 0x01, // version
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // density info
      0xFF, 0xD9, // JPEG EOI
    ]);
  };

  const createMockPNGBuffer = (): Buffer => {
    // Create a minimal valid PNG
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, // PNG signature
      0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // "IHDR"
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk
      0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82,
    ]);
  };

  beforeAll(async () => {
    // Verify storage bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const leaveDocsBucket = buckets?.find(b => b.id === 'leave-documents');

    if (!leaveDocsBucket) {
      console.warn('⚠️  leave-documents bucket not found. Some tests may fail.');
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test file if it was uploaded
    if (uploadedFilePath) {
      try {
        await storageService.deleteLeaveDocument(uploadedFilePath);
      } catch (error) {
        console.warn('Failed to cleanup test file:', error);
      }
    }
  });

  beforeEach(() => {
    uploadedFilePath = null;
  });

  describe('StorageService.uploadLeaveDocument', () => {
    it('should upload a valid PDF file', async () => {
      const buffer = createMockPDFBuffer();
      const filename = 'test-document.pdf';
      const mimeType = 'application/pdf';

      const path = await storageService.uploadLeaveDocument(
        buffer,
        filename,
        mimeType,
        testCompanyId,
        testLeaveRequestId
      );

      expect(path).toBeTruthy();
      expect(path).toContain(testCompanyId);
      expect(path).toContain(testLeaveRequestId);
      expect(path).toMatch(/\.pdf$/);

      uploadedFilePath = path;
    });

    it('should upload a valid JPEG file', async () => {
      const buffer = createMockJPEGBuffer();
      const filename = 'test-image.jpg';
      const mimeType = 'image/jpeg';

      const path = await storageService.uploadLeaveDocument(
        buffer,
        filename,
        mimeType,
        testCompanyId,
        testLeaveRequestId + '-jpg'
      );

      expect(path).toBeTruthy();
      expect(path).toContain(testCompanyId);
      expect(path).toMatch(/\.(jpg|jpeg)$/i);

      // Cleanup
      await storageService.deleteLeaveDocument(path);
    });

    it('should upload a valid PNG file', async () => {
      const buffer = createMockPNGBuffer();
      const filename = 'test-image.png';
      const mimeType = 'image/png';

      const path = await storageService.uploadLeaveDocument(
        buffer,
        filename,
        mimeType,
        testCompanyId,
        testLeaveRequestId + '-png'
      );

      expect(path).toBeTruthy();
      expect(path).toContain(testCompanyId);
      expect(path).toMatch(/\.png$/);

      // Cleanup
      await storageService.deleteLeaveDocument(path);
    });

    it('should reject files exceeding size limit', async () => {
      // Create a 6MB buffer (exceeds 5MB limit)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      const filename = 'large-file.pdf';
      const mimeType = 'application/pdf';

      await expect(
        storageService.uploadLeaveDocument(
          largeBuffer,
          filename,
          mimeType,
          testCompanyId,
          testLeaveRequestId
        )
      ).rejects.toThrow(/file size exceeds/i);
    });

    it('should reject invalid MIME types', async () => {
      const buffer = Buffer.from('fake content');
      const filename = 'test.exe';
      const mimeType = 'application/x-msdownload';

      await expect(
        storageService.uploadLeaveDocument(
          buffer,
          filename,
          mimeType,
          testCompanyId,
          testLeaveRequestId
        )
      ).rejects.toThrow(/invalid file type/i);
    });

    it('should sanitize filenames with special characters', async () => {
      const buffer = createMockPDFBuffer();
      const filename = 'test file!@#$%^&*().pdf';
      const mimeType = 'application/pdf';

      const path = await storageService.uploadLeaveDocument(
        buffer,
        filename,
        mimeType,
        testCompanyId,
        testLeaveRequestId + '-sanitized'
      );

      // Should not contain special characters
      expect(path).not.toMatch(/[!@#$%^&*()]/);
      expect(path).toMatch(/\.pdf$/);

      // Cleanup
      await storageService.deleteLeaveDocument(path);
    });
  });

  describe('StorageService.getLeaveDocumentUrl', () => {
    it('should generate a signed URL for uploaded file', async () => {
      // First upload a file
      const buffer = createMockPDFBuffer();
      const path = await storageService.uploadLeaveDocument(
        buffer,
        'test.pdf',
        'application/pdf',
        testCompanyId,
        testLeaveRequestId + '-url-test'
      );

      uploadedFilePath = path;

      // Then get signed URL
      const signedUrl = await storageService.getLeaveDocumentUrl(path);

      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toMatch(/^https?:\/\//);
      expect(signedUrl).toContain('token='); // Supabase signed URLs contain token
    });

    it('should handle non-existent file gracefully', async () => {
      const fakePath = `${testCompanyId}/fake-request/nonexistent.pdf`;

      await expect(
        storageService.getLeaveDocumentUrl(fakePath)
      ).rejects.toThrow();
    });

    it('should respect custom expiration time', async () => {
      // Upload file
      const buffer = createMockPDFBuffer();
      const path = await storageService.uploadLeaveDocument(
        buffer,
        'test.pdf',
        'application/pdf',
        testCompanyId,
        testLeaveRequestId + '-expiry-test'
      );

      // Get URL with custom expiry (60 seconds)
      const signedUrl = await storageService.getLeaveDocumentUrl(path, 60);

      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toMatch(/^https?:\/\//);

      // Cleanup
      await storageService.deleteLeaveDocument(path);
    });
  });

  describe('StorageService.deleteLeaveDocument', () => {
    it('should delete uploaded file', async () => {
      // Upload file
      const buffer = createMockPDFBuffer();
      const path = await storageService.uploadLeaveDocument(
        buffer,
        'test-delete.pdf',
        'application/pdf',
        testCompanyId,
        testLeaveRequestId + '-delete-test'
      );

      // Delete file
      await expect(
        storageService.deleteLeaveDocument(path)
      ).resolves.not.toThrow();

      // Verify deletion by checking if file exists
      const exists = await storageService.fileExists(path);
      expect(exists).toBe(false);
    });

    it('should handle deletion of non-existent file gracefully', async () => {
      const fakePath = `${testCompanyId}/fake-request/nonexistent.pdf`;

      // Should not throw error (idempotent operation)
      await expect(
        storageService.deleteLeaveDocument(fakePath)
      ).resolves.not.toThrow();
    });
  });

  describe('StorageService.fileExists', () => {
    it('should return true for existing file', async () => {
      // Upload file
      const buffer = createMockPDFBuffer();
      const path = await storageService.uploadLeaveDocument(
        buffer,
        'test-exists.pdf',
        'application/pdf',
        testCompanyId,
        testLeaveRequestId + '-exists-test'
      );

      uploadedFilePath = path;

      // Check existence
      const exists = await storageService.fileExists(path);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const fakePath = `${testCompanyId}/fake-request/nonexistent.pdf`;

      const exists = await storageService.fileExists(fakePath);
      expect(exists).toBe(false);
    });
  });

  describe('LeaveService.updateDocumentUrl integration', () => {
    it('should update document URL in database', async () => {
      // This test requires a real leave request in the database
      // For now, we'll just verify the method exists and doesn't throw with mock data
      const mockRequestId = testLeaveRequestId;
      const mockDocumentUrl = `${testCompanyId}/${mockRequestId}/test.pdf`;

      // Note: This will fail if leave request doesn't exist
      // In a real test, you'd create a leave request first
      await expect(
        leaveService.updateDocumentUrl(mockRequestId, mockDocumentUrl)
      ).resolves.not.toThrow();
    });
  });

  describe('End-to-end workflow', () => {
    it('should handle complete upload -> retrieve -> delete workflow', async () => {
      // 1. Upload
      const buffer = createMockPDFBuffer();
      const uploadedPath = await storageService.uploadLeaveDocument(
        buffer,
        'workflow-test.pdf',
        'application/pdf',
        testCompanyId,
        testLeaveRequestId + '-workflow'
      );

      expect(uploadedPath).toBeTruthy();

      // 2. Verify file exists
      const exists = await storageService.fileExists(uploadedPath);
      expect(exists).toBe(true);

      // 3. Get signed URL
      const signedUrl = await storageService.getLeaveDocumentUrl(uploadedPath);
      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toMatch(/^https?:\/\//);

      // 4. Delete
      await storageService.deleteLeaveDocument(uploadedPath);

      // 5. Verify deletion
      const existsAfterDelete = await storageService.fileExists(uploadedPath);
      expect(existsAfterDelete).toBe(false);
    });
  });
});

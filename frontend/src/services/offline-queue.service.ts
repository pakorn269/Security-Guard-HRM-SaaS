/**
 * Offline Queue Service
 * Handles offline leave request submission using IndexedDB
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import leaveService from './leave.service';
import type { LeaveRequestPayload } from '../types/leave.types';

// ============================================================================
// TYPES
// ============================================================================

export interface QueuedLeaveRequest {
    id: string; // Local UUID
    payload: LeaveRequestPayload;
    documentFile?: {
        name: string;
        type: string;
        size: number;
        dataUrl: string; // Base64 data URL
    };
    status: 'pending_sync' | 'syncing' | 'synced' | 'failed';
    createdAt: number;
    lastAttempt?: number;
    error?: string;
    retryCount: number;
}

interface OfflineQueueDB extends DBSchema {
    leaveRequests: {
        key: string;
        value: QueuedLeaveRequest;
        indexes: { 'by-status': string; 'by-created': number };
    };
}

// ============================================================================
// OFFLINE QUEUE SERVICE
// ============================================================================

class OfflineQueueService {
    private dbName = 'leave-offline-queue';
    private dbVersion = 1;
    private db: IDBPDatabase<OfflineQueueDB> | null = null;
    private isOnline = navigator.onLine;
    private syncInProgress = false;
    private listeners: Array<(event: OfflineQueueEvent) => void> = [];

    constructor() {
        this.initializeDB();
        this.setupNetworkListeners();
    }

    /**
     * Initialize IndexedDB
     */
    private async initializeDB() {
        try {
            this.db = await openDB<OfflineQueueDB>(this.dbName, this.dbVersion, {
                upgrade(db) {
                    // Create object store for leave requests
                    const store = db.createObjectStore('leaveRequests', {
                        keyPath: 'id',
                    });

                    // Create indexes
                    store.createIndex('by-status', 'status');
                    store.createIndex('by-created', 'createdAt');
                },
            });
        } catch (error) {
            console.error('Failed to initialize offline queue DB:', error);
        }
    }

    /**
     * Setup network event listeners
     */
    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('[OfflineQueue] Network online');
            this.isOnline = true;
            this.emit({ type: 'online' });
            this.syncRequests();
        });

        window.addEventListener('offline', () => {
            console.log('[OfflineQueue] Network offline');
            this.isOnline = false;
            this.emit({ type: 'offline' });
        });
    }

    /**
     * Check if device is online
     */
    public getOnlineStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Queue a leave request for offline submission
     */
    public async queueRequest(
        payload: LeaveRequestPayload,
        documentFile?: File
    ): Promise<QueuedLeaveRequest> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Generate local ID
        const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Convert file to data URL if provided
        let documentData: QueuedLeaveRequest['documentFile'] | undefined;
        if (documentFile) {
            const dataUrl = await this.fileToDataURL(documentFile);
            documentData = {
                name: documentFile.name,
                type: documentFile.type,
                size: documentFile.size,
                dataUrl,
            };
        }

        const queuedRequest: QueuedLeaveRequest = {
            id,
            payload,
            documentFile: documentData,
            status: 'pending_sync',
            createdAt: Date.now(),
            retryCount: 0,
        };

        await this.db.put('leaveRequests', queuedRequest);

        this.emit({ type: 'queued', request: queuedRequest });

        return queuedRequest;
    }

    /**
     * Sync all pending requests
     */
    public async syncRequests(): Promise<void> {
        if (!this.db || !this.isOnline || this.syncInProgress) {
            return;
        }

        try {
            this.syncInProgress = true;
            this.emit({ type: 'sync-start' });

            const pendingRequests = await this.db.getAllFromIndex(
                'leaveRequests',
                'by-status',
                'pending_sync'
            );

            console.log(`[OfflineQueue] Found ${pendingRequests.length} pending requests`);

            for (const request of pendingRequests) {
                await this.syncSingleRequest(request);
            }

            this.emit({ type: 'sync-complete' });
        } catch (error) {
            console.error('[OfflineQueue] Sync error:', error);
            this.emit({ type: 'sync-error', error: error as Error });
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync a single request
     */
    private async syncSingleRequest(request: QueuedLeaveRequest): Promise<void> {
        if (!this.db) return;

        try {
            // Update status to syncing
            request.status = 'syncing';
            request.lastAttempt = Date.now();
            await this.db.put('leaveRequests', request);

            // Create leave request
            const createdRequest = await leaveService.createLeaveRequest(request.payload);

            // Upload document if exists
            if (request.documentFile && createdRequest.id) {
                const file = await this.dataURLToFile(
                    request.documentFile.dataUrl,
                    request.documentFile.name,
                    request.documentFile.type
                );
                await leaveService.uploadLeaveDocument(createdRequest.id, file);
            }

            // Mark as synced
            request.status = 'synced';
            await this.db.put('leaveRequests', request);

            this.emit({ type: 'synced', request });

            // Remove after 24 hours (keep for debugging)
            setTimeout(() => this.removeRequest(request.id), 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error('[OfflineQueue] Failed to sync request:', error);

            // Update retry count and status
            request.retryCount++;
            request.error = error instanceof Error ? error.message : 'Unknown error';

            // If too many retries, mark as failed
            if (request.retryCount >= 3) {
                request.status = 'failed';
            } else {
                request.status = 'pending_sync';
            }

            await this.db.put('leaveRequests', request);

            this.emit({ type: 'sync-failed', request, error: error as Error });
        }
    }

    /**
     * Get all queued requests
     */
    public async getQueuedRequests(): Promise<QueuedLeaveRequest[]> {
        if (!this.db) return [];

        const requests = await this.db.getAll('leaveRequests');
        return requests.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get pending request count
     */
    public async getPendingCount(): Promise<number> {
        if (!this.db) return 0;

        const pending = await this.db.getAllFromIndex(
            'leaveRequests',
            'by-status',
            'pending_sync'
        );
        return pending.length;
    }

    /**
     * Remove a request from queue
     */
    public async removeRequest(id: string): Promise<void> {
        if (!this.db) return;
        await this.db.delete('leaveRequests', id);
    }

    /**
     * Clear all synced requests
     */
    public async clearSyncedRequests(): Promise<void> {
        if (!this.db) return;

        const synced = await this.db.getAllFromIndex('leaveRequests', 'by-status', 'synced');
        for (const request of synced) {
            await this.db.delete('leaveRequests', request.id);
        }
    }

    /**
     * Convert File to Data URL
     */
    private fileToDataURL(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert Data URL to File
     */
    private async dataURLToFile(
        dataUrl: string,
        filename: string,
        type: string
    ): Promise<File> {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], filename, { type });
    }

    /**
     * Event emitter
     */
    public on(callback: (event: OfflineQueueEvent) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
        };
    }

    private emit(event: OfflineQueueEvent): void {
        this.listeners.forEach((listener) => listener(event));
    }
}

// ============================================================================
// EVENTS
// ============================================================================

export type OfflineQueueEvent =
    | { type: 'online' }
    | { type: 'offline' }
    | { type: 'queued'; request: QueuedLeaveRequest }
    | { type: 'sync-start' }
    | { type: 'sync-complete' }
    | { type: 'sync-error'; error: Error }
    | { type: 'synced'; request: QueuedLeaveRequest }
    | { type: 'sync-failed'; request: QueuedLeaveRequest; error: Error };

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;

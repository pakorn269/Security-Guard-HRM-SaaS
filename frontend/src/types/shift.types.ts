export type ShiftStatus = 'draft' | 'published' | 'cancelled';

export interface ShiftTemplate {
    id: string;
    companyId: string;
    name: string;
    nameTh?: string;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    breakMinutes: number;
    color: string;
    isOvernight: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Shift {
    id: string;
    companyId: string;
    employeeId: string;
    templateId?: string;
    date: string; // YYYY-MM-DD format
    startTime: string;
    endTime: string;
    location?: string;
    status: ShiftStatus;
    notes?: string;
    publishedAt?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    // Populated fields
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    template?: ShiftTemplate;
}

export interface CalendarDay {
    date: string;
    shifts: Shift[];
    isToday: boolean;
    isCurrentMonth: boolean;
}

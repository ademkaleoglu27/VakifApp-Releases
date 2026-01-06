
export type DutyType = {
    id: string;
    name: string;
    description?: string;
    default_points: number;
};

export type RotationPool = {
    id: string;
    duty_type_id: string;
    name: string;
    rotation_pools?: DutyType; // Join result
    is_active: boolean;
};

export type DutyAssignment = {
    id: string;
    pool_id: string;
    user_id: string;
    date: string; // YYYY-MM-DD
    status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED' | 'SKIPPED' | 'COMPLETED';
    rotation_pools?: RotationPool; // Join result
    created_at: string;
};

// Response from Edge Function
export type DutyResponse = {
    message: string;
    [key: string]: any;
};

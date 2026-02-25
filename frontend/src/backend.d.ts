import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface QueryRange {
    endDate: string;
    startDate: string;
}
export interface AttendanceRecord {
    swipeIn: string;
    date: string;
    breakfastAtOffice: boolean;
    swipeOut: string;
    leaveType: LeaveType;
}
export interface UserProfile {
    name: string;
}
export enum LeaveType {
    halfDayFirstHalf = "halfDayFirstHalf",
    noLeave = "noLeave",
    fullDayLeave = "fullDayLeave",
    halfDaySecondHalf = "halfDaySecondHalf"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteRecord(date: string): Promise<boolean>;
    getAllRecords(): Promise<Array<AttendanceRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getRecord(date: string): Promise<AttendanceRecord | null>;
    getRecordsByDateRange(range: QueryRange): Promise<Array<AttendanceRecord>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveRecord(record: AttendanceRecord): Promise<void>;
}

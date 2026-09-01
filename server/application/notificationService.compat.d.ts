declare module "./notificationService" {
  interface NotificationService {
    queueAttendanceAlert(
      tenant: { schoolId: string; userId: string; role: "admin" },
      studentId: string,
      occurredAt: string,
    ): Promise<void>;
  }
}

export {};

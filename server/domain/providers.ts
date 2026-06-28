export type NotificationChannel = "email" | "sms" | "whatsapp" | "in_app";

export type NotificationMessage = {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
};

export type DeliveryResult = {
  provider: string;
  externalId?: string;
  response?: unknown;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<DeliveryResult>;
}

export type BiometricEnrollment = {
  studentId: string;
  reference: string;
};

export interface BiometricProvider {
  enroll(studentId: string, capture: unknown): Promise<BiometricEnrollment>;
  verify(capture: unknown): Promise<{ reference: string; confidence: number }>;
}

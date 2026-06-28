import nodemailer from "nodemailer";
import { AppError } from "../domain/errors";
import type {
  DeliveryResult,
  NotificationMessage,
  NotificationProvider,
} from "../domain/providers";
import { query } from "./database";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new AppError(503, `${name} is not configured`);
  return value;
}

export class SmtpNotificationProvider implements NotificationProvider {
  readonly channel = "email" as const;

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const transporter = nodemailer.createTransport({
      host: required("SMTP_HOST"),
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: required("SMTP_USER"),
        pass: required("SMTP_PASSWORD"),
      },
    });
    const response = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: message.recipient,
      subject: message.subject || "EduSphere notification",
      html: message.body,
    });
    return { provider: "smtp", externalId: response.messageId, response: response.response };
  }
}

export class AfricasTalkingSmsProvider implements NotificationProvider {
  readonly channel = "sms" as const;

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const body = new URLSearchParams({
      username: required("AFRICASTALKING_USERNAME"),
      to: message.recipient,
      message: message.body,
    });
    if (process.env.AFRICASTALKING_SENDER_ID) body.set("from", process.env.AFRICASTALKING_SENDER_ID);
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: required("AFRICASTALKING_API_KEY"),
      },
      body,
    });
    const payload = await response.json();
    if (!response.ok) throw new AppError(502, "Africa's Talking delivery failed", payload);
    return { provider: "africastalking", response: payload };
  }
}

export class UltraMsgWhatsAppProvider implements NotificationProvider {
  readonly channel = "whatsapp" as const;

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const instance = required("ULTRAMSG_INSTANCE_ID");
    const body = new URLSearchParams({
      token: required("ULTRAMSG_TOKEN"),
      to: message.recipient,
      body: message.body,
    });
    const response = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = await response.json();
    if (!response.ok) throw new AppError(502, "WhatsApp delivery failed", payload);
    return { provider: "ultramsg", response: payload };
  }
}

export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = "in_app" as const;

  constructor(private readonly schoolId: string) {}

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const result = await query(
      `insert into notifications (
         "schoolId", "userId", title, message, type, read, timestamp
       ) values ($1, $2, $3, $4, 'info', false, now())
       returning id`,
      [this.schoolId, message.recipient, message.subject || "Notification", message.body],
    );
    return { provider: "in_app", externalId: String(result.rows[0]?.id) };
  }
}

export function createNotificationProvider(channel: NotificationMessage["channel"], schoolId: string): NotificationProvider {
  switch (channel) {
    case "email":
      return new SmtpNotificationProvider();
    case "sms":
      return new AfricasTalkingSmsProvider();
    case "whatsapp":
      return new UltraMsgWhatsAppProvider();
    case "in_app":
      return new InAppNotificationProvider(schoolId);
  }
}

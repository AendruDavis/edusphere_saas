import { getResourceConfig, SNAPSHOT_RESOURCES, type ResourceKey } from "./resourceRegistry";
import { AppError, assertFound } from "../domain/errors";
import { canAccessRole, type AuthUser, type UserRole } from "../domain/roles";
import { PostgresRepository, type RecordData } from "../infrastructure/postgresRepository";
import { AuthService } from "../infrastructure/authService";

const DEFAULT_SETTINGS = {
  name: "EduSphere Academy",
  logo: null,
  level: "Primary",
  classes: ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"],
  currency: "UGX",
  academicYear: "2026/2027",
  classFees: {},
  gradingScale: [
    { min: 80, grade: "D1", comment: "Distinction 1" },
    { min: 75, grade: "D2", comment: "Distinction 2" },
    { min: 70, grade: "C3", comment: "Credit 3" },
    { min: 65, grade: "C4", comment: "Credit 4" },
    { min: 60, grade: "C5", comment: "Credit 5" },
    { min: 55, grade: "C6", comment: "Pass" },
    { min: 0, grade: "F9", comment: "Fail" },
  ],
};

const optionalRelationFields: Partial<Record<ResourceKey, string[]>> = {
  transactions: ["studentId"],
  attendanceRecords: ["studentId"],
  leaveRequests: ["staffId"],
  vehicles: ["driverId"],
  routes: ["vehicleId"],
  timetableEntries: ["teacherId"],
};

type CreateUserPayload = Parameters<AuthService["createUser"]>[0];
type UpdateUserPayload = Parameters<AuthService["updateUser"]>[1];

function requireRoles(user: AuthUser, roles: UserRole[]) {
  if (!canAccessRole(user, roles)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }
}

function normalizePayload(resource: ResourceKey, payload: RecordData) {
  const next = { ...payload };
  for (const field of optionalRelationFields[resource] ?? []) {
    if (next[field] === "") next[field] = null;
  }
  return next;
}

export class AppService {
  constructor(
    private readonly repository = new PostgresRepository(),
    private readonly authService = new AuthService(),
  ) {}

  async getSnapshot(user: AuthUser) {
    const entries = await Promise.all(
      SNAPSHOT_RESOURCES.map(async (resource) => {
        const config = getResourceConfig(resource);
        if (!canAccessRole(user, config.read)) {
          return [resource, []] as const;
        }
        return [resource, await this.repository.list(config.table)] as const;
      }),
    );

    const settings = await this.repository.getSettings();
    const snapshot = Object.fromEntries(entries);

    return {
      schoolSettings: settings ?? DEFAULT_SETTINGS,
      ...snapshot,
      notifications: (snapshot.notifications as RecordData[]).filter(
        (notification) => notification.userId === user.id || notification.userId === "all" || notification.targetRole === user.role,
      ),
    };
  }

  async saveSettings(user: AuthUser, settings: RecordData) {
    requireRoles(user, ["admin"]);
    return this.repository.upsertSettings(settings);
  }

  async createResource(user: AuthUser, resource: ResourceKey, payload: RecordData) {
    const config = assertFound(getResourceConfig(resource), "Unknown resource");
    requireRoles(user, config.create);
    const normalizedPayload = normalizePayload(resource, payload);

    if (resource === "users") {
      return this.authService.createUser(normalizedPayload as CreateUserPayload);
    }

    if (resource === "transactions") {
      return this.recordTransaction(user, normalizedPayload);
    }

    if (resource === "expenses") {
      return this.recordExpense(user, normalizedPayload);
    }

    if (resource === "dormRooms") {
      const room = await this.repository.create(config.table, { ...normalizedPayload, occupants: normalizedPayload.occupants ?? [] });
      await this.appendToJsonArray("dormitories", String(normalizedPayload.dormId), "rooms", String(room.id));
      return room;
    }

    if (resource === "dormAllocations") {
      const allocation = await this.repository.create(config.table, normalizedPayload);
      await this.appendToJsonArray("dorm_rooms", String(normalizedPayload.roomId), "occupants", String(normalizedPayload.studentId));
      return allocation;
    }

    return this.repository.create(config.table, normalizedPayload);
  }

  async updateResource(user: AuthUser, resource: ResourceKey, id: string, payload: RecordData) {
    const config = assertFound(getResourceConfig(resource), "Unknown resource");
    requireRoles(user, config.update);
    const normalizedPayload = normalizePayload(resource, payload);

    if (resource === "users") {
      return this.authService.updateUser(id, normalizedPayload as UpdateUserPayload);
    }

    if (resource === "dormAllocations" && normalizedPayload.status === "checked-out") {
      const existing = await this.repository.getById(config.table, id);
      const updated = await this.repository.update(config.table, id, normalizedPayload);
      if (existing) {
        await this.removeFromJsonArray("dorm_rooms", String(existing.roomId), "occupants", String(existing.studentId));
      }
      return updated;
    }

    return this.repository.update(config.table, id, normalizedPayload);
  }

  async deleteResource(user: AuthUser, resource: ResourceKey, id: string) {
    const config = assertFound(getResourceConfig(resource), "Unknown resource");
    requireRoles(user, config.delete);

    if (resource === "users") {
      return this.authService.deleteUser(id);
    }

    if (resource === "dormRooms") {
      const room = await this.repository.getById(config.table, id);
      if (room) {
        await this.removeFromJsonArray("dormitories", String(room.dormId), "rooms", id);
      }
    }

    return this.repository.delete(config.table, id);
  }

  async recordTransaction(user: AuthUser, payload: RecordData) {
    requireRoles(user, ["admin", "accountant"]);
    return this.repository.call("record_transaction", { transaction_input: payload });
  }

  async recordExpense(user: AuthUser, payload: RecordData) {
    requireRoles(user, ["admin", "accountant"]);
    return this.repository.call("record_expense", { expense_input: payload });
  }

  async recordAttendance(user: AuthUser, payload: RecordData) {
    requireRoles(user, ["admin", "teacher", "nurse"]);
    return this.repository.create("attendance_records", payload);
  }

  async recordBiometricCheckIn(secret: string | undefined, payload: RecordData) {
    if (!process.env.INTEGRATION_WEBHOOK_SECRET || secret !== process.env.INTEGRATION_WEBHOOK_SECRET) {
      throw new AppError(401, "Invalid integration secret");
    }

    return this.repository.call("record_biometric_check_in", { check_in: payload });
  }

  async updateGpsLocation(secret: string | undefined, payload: RecordData) {
    if (!process.env.INTEGRATION_WEBHOOK_SECRET || secret !== process.env.INTEGRATION_WEBHOOK_SECRET) {
      throw new AppError(401, "Invalid integration secret");
    }

    return this.repository.call("update_vehicle_location", { location_input: payload });
  }

  async getBusLocations(user: AuthUser) {
    const vehicles = await this.repository.list("vehicles");
    return vehicles
      .filter((vehicle) => vehicle.lastLocation)
      .map((vehicle) => ({
        id: vehicle.id,
        ...(vehicle.lastLocation as RecordData),
        status: vehicle.status,
        label: `${vehicle.plateNumber || "Bus"} - ${vehicle.driverName || "Unassigned"}`,
      }));
  }

  private async appendToJsonArray(table: string, id: string, field: string, value: string) {
    const record = await this.repository.getById(table, id);
    if (!record) return;

    const current = Array.isArray(record[field]) ? (record[field] as string[]) : [];
    if (current.includes(value)) return;
    await this.repository.update(table, id, { [field]: [...current, value] });
  }

  private async removeFromJsonArray(table: string, id: string, field: string, value: string) {
    const record = await this.repository.getById(table, id);
    if (!record) return;

    const current = Array.isArray(record[field]) ? (record[field] as string[]) : [];
    await this.repository.update(table, id, { [field]: current.filter((item) => item !== value) });
  }
}

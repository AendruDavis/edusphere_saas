import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import type { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { adminAuth, adminDb } from "./firebaseAdmin";

const roles = [
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "staff",
  "driver",
  "librarian",
  "nurse",
] as const;

const roleSchema = z.enum(roles);

type UserRole = (typeof roles)[number];

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string | null;
  dept?: string;
  password?: string;
};

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
      appUser?: AppUser;
    }
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    void handler(req, res, next).catch(next);
  };

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const userInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(100).transform((email) => email.toLowerCase()),
  role: roleSchema,
  password: z.string().min(6).max(128).optional(),
  photo: z.string().nullable().optional(),
  dept: z.string().trim().max(100).optional(),
});

const userUpdateSchema = userInputSchema.partial();

const legacyLoginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  pass: z.string().min(1),
  role: roleSchema,
});

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1).max(100),
  amount: z.number().positive(),
  date: z.string().trim().min(1).max(32),
  status: z.string().trim().min(1).max(50).default("completed"),
  studentId: z.string().trim().min(1).max(128).optional(),
  reference: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  currency: z.string().trim().max(12).optional(),
});

const expenseSchema = z.object({
  description: z.string().trim().min(1).max(300),
  amount: z.number().positive(),
  category: z.string().trim().min(1).max(100),
  date: z.string().trim().min(1).max(32),
  paidBy: z.string().trim().min(1).max(100),
});

const attendanceSchema = z.object({
  studentId: z.string().trim().min(1).max(128),
  studentName: z.string().trim().min(1).max(100),
  date: z.string().trim().min(1).max(32),
  status: z.enum(["present", "absent", "late"]),
  role: z.enum(["Student", "Staff"]),
  biometricVerified: z.boolean().optional(),
});

const biometricSchema = z.object({
  fingerprintId: z.string().trim().min(1).max(128),
  deviceId: z.string().trim().min(1).max(128),
  timestamp: z.string().trim().optional(),
});

const gpsSchema = z.object({
  vehicleId: z.string().trim().min(1).max(128),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(240).optional(),
  timestamp: z.string().trim().optional(),
});

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function publicUser(user: AppUser): Omit<AppUser, "password"> {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

async function loadAppUser(uid: string): Promise<AppUser | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

const requireFirebaseAuth = asyncHandler(async (req, _res, next) => {
  const token = getBearerToken(req);
  if (!token) throw new ApiError(401, "Missing Firebase ID token");

  req.firebaseUser = await adminAuth.verifyIdToken(token);
  req.appUser = await loadAppUser(req.firebaseUser.uid);
  next();
});

function hasRole(req: Request, allowedRoles: UserRole[]) {
  if (req.firebaseUser?.email === "mwanjeg039@gmail.com") return true;
  const role = req.appUser?.role;
  return role ? allowedRoles.includes(role) : false;
}

function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!hasRole(req, allowedRoles)) {
      next(new ApiError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

function requireIntegrationSecret(req: Request, _res: Response, next: NextFunction) {
  const expectedSecret = process.env.INTEGRATION_WEBHOOK_SECRET;
  if (!expectedSecret) {
    next(new ApiError(503, "Integration webhook secret is not configured"));
    return;
  }

  if (req.header("x-integration-secret") !== expectedSecret) {
    next(new ApiError(401, "Invalid integration secret"));
    return;
  }

  next();
}

function isAuthUserNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

function isEmailAlreadyExists(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/email-already-exists"
  );
}

async function updateAuthRole(uid: string, role: UserRole) {
  await adminAuth.setCustomUserClaims(uid, { role });
}

async function ensureLegacyAuthUser(docId: string, user: AppUser, password: string) {
  const authPayload = {
    email: user.email,
    displayName: user.name,
    emailVerified: true,
    ...(password.length >= 6 ? { password } : {}),
  };

  try {
    await adminAuth.updateUser(docId, authPayload);
    await updateAuthRole(docId, user.role);
    await adminDb.collection("users").doc(docId).set(
      {
        ...publicUser({ ...user, id: docId }),
        id: docId,
        migratedAt: FieldValue.serverTimestamp(),
        password: FieldValue.delete(),
      },
      { merge: true },
    );
    return docId;
  } catch (error) {
    if (!isAuthUserNotFound(error)) throw error;
  }

  try {
    await adminAuth.createUser({ uid: docId, ...authPayload });
    await updateAuthRole(docId, user.role);
    await adminDb.collection("users").doc(docId).set(
      {
        ...publicUser({ ...user, id: docId }),
        id: docId,
        migratedAt: FieldValue.serverTimestamp(),
        password: FieldValue.delete(),
      },
      { merge: true },
    );
    return docId;
  } catch (error) {
    if (!isEmailAlreadyExists(error)) throw error;
  }

  const existingAuthUser = await adminAuth.getUserByEmail(user.email);
  const existingUid = existingAuthUser.uid;
  await adminAuth.updateUser(existingUid, authPayload);
  await updateAuthRole(existingUid, user.role);
  await adminDb.collection("users").doc(existingUid).set(
    {
      ...publicUser({ ...user, id: existingUid }),
      id: existingUid,
      migratedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  if (existingUid !== docId) {
    await adminDb.collection("users").doc(docId).delete();
  }
  return existingUid;
}

function makeReceiptReference() {
  return `RCPT-${Date.now().toString().slice(-6)}`;
}

async function createTransaction(record: z.infer<typeof transactionSchema>) {
  const payload = cleanUndefined({
    ...record,
    reference: record.reference || (record.type === "income" ? makeReceiptReference() : undefined),
    createdAt: FieldValue.serverTimestamp(),
  });

  if (record.type === "income" && record.studentId) {
    return adminDb.runTransaction(async (tx) => {
      const transactionRef = adminDb.collection("transactions").doc();
      const studentRef = adminDb.collection("students").doc(record.studentId!);
      tx.set(transactionRef, payload);
      tx.update(studentRef, {
        totalFeesPaid: FieldValue.increment(record.amount),
      });
      return { id: transactionRef.id, ...payload };
    });
  }

  const ref = await adminDb.collection("transactions").add(payload);
  return { id: ref.id, ...payload };
}

export function registerBackendRoutes(app: Express, genAI: GoogleGenAI | null) {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post(
    "/api/ai/accounting/analyze",
    requireFirebaseAuth,
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      if (!genAI) {
        throw new ApiError(500, "Gemini API key not configured");
      }

      const body = z
        .object({
          transactions: z.array(z.record(z.string(), z.unknown())).default([]),
          query: z.string().trim().min(1).max(1000),
        })
        .parse(req.body);

      const prompt = `
        You are an expert school accountant AI.
        Context: ${JSON.stringify(body.transactions)}
        Query: ${body.query}
        Analyze the transactions for anomalies, provide financial insights, or detect patterns.
        Provide a concise response in markdown format.
      `;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ analysis: result.text });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const credentials = legacyLoginSchema.parse(req.body);
      const snap = await adminDb
        .collection("users")
        .where("email", "==", credentials.email)
        .where("role", "==", credentials.role)
        .limit(1)
        .get();

      if (snap.empty) {
        throw new ApiError(401, "No account found with this email and role");
      }

      const userDoc = snap.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() } as AppUser;

      if (!user.password || user.password !== credentials.pass) {
        throw new ApiError(401, "Incorrect password for this account");
      }

      const uid = await ensureLegacyAuthUser(userDoc.id, user, credentials.pass);
      const customToken = await adminAuth.createCustomToken(uid, { role: user.role });
      res.json({ customToken });
    }),
  );

  app.post(
    "/api/users",
    requireFirebaseAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = userInputSchema.extend({ password: z.string().min(6).max(128) }).parse(req.body);
      const authUser = await adminAuth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.name,
        emailVerified: true,
      });
      await updateAuthRole(authUser.uid, input.role);

      const user = cleanUndefined({
        id: authUser.uid,
        name: input.name,
        email: input.email,
        role: input.role,
        photo: input.photo,
        dept: input.dept,
        createdAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection("users").doc(authUser.uid).set(user);
      res.status(201).json(user);
    }),
  );

  app.patch(
    "/api/users/:id",
    requireFirebaseAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = userUpdateSchema.parse(req.body);
      const userId = z.string().min(1).max(128).parse(req.params.id);

      const authUpdate = cleanUndefined({
        email: input.email,
        password: input.password,
        displayName: input.name,
        emailVerified: input.email ? true : undefined,
      });

      if (Object.keys(authUpdate).length > 0) {
        await adminAuth.updateUser(userId, authUpdate);
      }
      if (input.role) {
        await updateAuthRole(userId, input.role);
      }

      const firestoreUpdate = cleanUndefined({
        name: input.name,
        email: input.email,
        role: input.role,
        photo: input.photo,
        dept: input.dept,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection("users").doc(userId).set(firestoreUpdate, { merge: true });
      const updated = await loadAppUser(userId);
      res.json(updated ? publicUser(updated) : { id: userId, ...firestoreUpdate });
    }),
  );

  app.delete(
    "/api/users/:id",
    requireFirebaseAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const userId = z.string().min(1).max(128).parse(req.params.id);

      try {
        await adminAuth.deleteUser(userId);
      } catch (error) {
        if (!isAuthUserNotFound(error)) throw error;
      }

      await adminDb.collection("users").doc(userId).delete();
      res.json({ success: true });
    }),
  );

  app.post(
    "/api/transactions",
    requireFirebaseAuth,
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      const transaction = transactionSchema.parse(req.body);
      const created = await createTransaction(transaction);
      res.status(201).json(created);
    }),
  );

  app.post(
    "/api/expenses",
    requireFirebaseAuth,
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      const expense = expenseSchema.parse(req.body);
      const result = await adminDb.runTransaction(async (tx) => {
        const expenseRef = adminDb.collection("expenses").doc();
        const transactionRef = adminDb.collection("transactions").doc();
        const expensePayload = {
          ...expense,
          createdAt: FieldValue.serverTimestamp(),
        };

        tx.set(expenseRef, expensePayload);
        tx.set(transactionRef, {
          type: "expense",
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          status: "completed",
          description: expense.description,
          createdAt: FieldValue.serverTimestamp(),
        });

        return { id: expenseRef.id, ...expensePayload };
      });

      res.status(201).json(result);
    }),
  );

  app.post(
    "/api/attendance",
    requireFirebaseAuth,
    requireRole("admin", "teacher", "nurse"),
    asyncHandler(async (req, res) => {
      const attendance = attendanceSchema.parse(req.body);
      const ref = await adminDb.collection("attendance").add({
        ...attendance,
        createdAt: FieldValue.serverTimestamp(),
      });
      res.status(201).json({ id: ref.id, ...attendance });
    }),
  );

  app.post(
    "/api/integrations/biometrics/check-in",
    requireIntegrationSecret,
    asyncHandler(async (req, res) => {
      const input = biometricSchema.parse(req.body);
      const studentSnap = await adminDb
        .collection("students")
        .where("fingerprintId", "==", input.fingerprintId)
        .limit(1)
        .get();

      if (studentSnap.empty) {
        throw new ApiError(404, "No student found for fingerprint");
      }

      const studentDoc = studentSnap.docs[0];
      const student = studentDoc.data();
      const date = (input.timestamp ? new Date(input.timestamp) : new Date()).toISOString().split("T")[0];
      const ref = await adminDb.collection("attendance").add({
        studentId: studentDoc.id,
        studentName: student.name || "Unknown",
        date,
        status: "present",
        role: "Student",
        biometricVerified: true,
        deviceId: input.deviceId,
        createdAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json({ success: true, id: ref.id });
    }),
  );

  app.post(
    "/api/integrations/gps/update-location",
    requireIntegrationSecret,
    asyncHandler(async (req, res) => {
      const input = gpsSchema.parse(req.body);
      const timestamp = input.timestamp || new Date().toISOString();
      await adminDb.collection("vehicles").doc(input.vehicleId).set(
        {
          lastLocation: {
            lat: input.lat,
            lng: input.lng,
            speed: input.speed,
            lastUpdate: timestamp,
          },
        },
        { merge: true },
      );
      res.json({ success: true, message: "Location updated" });
    }),
  );

  app.get(
    "/api/transport/bus-locations",
    requireFirebaseAuth,
    asyncHandler(async (_req, res) => {
      const snap = await adminDb.collection("vehicles").get();
      const locations = snap.docs
        .map((doc) => {
          const vehicle = doc.data();
          const location = vehicle.lastLocation;
          if (!location) return null;
          return {
            id: doc.id,
            lat: location.lat,
            lng: location.lng,
            speed: location.speed,
            status: vehicle.status,
            label: `${vehicle.plateNumber || "Bus"} - ${vehicle.driverName || "Unassigned"}`,
            lastUpdate: location.lastUpdate,
          };
        })
        .filter(Boolean);

      res.json(locations);
    }),
  );

  app.use("/api", (_req, _res, next) => {
    next(new ApiError(404, "API route not found"));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request payload", details: error.flatten() });
      return;
    }

    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  });
}

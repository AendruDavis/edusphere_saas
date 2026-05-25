import { readFileSync } from "fs";
import path from "path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseAppletConfig = {
  projectId: string;
  storageBucket?: string;
  firestoreDatabaseId?: string;
};

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(readFileSync(configPath, "utf8")) as FirebaseAppletConfig;

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket;
export const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "(default)";

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const credential =
  process.env.FIREBASE_CLIENT_EMAIL && privateKey
    ? cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      })
    : applicationDefault();

const adminApp =
  getApps()[0] ||
  initializeApp({
    credential,
    projectId,
    storageBucket,
  });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp, firestoreDatabaseId);

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { registerBackendRoutes } from "./server/routes";

dotenv.config();

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    })
  : null;

async function startServer() {
  const projectRoot = fs.realpathSync(process.cwd());
  if (process.cwd() !== projectRoot) process.chdir(projectRoot);

  const app = express();
  const port = Number(process.env.PORT || 3000);
  const uploadsPath = path.join(projectRoot, "public", "uploads");

  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      );
    }
    next();
  });
  app.use(express.json({ limit: "6mb" }));
  app.use("/uploads", express.static(uploadsPath, { etag: true, maxAge: "1d" }));
  registerBackendRoutes(app, genAI);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configLoader: "runner",
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const staticPath = path.join(projectRoot, process.env.STATIC_DIR || "build", "client");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

void startServer();

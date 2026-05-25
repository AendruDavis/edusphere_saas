import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Accounting Endpoint
  app.post("/api/ai/accounting/analyze", async (req, res) => {
    if (!genAI) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
      const { transactions, query } = req.body;
      
      const prompt = `
        You are an expert school accountant AI. 
        Context: ${JSON.stringify(transactions)}
        Query: ${query}
        Analyze the transactions for anomalies, provide financial insights, or detect patterns.
        Provide a concise response in markdown format.
      `;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      res.json({ analysis: result.text });
    } catch (error) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ error: "Failed to analyze data" });
    }
  });

  // Biometric Check-in API (Integration Placeholder)
  app.post("/api/integrations/biometrics/check-in", async (req, res) => {
    try {
      const { fingerprintId, deviceId, timestamp } = req.body;
      console.log(`[BIOMETRIC] Check-in received: User ${fingerprintId} from device ${deviceId} at ${timestamp}`);
      // In a real scenario, this would look up the student based on fingerprintId and create an attendance record
      res.json({ success: true, message: "Attendance logged via biometric integration" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process biometric data" });
    }
  });

  // GPS Tracking API (Integration Placeholder)
  app.post("/api/integrations/gps/update-location", async (req, res) => {
    try {
      const { vehicleId, lat, lng, speed, timestamp } = req.body;
      console.log(`[GPS] Vehicle ${vehicleId} update: (${lat}, ${lng}) at speed ${speed}km/h`);
      // In a real scenario, this would update the vehicle's lastLocation field in Firestore
      res.json({ success: true, message: "Location updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update GPS location" });
    }
  });

  // Get current bus locations for the map
  app.get("/api/transport/bus-locations", (req, res) => {
    // Mock data for current bus positions
    res.json([
      { id: "bus-01", lat: -1.2921, lng: 36.8219, status: "moving", label: "Bus A - Route North" },
      { id: "bus-02", lat: -1.3031, lng: 36.8019, status: "stopped", label: "Bus B - Route South" }
    ]);
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

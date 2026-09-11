import express from "express";
import type { AddressInfo } from "node:net";
import { registerBackendRoutes } from "../routes";
import { getUploadRoot } from "../infrastructure/storageService";

export async function startTestApi() {
  const app = express();
  app.use(express.json({limit:"6mb"}));
  app.use("/uploads", express.static(getUploadRoot()));
  registerBackendRoutes(app, null);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { baseURL, async close() {
    server.closeAllConnections();
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  } };
}

export async function api(baseURL: string, path: string, options: {token?: string; schoolId?: string; method?: string; body?: unknown; headers?: Record<string,string>} = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    method: options.method || "GET", signal: AbortSignal.timeout(10000),
    headers: { "Content-Type":"application/json", ...(options.token?{Authorization:`Bearer ${options.token}`} : {}),
      ...(options.schoolId?{"X-School-Id":options.schoolId}:{}), ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = response.status === 304 ? null : await response.json();
  return {status:response.status, headers:response.headers, body};
}

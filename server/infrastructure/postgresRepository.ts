import { AppError } from "../domain/errors";
import { getSupabaseAdminClient } from "./supabaseClient";

export type RecordData = Record<string, unknown>;

function cleanUndefined<T extends RecordData>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function throwIfError(error: unknown) {
  if (!error) return;
  const message = typeof error === "object" && error !== null && "message" in error
    ? String((error as { message: unknown }).message)
    : "Database operation failed";
  throw new AppError(500, message, error);
}

export class PostgresRepository {
  async list(table: string) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.from(table).select("*");
    throwIfError(error);
    return data ?? [];
  }

  async getById(table: string, id: string) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
    throwIfError(error);
    return data;
  }

  async create<T extends RecordData>(table: string, payload: T) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.from(table).insert(cleanUndefined(payload)).select("*").single();
    throwIfError(error);
    return data;
  }

  async update<T extends RecordData>(table: string, id: string, payload: T) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from(table)
      .update(cleanUndefined({ ...payload, updatedAt: new Date().toISOString() }))
      .eq("id", id)
      .select("*")
      .single();
    throwIfError(error);
    return data;
  }

  async delete(table: string, id: string) {
    const client = getSupabaseAdminClient();
    const { error } = await client.from(table).delete().eq("id", id);
    throwIfError(error);
    return { success: true };
  }

  async upsertSettings(payload: RecordData) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from("school_settings")
      .upsert({ id: true, ...cleanUndefined(payload), updatedAt: new Date().toISOString() }, { onConflict: "id" })
      .select("*")
      .single();
    throwIfError(error);
    return data;
  }

  async getSettings() {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.from("school_settings").select("*").eq("id", true).maybeSingle();
    throwIfError(error);
    return data;
  }

  async call<T = unknown>(functionName: string, args: RecordData) {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.rpc(functionName, args);
    throwIfError(error);
    return data as T;
  }
}

import "server-only";
import { eq } from "drizzle-orm";
import type { UserSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { db, dbReady } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import type { SettingsService } from "../types";

/** Fields that live on the `users` row, not in the settings JSON blob. */
const IDENTITY_KEYS = ["displayName", "email", "memberSince"] as const;

async function readSettings(): Promise<UserSettings> {
  await dbReady;
  const user = await requireUser();

  const row = await db
    .select({ data: userSettings.data })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .get();

  return {
    ...DEFAULT_SETTINGS,
    ...(row?.data ?? {}),
    displayName: user.displayName,
    email: user.email,
    memberSince: user.createdAt,
  };
}

export function createDbSettingsService(): SettingsService {
  return {
    get: readSettings,

    async update(patch: Partial<UserSettings>): Promise<UserSettings> {
      await dbReady;
      const user = await requireUser();

      if (typeof patch.displayName === "string" && patch.displayName.trim()) {
        await db
          .update(users)
          .set({ displayName: patch.displayName.trim() })
          .where(eq(users.id, user.id));
      }

      const prefPatch: Partial<UserSettings> = { ...patch };
      for (const key of IDENTITY_KEYS) delete prefPatch[key];

      if (Object.keys(prefPatch).length) {
        const row = await db
          .select({ data: userSettings.data })
          .from(userSettings)
          .where(eq(userSettings.userId, user.id))
          .get();
        const merged = { ...(row?.data ?? {}), ...prefPatch };
        await db
          .insert(userSettings)
          .values({ userId: user.id, data: merged })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: { data: merged },
          });
      }

      return readSettings();
    },
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { savedDoctors } from "@/db/schema";
import { requireUser } from "@/server/auth/session";

export async function toggleSavedDoctor(doctorId: string) {
  const user = await requireUser();
  const db = await getDb();
  const [existing] = await db.select().from(savedDoctors).where(and(eq(savedDoctors.userId, user.id), eq(savedDoctors.doctorId, doctorId)));
  if (existing) await db.delete(savedDoctors).where(and(eq(savedDoctors.userId, user.id), eq(savedDoctors.doctorId, doctorId)));
  else await db.insert(savedDoctors).values({ userId: user.id, doctorId });
  revalidatePath("/saved");
  return !existing;
}

// Shared pure helpers used across server action modules.
// This file has NO 'use server' directive — it only exports plain functions.
// IMPORTANT: Keep this file free of DB/ORM imports so it can be tested without DATABASE_URL.

export function numVal(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

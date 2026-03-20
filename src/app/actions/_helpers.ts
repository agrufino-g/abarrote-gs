// Shared pure helpers used across server action modules.
// This file has NO 'use server' directive — it only exports plain functions.

export function numVal(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

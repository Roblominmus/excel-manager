/**
 * DEPRECATED: Firebase configuration
 * 
 * ⛔ This file is no longer used. The project has been migrated to Supabase.
 * 
 * Use `/lib/supabase/client.ts` instead for all backend services:
 * - Authentication
 * - Database (PostgreSQL)
 * - Storage
 * 
 * @deprecated Use Supabase instead
 * @see /lib/supabase/client.ts
 * @see ../README.md
 */

export function throwDeprecatedError() {
  throw new Error(
    'Firebase has been deprecated. Use Supabase instead. See /lib/supabase/client.ts'
  );
}


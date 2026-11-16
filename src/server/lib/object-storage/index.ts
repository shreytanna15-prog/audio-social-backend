/**
 * Default: Supabase (tracks, covers, chat audio).
 * R2 impl ready at `./r2-object-storage` — flip only after migration cutover.
 */
export { objectStorage } from "./supabase-object-storage";

export type { ObjectStorage, SignedUpload } from "./types";

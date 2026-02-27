import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function uploadCover(
  file: File,
  userId: string,
  novelId: string
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error("File too large (max 2MB)");

  const ext = file.name.split(".").pop();
  const path = `covers/${userId}/${novelId}.${ext}`;

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from("novel-assets")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("novel-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error("File too large (max 2MB)");

  const path = `avatars/${userId}.webp`;
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from("novel-assets")
    .upload(path, file, { upsert: true });

  if (error) throw error;
  const { data } = supabase.storage.from("novel-assets").getPublicUrl(path);
  return data.publicUrl;
}

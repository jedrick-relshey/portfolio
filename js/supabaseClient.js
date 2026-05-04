const SUPABASE_URL = "https://znrdcnhlruryvsrqoszw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucmRjbmhscnVyeXZzcnFvc3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzAyODQsImV4cCI6MjA5MjgwNjI4NH0.G8-WnYoqClzTSEDKIDTfWSkJVNX5lhCe69yWj8dZPjA";
const PROJECTS_TABLE = "projects";
const PROJECT_IMAGES_BUCKET = "project-images";
const SUPABASE_URL_PLACEHOLDER = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY_PLACEHOLDER = "YOUR_SUPABASE_ANON_KEY";

const isSupabaseConfigured =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL !== SUPABASE_URL_PLACEHOLDER &&
  SUPABASE_ANON_KEY !== SUPABASE_ANON_KEY_PLACEHOLDER;

const supabaseClient =
  isSupabaseConfigured && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

function createFriendlyErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  return error.message || fallbackMessage;
}

function ensureSupabaseReady() {
  if (supabaseClient) {
    return { ok: true };
  }

  return {
    ok: false,
    message:
      "Supabase is not configured yet. Add your Supabase URL and anon key in supabaseClient.js first.",
  };
}

async function fetchProjects() {
  const ready = ensureSupabaseReady();

  if (!ready.ok) {
    return { data: [], error: new Error(ready.message) };
  }

  const { data, error } = await supabaseClient
    .from(PROJECTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
}

async function uploadProjectImage(file) {
  const ready = ensureSupabaseReady();

  if (!ready.ok) {
    return { data: null, error: new Error(ready.message) };
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFileName(file.name)}`;
  const filePath = `thumbnails/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(PROJECT_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data } = supabaseClient.storage
    .from(PROJECT_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return {
    data: {
      filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

async function createProject(project) {
  const ready = ensureSupabaseReady();

  if (!ready.ok) {
    return { data: null, error: new Error(ready.message) };
  }

  const { data, error } = await supabaseClient
    .from(PROJECTS_TABLE)
    .insert([project])
    .select()
    .single();

  return { data, error };
}

function getStoragePathFromPublicUrl(imageUrl) {
  if (!imageUrl || !isSupabaseConfigured) {
    return null;
  }

  const bucketMarker = `/storage/v1/object/public/${PROJECT_IMAGES_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(bucketMarker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(imageUrl.slice(markerIndex + bucketMarker.length));
}

async function removeImageFromStorage(imageUrl) {
  const ready = ensureSupabaseReady();

  if (!ready.ok) {
    return { error: new Error(ready.message) };
  }

  const filePath = getStoragePathFromPublicUrl(imageUrl);

  if (!filePath) {
    return { error: null };
  }

  const { error } = await supabaseClient.storage
    .from(PROJECT_IMAGES_BUCKET)
    .remove([filePath]);

  return { error };
}

async function deleteProjectById(projectId) {
  const ready = ensureSupabaseReady();

  if (!ready.ok) {
    return { error: new Error(ready.message) };
  }

  const { error } = await supabaseClient
    .from(PROJECTS_TABLE)
    .delete()
    .eq("id", projectId);

  return { error };
}

window.supabaseHelpers = {
  PROJECT_IMAGES_BUCKET,
  PROJECTS_TABLE,
  createFriendlyErrorMessage,
  ensureSupabaseReady,
  fetchProjects,
  uploadProjectImage,
  createProject,
  deleteProjectById,
  removeImageFromStorage,
  getStoragePathFromPublicUrl,
};

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "cantina-termos";

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const getBearerToken = (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

const getUserFromToken = async (supabase, token) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
};

const isAdmin = async (supabase, userId) => {
  // Service role bypasses RLS; we still enforce admin role explicitly.
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.role) return false;
  return data.role === "admin";
};

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { message: "Metodo nao permitido." });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { message: "Supabase nao configurado." });
  }

  const token = getBearerToken(event);
  if (!token) {
    return jsonResponse(401, { message: "Token ausente." });
  }

  const authorizationId = event.queryStringParameters?.authorization_id;
  if (!authorizationId) {
    return jsonResponse(400, { message: "authorization_id obrigatorio." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const user = await getUserFromToken(supabase, token);
  if (!user) {
    return jsonResponse(401, { message: "Token invalido." });
  }

  const admin = await isAdmin(supabase, user.id);
  if (!admin) {
    return jsonResponse(403, { message: "Acesso negado." });
  }

  const { data: documentData, error: documentError } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path")
    .eq("authorization_id", authorizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (documentError) {
    console.error("Document lookup error", documentError);
    return jsonResponse(500, { message: "Erro ao localizar documento." });
  }

  if (!documentData) {
    return jsonResponse(404, { message: "Documento nao encontrado." });
  }

  const bucket = documentData.storage_bucket || SUPABASE_BUCKET;
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(documentData.storage_path, 60 * 60 * 24 * 7);

  if (signedError) {
    console.error("Signed URL error", signedError);
    return jsonResponse(500, { message: "Erro ao gerar link do PDF." });
  }

  return jsonResponse(200, { signed_url: signedData?.signedUrl });
};

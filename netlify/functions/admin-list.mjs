import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const queryText = event.queryStringParameters?.q?.trim();

  let query = supabase
    .from("authorizations")
    .select(
      `
        id,
        accepted_at,
        status,
        term_version,
        term_hash_sha256,
        term_text,
        accepted_ip,
        accepted_user_agent,
        guardian:guardians!inner (
          full_name,
          cpf
        ),
        student:students!inner (
          full_name,
          class_room,
          period
        )
      `,
      { count: "exact" }
    )
    .order("accepted_at", { ascending: false })
    .range(0, 199);

  if (queryText) {
    const likeValue = `%${queryText}%`;
    const cpfDigits = queryText.replace(/\D/g, "");
    const cpfLike = cpfDigits ? `%${cpfDigits}%` : likeValue;
    const orFilter = `guardians.full_name.ilike.${likeValue},students.full_name.ilike.${likeValue},guardians.cpf.ilike.${cpfLike}`;
    query = query.or(orFilter);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Admin list error", error);
    return jsonResponse(500, { message: "Erro ao buscar autorizacoes." });
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    accepted_at: row.accepted_at,
    status: row.status,
    term_version: row.term_version,
    term_hash_sha256: row.term_hash_sha256,
    term_text: row.term_text,
    accepted_ip: row.accepted_ip,
    accepted_user_agent: row.accepted_user_agent,
    guardian: row.guardian || {},
    student: row.student || {},
  }));

  return jsonResponse(200, {
    items,
    total: count ?? items.length,
  });
};

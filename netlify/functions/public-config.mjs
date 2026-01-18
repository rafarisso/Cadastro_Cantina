const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const handler = async () => {
  if (!SUPABASE_URL) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Configure SUPABASE_URL no Netlify.",
    };
  }

  if (!SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Configure SUPABASE_ANON_KEY no Netlify.",
    };
  }

  const body = `window.__SUPABASE_CONFIG__ = ${JSON.stringify({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  })};`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
    body,
  };
};

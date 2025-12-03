import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;

const sb = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: false },
});

// LOGIN helpers
async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return null;
  return data?.session?.access_token || null;
}

async function clientAuth() {
  return await login("client_test@evatime.fr", "evatime123");
}

async function adminAuth() {
  return await login("admin_test@evatime.fr", "evatime123");
}

async function run() {
  console.log("🔍 EVATIME – Test complet…");

  // 1️⃣ TESTS ANONYMES
  console.log("— Tests Anonymes —");

  const { error: errInsert } = await sb
    .from("prospects")
    .insert({
      email: "test_inscription_auto@evatime.fr",
      name: "Test Auto",
      owner_id: "82be903d-9600-4c53-9cd4-113bfaaac12e"
    });

  if (errInsert) {
    console.error("❌ Anonyme : INSERT cassé");
    process.exit(1);
  }
  console.log("🟢 Anonyme INSERT OK");

  const { error: errSelectAnon } = await sb
    .from("prospects")
    .select("*")
    .limit(1);

  if (!errSelectAnon) {
    console.error("❌ Anonyme : SELECT autorisé (fail RLS)");
    process.exit(1);
  }
  console.log("🟢 Anonyme SELECT bloqué (OK)");

  const { error: errUpdateAnon } = await sb
    .from("prospects")
    .update({ name: "Hack" })
    .eq("email", "test_inscription_auto@evatime.fr");

  if (!errUpdateAnon) {
    console.error("❌ Anonyme : UPDATE autorisé (fail RLS)");
    process.exit(1);
  }
  console.log("🟢 Anonyme UPDATE bloqué (OK)");

  // 2️⃣ TESTS CLIENT CONNECTÉ
  console.log("— Tests Client Connecté —");

  const clientToken = await clientAuth();
  if (!clientToken) {
    console.error("❌ Impossible de connecter le client test");
    process.exit(1);
  }

  const sbClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${clientToken}` } },
  });

  const { error: clientSelectError } = await sbClient
    .from("prospects")
    .select("*")
    .limit(1);

  if (clientSelectError) {
    console.error("❌ Client : SELECT own fail");
    process.exit(1);
  }
  console.log("🟢 Client SELECT OK");

  const { error: clientUpdErr } = await sbClient
    .from("prospects")
    .update({ phone: "0707070707" })
    .limit(1);

  if (clientUpdErr) {
    console.error("❌ Client : UPDATE own fail");
    process.exit(1);
  }
  console.log("🟢 Client UPDATE OK");

  // 3️⃣ TESTS ADMIN
  console.log("— Tests Admin —");

  const adminToken = await adminAuth();
  if (!adminToken) {
    console.error("❌ Impossible de connecter l'admin test");
    process.exit(1);
  }

  const sbAdmin = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${adminToken}` } },
  });

  const { error: adminSelectError } = await sbAdmin
    .from("prospects")
    .select("*")
    .limit(1);

  if (adminSelectError) {
    console.error("❌ Admin : SELECT fail");
    process.exit(1);
  }
  console.log("🟢 Admin SELECT OK");

  const { error: adminUpdateError } = await sbAdmin
    .from("prospects")
    .update({ status: "checked" })
    .limit(1);

  if (adminUpdateError) {
    console.error("❌ Admin : UPDATE fail");
    process.exit(1);
  }
  console.log("🟢 Admin UPDATE OK");

  console.log("✅ EVATIME CHECK COMPLET OK");
  process.exit(0);
}

run();

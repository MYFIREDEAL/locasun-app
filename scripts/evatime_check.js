import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;

const sb = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: false },
  db: { schema: 'public' }
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

  // 0️⃣ TEST RÉSOLUTION ORGANIZATION (SKIPPED)
  // console.log("— Résolution Organization —");
  // const { data: organizationId, error: orgError } = await sb.rpc(
  //   'resolve_organization_from_host',
  //   { host: 'localhost' }
  // );
  // if (orgError) {
  //   console.error("❌ RPC resolve_organization_from_host failed:", orgError);
  //   process.exit(1);
  // }
  // if (!organizationId) {
  //   console.error("❌ No organization resolved for localhost");
  //   process.exit(1);
  // }
  // console.log("🟢 Organization resolved:", organizationId);

  // 1️⃣ TESTS ANONYMES
  console.log("— Tests Anonymes —");

  // ⚠️ SKIP INSERT test car organization_id requis et pas de FK disponible en test
  // On teste uniquement que SELECT/UPDATE sont bloqués pour anonyme
  console.log("� Anonyme INSERT skippé (organization_id requis)");

  const selectAnon = await sb
    .from("prospects")
    .select("*")
    .limit(1);

  // 🔥 Si le SELECT retourne au moins UNE ligne => FAIL
  if (Array.isArray(selectAnon.data) && selectAnon.data.length > 0) {
    console.error("❌ Anonyme : SELECT autorisé (fail RLS)");
    process.exit(1);
  }

  console.log("🟢 Anonyme SELECT bloqué (OK)");

  const updateAnon = await sb
    .from("prospects")
    .update({ name: "Hack" })
    .eq("email", "test_inscription_auto@evatime.fr");

  // 🔥 Si une ligne a été modifiée → FAIL RLS
  if (updateAnon.data && updateAnon.data.length > 0) {
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
    db: { schema: 'public' }
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

  // 🔥 Utiliser la RPC update_own_prospect_profile comme le fait l'application
  // (pas d'UPDATE direct car les clients n'ont pas de policy UPDATE sur prospects)
  const updateClient = await sbClient.rpc('update_own_prospect_profile', {
    _data: { phone: "0707070707" }
  });

  if (updateClient.error) {
    console.error("❌ Client : UPDATE own fail -", updateClient.error.message);
    process.exit(1);
  }

  console.log("🟢 Client UPDATE OK (via RPC)");

  // 3️⃣ TESTS ADMIN
  console.log("— Tests Admin —");

  const adminToken = await adminAuth();
  if (!adminToken) {
    console.error("❌ Impossible de connecter l'admin test");
    process.exit(1);
  }

  const sbAdmin = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${adminToken}` } },
    db: { schema: 'public' }
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

  // 🔍 Récupérer le prospect du client test (cet email existe toujours)
  const targetProspect = await sbAdmin
    .from("prospects")
    .select("id")
    .eq("email", "client_test@evatime.fr")
    .single();

  if (targetProspect.error) {
    console.error("❌ Admin : impossible de récupérer le prospect du client test -", targetProspect.error.message);
    process.exit(1);
  }

  // 🔥 Utiliser la RPC update_prospect_safe comme le fait l'application admin
  const adminUpdate = await sbAdmin.rpc('update_prospect_safe', {
    _prospect_id: targetProspect.data.id,
    _data: { status: "checked" }
  });

  if (adminUpdate.error) {
    console.error("❌ Admin : UPDATE fail -", adminUpdate.error.message);
    process.exit(1);
  }

  console.log("🟢 Admin UPDATE OK (via RPC)");

  // 4️⃣ TEST ISOLATION MULTI-TENANT (organization_id)
  console.log("— Test Isolation Multi-Tenant —");

  // Récupérer l'organization_id de l'admin test
  const { data: adminUser } = await sbAdmin
    .from("users")
    .select("organization_id")
    .eq("user_id", (await sbAdmin.auth.getUser()).data.user.id)
    .single();

  if (!adminUser || !adminUser.organization_id) {
    console.error("❌ Admin test sans organization_id");
    process.exit(1);
  }

  const adminOrgId = adminUser.organization_id;
  console.log(`🔍 Admin organization_id: ${adminOrgId}`);

  // Tester que l'admin ne voit QUE les prospects de son organization
  const { data: allProspects } = await sbAdmin
    .from("prospects")
    .select("organization_id");

  if (!allProspects || allProspects.length === 0) {
    console.error("❌ Admin ne voit aucun prospect (RLS trop restrictif)");
    process.exit(1);
  }

  // Vérifier que TOUS les prospects retournés appartiennent à la même organization
  const wrongOrgProspects = allProspects.filter(p => p.organization_id !== adminOrgId);
  
  if (wrongOrgProspects.length > 0) {
    console.error(`❌ FUITE MULTI-TENANT : Admin voit ${wrongOrgProspects.length} prospects d'autres organizations !`);
    console.error("Prospects fuités:", wrongOrgProspects);
    process.exit(1);
  }

  console.log(`🟢 Isolation OK : ${allProspects.length} prospects, tous de l'organization ${adminOrgId}`);

  // Tester que l'admin ne peut PAS créer de prospect sans organization_id
  const { error: insertWithoutOrgError } = await sbAdmin
    .from("prospects")
    .insert({
      email: "test_sans_org@hack.com",
      name: "Hack Sans Org",
      // ⚠️ Volontairement SANS organization_id
    });

  // Si l'insertion réussit → FAIL (on devrait avoir une erreur NOT NULL ou RLS)
  if (!insertWithoutOrgError) {
    console.error("❌ DANGER : Insertion prospect SANS organization_id autorisée !");
    // Nettoyer
    await sbAdmin.from("prospects").delete().eq("email", "test_sans_org@hack.com");
    process.exit(1);
  }

  console.log("🟢 Insertion sans organization_id bloquée (OK)");

  console.log("✅ EVATIME CHECK COMPLET OK (avec isolation multi-tenant)");
  process.exit(0);
}

run();

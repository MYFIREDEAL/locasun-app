# 🚀 WEBHOOK V1 — VERSION FINALE CONSOLIDÉE

> Généré le 2 mars 2026 — Prêt à copier-coller et déployer.

---

## 1️⃣ SQL COMPLET — integration_keys

```sql
-- ============================================================================
-- TABLE: integration_keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  permissions TEXT[] NOT NULL DEFAULT '{webhook:create_prospect}',
  created_by UUID REFERENCES public.users(user_id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_keys_org_id ON public.integration_keys(organization_id);

ALTER TABLE public.integration_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_keys_select_own_org" ON public.integration_keys
  FOR SELECT
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u WHERE u.user_id = auth.uid()
    )
  );

CREATE POLICY "integration_keys_insert_global_admin" ON public.integration_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id FROM public.users u
      WHERE u.user_id = auth.uid() AND u.role = 'Global Admin'
    )
  );

CREATE POLICY "integration_keys_update_global_admin" ON public.integration_keys
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u
      WHERE u.user_id = auth.uid() AND u.role = 'Global Admin'
    )
  );

CREATE POLICY "integration_keys_delete_global_admin" ON public.integration_keys
  FOR DELETE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u
      WHERE u.user_id = auth.uid() AND u.role = 'Global Admin'
    )
  );
```

---

## 2️⃣ SQL COMPLET — create_affiliated_prospect (corrigé)

```sql
-- ============================================================================
-- RPC: create_affiliated_prospect
-- ============================================================================

create or replace function create_affiliated_prospect(
  p_name text,
  p_email text,
  p_phone text default null,
  p_company text default null,
  p_address text default '',
  p_affiliate_slug text default null,
  p_tags text[] default '{}',
  p_status text default null,
  p_host text default 'evatime.fr'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_owner_id uuid;
  v_prospect_id uuid;
  v_first_step_id text;
  v_affiliate_name text;
  v_organization_id uuid;
begin
  v_organization_id := resolve_organization_from_host(p_host);

  if v_organization_id is null then
    raise exception 'Organization non trouvée pour le domaine: %', p_host;
  end if;

  if p_affiliate_slug is not null then
    select u.user_id, u.name into v_owner_id, v_affiliate_name
    from public.users u
    where u.affiliate_slug = p_affiliate_slug
      and u.organization_id = v_organization_id;
  end if;

  if v_owner_id is null then
    select u.user_id, u.name into v_owner_id, v_affiliate_name
    from public.users u
    where u.organization_id = v_organization_id
      and u.role = 'Global Admin'
    order by u.created_at asc
    limit 1;

    if v_owner_id is null then
      raise exception 'Aucun Global Admin trouvé pour l''organisation %', v_organization_id;
    end if;
  end if;

  if p_status is null then
    -- 1) Chercher un pipeline step pour CETTE org
    select id into v_first_step_id
    from public.global_pipeline_steps
    where organization_id = v_organization_id
    order by created_at asc
    limit 1;

    -- 2) Fallback global (organization_id IS NULL)
    if v_first_step_id is null then
      select id into v_first_step_id
      from public.global_pipeline_steps
      where organization_id is null
      order by created_at asc
      limit 1;
    end if;

    -- 3) Strict : jamais de statut fictif
    if v_first_step_id is null then
      raise exception 'Aucun pipeline step configuré pour l''organisation %', v_organization_id;
    end if;
  else
    v_first_step_id := p_status;
  end if;

  insert into public.prospects(
    name,
    email,
    phone,
    company_name,
    address,
    owner_id,
    status,
    tags,
    has_appointment,
    affiliate_name,
    organization_id,
    created_at,
    updated_at
  ) values (
    p_name,
    p_email,
    p_phone,
    p_company,
    p_address,
    v_owner_id,
    v_first_step_id,
    p_tags,
    false,
    v_affiliate_name,
    v_organization_id,
    now(),
    now()
  )
  returning id into v_prospect_id;

  return v_prospect_id;
end;
$$;

grant execute on function create_affiliated_prospect(text, text, text, text, text, text, text[], text, text) to anon;
grant execute on function create_affiliated_prospect(text, text, text, text, text, text, text[], text, text) to authenticated;
```

---

## 3️⃣ SQL COMPLET — link_prospect_to_auth_user (corrigé)

```sql
-- ============================================================================
-- TRIGGER FUNCTION: link_prospect_to_auth_user
-- ============================================================================

CREATE OR REPLACE FUNCTION link_prospect_to_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_prospect_id uuid;
  v_prospect_count int;
BEGIN
  SELECT count(*) INTO v_prospect_count
  FROM public.prospects
  WHERE email = NEW.email
    AND user_id IS NULL;

  IF v_prospect_count = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_prospect_id
  FROM public.prospects
  WHERE email = NEW.email
    AND user_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.prospects
  SET user_id = NEW.id
  WHERE id = v_prospect_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_auth_user_created ON auth.users;

CREATE TRIGGER after_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION link_prospect_to_auth_user();
```

---

## 4️⃣ SQL COMPLET — create_webhook_prospect

```sql
-- ============================================================================
-- RPC: create_webhook_prospect
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_webhook_prospect(
  p_organization_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_address TEXT DEFAULT '',
  p_tags TEXT[] DEFAULT '{}',
  p_owner_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_send_magic_link BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect_id UUID;
  v_owner_id UUID;
  v_owner_name TEXT;
  v_first_step_id TEXT;
  v_tag TEXT;
  v_template_exists BOOLEAN;
BEGIN
  -- Vérifier doublon email dans cette org
  IF EXISTS (
    SELECT 1 FROM public.prospects
    WHERE email = p_email AND organization_id = p_organization_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DUPLICATE_EMAIL',
      'message', format('Un prospect avec l''email %s existe déjà dans cette organisation', p_email)
    );
  END IF;

  -- Valider les tags contre project_templates
  IF array_length(p_tags, 1) > 0 THEN
    FOREACH v_tag IN ARRAY p_tags LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.project_templates
        WHERE type = v_tag
          AND (organization_id = p_organization_id OR organization_id IS NULL)
      ) INTO v_template_exists;

      IF NOT v_template_exists THEN
        RETURN json_build_object(
          'success', false,
          'error', 'INVALID_PROJECT_TYPE',
          'message', format('Le type de projet "%s" n''existe pas pour cette organisation', v_tag)
        );
      END IF;
    END LOOP;
  END IF;

  -- Résoudre l'owner
  IF p_owner_id IS NOT NULL THEN
    SELECT user_id, name INTO v_owner_id, v_owner_name
    FROM public.users
    WHERE user_id = p_owner_id
      AND organization_id = p_organization_id;

    IF v_owner_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'INVALID_OWNER',
        'message', format('L''owner_id %s n''appartient pas à cette organisation', p_owner_id)
      );
    END IF;
  ELSE
    SELECT user_id, name INTO v_owner_id, v_owner_name
    FROM public.users
    WHERE organization_id = p_organization_id
      AND role = 'Global Admin'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_owner_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'NO_GLOBAL_ADMIN',
        'message', 'Aucun Global Admin trouvé pour cette organisation'
      );
    END IF;
  END IF;

  -- Résoudre le pipeline step — STRICT
  IF p_status IS NULL THEN
    SELECT id INTO v_first_step_id
    FROM public.global_pipeline_steps
    WHERE organization_id = p_organization_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_first_step_id IS NULL THEN
      SELECT id INTO v_first_step_id
      FROM public.global_pipeline_steps
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    IF v_first_step_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'NO_PIPELINE_STEP',
        'message', 'Aucun pipeline step configuré pour cette organisation'
      );
    END IF;
  ELSE
    v_first_step_id := p_status;
  END IF;

  -- Créer le prospect
  INSERT INTO public.prospects(
    name,
    email,
    phone,
    company_name,
    address,
    owner_id,
    status,
    tags,
    has_appointment,
    affiliate_name,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_email,
    p_phone,
    p_company,
    p_address,
    v_owner_id,
    v_first_step_id,
    p_tags,
    false,
    v_owner_name,
    p_organization_id,
    now(),
    now()
  )
  RETURNING id INTO v_prospect_id;

  RETURN json_build_object(
    'success', true,
    'prospect_id', v_prospect_id,
    'owner_id', v_owner_id,
    'owner_name', v_owner_name,
    'organization_id', p_organization_id,
    'tags', p_tags
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_webhook_prospect(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, TEXT, BOOLEAN) TO service_role;
```

---

## 5️⃣ EDGE FUNCTION COMPLÈTE — webhook-v1/index.ts

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Seul POST est accepté' }, 405)
  }

  try {
    // ── ÉTAPE 1: Authentification Bearer token ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({
        success: false,
        error: 'MISSING_AUTH',
        message: 'Header Authorization: Bearer <integration_key> requis'
      }, 401)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token || token.length < 20) {
      return jsonResponse({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token invalide ou trop court'
      }, 401)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const tokenHash = await sha256(token)

    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('integration_keys')
      .select('id, organization_id, permissions, is_active, expires_at, use_count')
      .eq('key_hash', tokenHash)
      .single()

    if (keyError || !keyData) {
      console.error('❌ Token non trouvé:', keyError?.message)
      return jsonResponse({
        success: false,
        error: 'INVALID_KEY',
        message: 'Clé d\'intégration invalide ou inexistante'
      }, 401)
    }

    if (!keyData.is_active) {
      return jsonResponse({
        success: false,
        error: 'KEY_DISABLED',
        message: 'Cette clé d\'intégration a été désactivée'
      }, 403)
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return jsonResponse({
        success: false,
        error: 'KEY_EXPIRED',
        message: 'Cette clé d\'intégration a expiré'
      }, 403)
    }

    const permissions: string[] = keyData.permissions || []
    if (!permissions.includes('webhook:create_prospect')) {
      return jsonResponse({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Cette clé n\'a pas la permission webhook:create_prospect'
      }, 403)
    }

    const organizationId: string = keyData.organization_id
    const integrationKeyId: string = keyData.id

    // ── ÉTAPE 2: Parser et valider le body ──
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({
        success: false,
        error: 'INVALID_JSON',
        message: 'Le body doit être un JSON valide'
      }, 400)
    }

    const contact = (body.contact as Record<string, unknown>) || {}
    const project = (body.project as Record<string, unknown>) || {}

    const name = (contact.nom as string) || (body.nom as string) || (body.name as string)
    const email = (contact.email as string) || (body.email as string)
    const phone = (contact.telephone as string) || (body.telephone as string) || (body.phone as string) || null
    const company = (contact.entreprise as string) || (body.entreprise as string) || (body.company as string) || null
    const address = (contact.adresse as string) || (body.adresse as string) || (body.address as string) || ''

    const typeProjet = (body.type_projet as string) || (project.type as string) || null
    const ownerUserId = (body.owner_user_id as string) || (project.owner_user_id as string) || null
    const ownerEmail = (body.owner_email as string) || (project.owner_email as string) || null
    const sendMagicLink = (body.send_magic_link as boolean) || false

    if (!name || !email) {
      return jsonResponse({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Les champs "nom" (ou "name") et "email" sont obligatoires',
        received_fields: Object.keys(body)
      }, 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return jsonResponse({
        success: false,
        error: 'INVALID_EMAIL',
        message: `L'email "${email}" n'est pas valide`
      }, 400)
    }

    // ── ÉTAPE 3: Résoudre l'owner ──
    let resolvedOwnerId: string | null = null

    if (ownerUserId) {
      resolvedOwnerId = ownerUserId
    } else if (ownerEmail) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('email', ownerEmail)
        .eq('organization_id', organizationId)
        .single()

      if (userData?.user_id) {
        resolvedOwnerId = userData.user_id
      }
    }

    // ── ÉTAPE 4: Construire les tags ──
    const tags: string[] = []
    if (typeProjet) {
      const parts = typeProjet.split(',').map((t: string) => t.trim()).filter(Boolean)
      tags.push(...parts)
    }

    // ── ÉTAPE 5: Appeler la RPC ──
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('create_webhook_prospect', {
      p_organization_id: organizationId,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_company: company,
      p_address: address,
      p_tags: tags,
      p_owner_id: resolvedOwnerId,
      p_status: null,
      p_send_magic_link: sendMagicLink,
    })

    if (rpcError) {
      console.error('❌ RPC error:', rpcError.message)
      return jsonResponse({
        success: false,
        error: 'RPC_ERROR',
        message: rpcError.message
      }, 500)
    }

    const result = rpcResult as Record<string, unknown>

    if (!result.success) {
      const errorMap: Record<string, number> = {
        'DUPLICATE_EMAIL': 409,
        'INVALID_PROJECT_TYPE': 400,
        'INVALID_OWNER': 400,
        'NO_GLOBAL_ADMIN': 500,
        'NO_PIPELINE_STEP': 500,
      }
      const httpStatus = errorMap[result.error as string] || 400

      return jsonResponse({
        success: false,
        error: result.error,
        message: result.message
      }, httpStatus)
    }

    // ── ÉTAPE 6: Magic Link (optionnel) — aligné RegistrationPage.jsx ──
    let magicLinkSent = false

    if (sendMagicLink) {
      const { data: domainData } = await supabaseAdmin
        .from('organization_domains')
        .select('domain')
        .eq('organization_id', organizationId)
        .eq('is_primary', true)
        .single()

      const redirectDomain = domainData?.domain || 'evatime.fr'
      const redirectUrl = `https://${redirectDomain}/dashboard`

      const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        }
      })

      if (magicLinkError) {
        console.warn('⚠️ Magic link échoué:', magicLinkError.message)
      } else {
        magicLinkSent = true
        console.log(`🔗 Magic link envoyé pour ${email} → redirect ${redirectUrl}`)
      }
    }

    // ── ÉTAPE 7: Mettre à jour last_used_at ──
    await supabaseAdmin
      .from('integration_keys')
      .update({
        last_used_at: new Date().toISOString(),
        use_count: ((keyData as any).use_count || 0) + 1,
      })
      .eq('id', integrationKeyId)

    // ── ÉTAPE 8: Retour succès ──
    console.log(`✅ Prospect créé via webhook: ${result.prospect_id} (org: ${organizationId})`)

    return jsonResponse({
      success: true,
      prospect_id: result.prospect_id,
      owner_id: result.owner_id,
      owner_name: result.owner_name,
      organization_id: organizationId,
      tags,
      magic_link_sent: magicLinkSent,
    }, 201)

  } catch (err) {
    console.error('❌ Erreur inattendue webhook-v1:', err)
    return jsonResponse({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur'
    }, 500)
  }
})
```

---

## 6️⃣ CHECKLIST DÉPLOIEMENT

### Ordre exact d'exécution

**Étape 1 — SQL dans Supabase SQL Editor (dans cet ordre)**

```
1. Copier-coller le SQL "integration_keys" (section 1) → Exécuter
2. Copier-coller le SQL "create_affiliated_prospect" (section 2) → Exécuter
3. Copier-coller le SQL "link_prospect_to_auth_user" (section 3) → Exécuter
4. Copier-coller le SQL "create_webhook_prospect" (section 4) → Exécuter
```

**Étape 2 — Déployer la Edge Function**

```bash
supabase functions deploy webhook-v1
```

**Étape 3 — Créer une clé d'intégration test**

```sql
-- Générer un token côté client : eva_test_XXXXXXXXXXXXXXXX
-- Hasher avec SHA-256 et insérer :
INSERT INTO public.integration_keys (
  organization_id,
  key_hash,
  key_prefix,
  label,
  permissions,
  created_by
) VALUES (
  '<VOTRE_ORG_ID>',
  '<SHA256_DU_TOKEN>',
  'eva_test_',
  'Test Webhook',
  '{webhook:create_prospect}',
  '<VOTRE_USER_ID>'
);
```

**Étape 4 — Test curl**

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/webhook-v1 \
  -H "Authorization: Bearer eva_test_XXXXXXXXXXXXXXXX" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{
    "nom": "Test Webhook",
    "email": "test-webhook@example.com",
    "type_projet": "Centrale"
  }'
```

Réponse attendue (201) :
```json
{
  "success": true,
  "prospect_id": "uuid...",
  "owner_id": "uuid...",
  "owner_name": "...",
  "organization_id": "uuid...",
  "tags": ["Centrale"],
  "magic_link_sent": false
}
```

**Étape 5 — Validation multi-tenant**

```
1. Créer une clé pour org A → tester → prospect créé dans org A ✓
2. Créer une clé pour org B → tester avec même email → prospect créé dans org B ✓
3. Tester avec clé expirée → 403 KEY_EXPIRED ✓
4. Tester avec clé désactivée → 403 KEY_DISABLED ✓
5. Tester sans Bearer → 401 MISSING_AUTH ✓
6. Tester avec type_projet inexistant → 400 INVALID_PROJECT_TYPE ✓
7. Tester avec email doublon → 409 DUPLICATE_EMAIL ✓
```

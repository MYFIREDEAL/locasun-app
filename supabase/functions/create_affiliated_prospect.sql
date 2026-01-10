-- ============================================================================
-- RPC: create_affiliated_prospect
-- ============================================================================
-- OBJECTIF: Créer un prospect via un lien d'affiliation comme si le commercial
--           était connecté, contournant les limites RLS du client anonyme.
--
-- SÉCURITÉ: SECURITY DEFINER = exécute avec les droits du créateur (Admin)
--           Pas de bypass RLS côté client, owner_id automatiquement valide.
--
-- USAGE: await supabase.rpc('create_affiliated_prospect', { p_name, p_email, ... })
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
  p_host text default 'evatime.fr' -- 🔥 AJOUT: hostname pour résolution organization_id
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
  v_default_jack_id uuid := '82be903d-9600-4c53-9cd4-113bfaaac12e';
  v_organization_id uuid; -- 🔥 AJOUT
begin
  -- 🔥 ÉTAPE 1: Résoudre organization_id depuis le hostname
  v_organization_id := resolve_organization_from_host(p_host);
  
  if v_organization_id is null then
    raise exception 'Organization non trouvée pour le domaine: %', p_host;
  end if;

  -- Trouver le commercial via son slug
  if p_affiliate_slug is not null then
    select u.user_id, u.name into v_owner_id, v_affiliate_name
    from public.users u
    where u.affiliate_slug = p_affiliate_slug
      and u.organization_id = v_organization_id; -- 🔥 AJOUT: isolation multi-tenant
  end if;

  -- Fallback sur Jack Luc si slug non trouvé
  if v_owner_id is null then
    v_owner_id := v_default_jack_id;
    select name into v_affiliate_name from public.users where user_id = v_default_jack_id;
  end if;

  -- Récupérer le step_id de la première colonne du pipeline
  if p_status is null then
    select id into v_first_step_id
    from public.global_pipeline_steps
    order by created_at asc
    limit 1;
    
    if v_first_step_id is null then
      v_first_step_id := 'default-global-pipeline-step-0';
    end if;
  else
    v_first_step_id := p_status;
  end if;

  -- Créer prospect avec owner_id du commercial
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
    organization_id, -- 🔥 AJOUT
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
    v_organization_id, -- 🔥 AJOUT
    now(),
    now()
  )
  returning id into v_prospect_id;

  return v_prospect_id;
end;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Autoriser l'exécution par les utilisateurs anonymes (pour l'inscription)
grant execute on function create_affiliated_prospect(text, text, text, text, text, text, text[], text, text) to anon;
grant execute on function create_affiliated_prospect(text, text, text, text, text, text, text[], text, text) to authenticated;

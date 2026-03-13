-- ============================================
-- 📱 Push Notifications — Table push_subscriptions
-- ============================================
-- Stocke les souscriptions Web Push des clients (prospect) et admins (user)
-- Chaque appareil a une entrée unique (endpoint = clé naturelle)
-- Multi-tenant via organization_id

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Qui est abonné (un des deux, jamais les deux)
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Multi-tenant
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Données Web Push (endpoint + keys)
  subscription JSONB NOT NULL,
  -- Endpoint extrait pour faciliter l'unicité et les recherches
  endpoint TEXT GENERATED ALWAYS AS (subscription->>'endpoint') STORED,
  
  -- Infos device (pour debug / gestion)
  device_info JSONB DEFAULT '{}',
  -- user_agent, platform, browser, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un seul abonnement par endpoint (un device = une souscription)
  CONSTRAINT unique_endpoint UNIQUE (endpoint),
  
  -- Au moins un des deux doit être renseigné
  CONSTRAINT check_subscriber CHECK (prospect_id IS NOT NULL OR user_id IS NOT NULL)
);

-- 2. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_prospect 
  ON push_subscriptions(prospect_id) WHERE prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON push_subscriptions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org 
  ON push_subscriptions(organization_id);

-- 3. Trigger auto updated_at
CREATE OR REPLACE FUNCTION fn_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION fn_push_subscriptions_updated_at();

-- 4. RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clients (prospects) : peuvent voir/créer/supprimer leurs propres souscriptions
CREATE POLICY "push_sub_prospect_select" ON push_subscriptions
  FOR SELECT USING (
    prospect_id IN (SELECT id FROM prospects WHERE user_id = auth.uid())
  );

CREATE POLICY "push_sub_prospect_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (
    prospect_id IN (SELECT id FROM prospects WHERE user_id = auth.uid())
  );

CREATE POLICY "push_sub_prospect_delete" ON push_subscriptions
  FOR DELETE USING (
    prospect_id IN (SELECT id FROM prospects WHERE user_id = auth.uid())
  );

-- Admins : peuvent voir toutes les souscriptions de leur org
CREATE POLICY "push_sub_admin_select" ON push_subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Service role (Edge Functions) : accès total (implicite, pas besoin de policy)

-- 5. Fonction RPC pour upsert (éviter les doublons d'endpoint)
CREATE OR REPLACE FUNCTION upsert_push_subscription(
  p_prospect_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_subscription JSONB DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_endpoint TEXT;
  v_id UUID;
BEGIN
  -- Extraire l'endpoint
  v_endpoint := p_subscription->>'endpoint';
  
  IF v_endpoint IS NULL THEN
    RAISE EXCEPTION 'subscription.endpoint est requis';
  END IF;
  
  -- Vérifier que l'appelant est bien le prospect ou l'utilisateur
  IF p_prospect_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM prospects WHERE id = p_prospect_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Non autorisé : prospect_id ne correspond pas à auth.uid()';
    END IF;
  ELSIF p_user_id IS NOT NULL THEN
    IF p_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Non autorisé : user_id ne correspond pas à auth.uid()';
    END IF;
  ELSE
    RAISE EXCEPTION 'prospect_id ou user_id requis';
  END IF;
  
  -- Upsert : si l'endpoint existe déjà, mettre à jour
  INSERT INTO push_subscriptions (prospect_id, user_id, organization_id, subscription, device_info)
  VALUES (p_prospect_id, p_user_id, p_organization_id, p_subscription, p_device_info)
  ON CONFLICT (endpoint)
  DO UPDATE SET
    subscription = EXCLUDED.subscription,
    device_info = EXCLUDED.device_info,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 6. Fonction RPC pour supprimer par endpoint
CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE endpoint = p_endpoint
    AND (
      prospect_id IN (SELECT id FROM prospects WHERE user_id = auth.uid())
      OR user_id = auth.uid()
    );
  
  RETURN FOUND;
END;
$$;

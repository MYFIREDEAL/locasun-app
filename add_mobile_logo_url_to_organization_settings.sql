-- Migration: Ajouter mobile_logo_url à organization_settings
-- Date: 14 mars 2026
-- Description: Logo séparé pour l'icône PWA mobile (indépendant du logo web)

ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS mobile_logo_url TEXT DEFAULT NULL;

COMMENT ON COLUMN organization_settings.mobile_logo_url IS 'Logo spécifique pour l''icône PWA mobile (image carrée 512x512 recommandée). Si null, fallback vers logo_url.';

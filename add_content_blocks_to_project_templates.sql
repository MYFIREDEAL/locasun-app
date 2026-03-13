-- Migration: Ajouter content_blocks à project_templates
-- Pour le page builder du catalogue client
-- Date: 13 mars 2026

ALTER TABLE public.project_templates 
ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_templates.content_blocks IS 
  'Blocs de contenu configurables pour la page détail du projet côté client.
   Structure : [
     { "id": "block-xxx", "type": "hero-image", "config": { "height": "medium" } },
     { "id": "block-xxx", "type": "feature", "emoji": "⚡", "title": "Avantage", "text": "..." },
     { "id": "block-xxx", "type": "text", "content": "Paragraphe libre..." },
     { "id": "block-xxx", "type": "cta", "text": "Lancer le projet", "style": "green" }
   ]
   Utilisé par le page builder admin (ProjectDisplayManagementPage) et rendu côté client (OfferDetailPage).';

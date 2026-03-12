-- =====================================================
-- Migration: Ajouter action_id à missions
-- Date: 12 mars 2026
-- Objectif: Permettre plusieurs missions pour le même
--           partenaire/prospect/projectType (multi-actions V2)
-- =====================================================

-- Colonne nullable → missions existantes gardent NULL
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS action_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.missions.action_id IS 
  'ID de l''action V2 (format v2-{moduleId}-action-{index}).
   Permet de distinguer plusieurs missions pour le même partenaire
   sur le même prospect/projectType (multi-actions V2).
   NULL pour les missions V1/legacy.';

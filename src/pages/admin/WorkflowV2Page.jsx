/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKFLOW V2 PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Page principale du Workflow V2 LIVE.
 * 
 * Route: /admin/workflow-v2/:prospectId/:projectType
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - Lecture depuis Supabase via useWorkflowV2
 *     - PROCEED = console.log uniquement
 *     - Aucune cascade, aucun update status
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

// ✅ Import config V2 (autorisé)
import {
  isWorkflowV2Enabled,
  MOCK_TOAST_MESSAGES,
  logV2,
} from '@/lib/workflowV2Config';

// ✅ Import hook V2 (autorisé)
import { useWorkflowV2 } from '@/hooks/useWorkflowV2';

// ✅ Import hooks Supabase pour formulaires et templates (PHASE FINALE)
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';

// ✅ Import hook persistance config (PROMPT 9)
import { useSupabaseWorkflowModuleTemplates } from '@/hooks/useSupabaseWorkflowModuleTemplates';

// ✅ Import composants V2 (autorisé)
import { ModuleNavigation, ModulePanel, ActionButtons } from '@/components/admin/workflow-v2';

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const WorkflowV2Page = () => {
  const { prospectId, projectType } = useParams();
  const navigate = useNavigate();
  
  // ✅ Hook centralisé V2 (remplace les données mock)
  const {
    prospect,
    steps,
    activeStep,
    activeStepIndex,
    activeStepForms,
    projectMessages,
    projectDocuments,  // 📁 Fichiers + Contrats/PDB
    loading,
    error,
    isReadOnly,
    navigateToStep,
    handleProceed,
    handleNeedData,
  } = useWorkflowV2(prospectId, projectType);
  
  // ✅ PHASE FINALE: Charger formulaires et templates depuis Supabase
  const { organizationId } = useOrganization();
  
  const { 
    forms: supabaseForms, 
    loading: formsLoading 
  } = useSupabaseForms(organizationId);
  
  const { 
    templates: supabaseTemplates, 
    loading: templatesLoading 
  } = useSupabaseContractTemplates(organizationId);
  
  // Transformer en format attendu par l'éditeur V2 [{id, name}]
  const availableForms = useMemo(() => {
    if (!supabaseForms) return [];
    return Object.values(supabaseForms).map(form => ({
      id: form.id,
      name: form.name,
      audience: form.audience || 'client',
    }));
  }, [supabaseForms]);
  
  const availableTemplates = useMemo(() => {
    if (!supabaseTemplates) return [];
    return supabaseTemplates.map(template => ({
      id: template.id,
      name: template.name,
      projectType: template.projectType,
    }));
  }, [supabaseTemplates]);
  
  // ✅ PROMPT 9: Hook persistance config Workflow V2
  // Passé directement comme templateOps au composant ModuleConfigTab
  const templateOps = useSupabaseWorkflowModuleTemplates(organizationId, projectType);
  
  // Vérifier feature flag
  if (!isWorkflowV2Enabled()) {
    logV2('Feature flag désactivé, redirect vers pipeline');
    navigate('/admin/pipeline');
    return null;
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ───────────────────────────────────────────────────────────────────────────
  
  const onProceed = () => {
    const result = handleProceed();
    if (result.mock) {
      toast(MOCK_TOAST_MESSAGES.proceed);
    }
  };
  
  const onNeedData = () => {
    const result = handleNeedData();
    if (result.mock) {
      toast(MOCK_TOAST_MESSAGES.needData);
    }
  };
  
  const onModuleClick = (index) => {
    navigateToStep(index);
  };
  
  const handleBack = () => {
    navigate('/admin/pipeline');
  };
  
  // ───────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ───────────────────────────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Chargement du workflow...</p>
        </div>
      </div>
    );
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ───────────────────────────────────────────────────────────────────────────
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Erreur de chargement</p>
          <p className="text-gray-500 text-sm mt-1">{error.message || 'Erreur inconnue'}</p>
          <Button onClick={handleBack} className="mt-4">
            Retour au pipeline
          </Button>
        </div>
      </div>
    );
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // EMPTY STATE (pas de steps)
  // ───────────────────────────────────────────────────────────────────────────
  
  if (!steps || steps.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Aucune étape configurée</p>
          <p className="text-gray-500 text-sm mt-1">
            Ce projet n'a pas d'étapes définies pour le type "{projectType}"
          </p>
          <Button onClick={handleBack} className="mt-4">
            Retour au pipeline
          </Button>
        </div>
      </div>
    );
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Workflow V2 <span className="text-blue-600">LIVE</span>
              </h1>
              <p className="text-sm text-gray-500">
                {projectType} • Prospect: {prospectId?.slice(0, 8)}...
              </p>
            </div>
          </div>
          
          {/* Badge READ_ONLY */}
          {isReadOnly && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              Mode lecture seule
            </div>
          )}
        </div>
      </div>
      
      {/* Layout principal : Timeline gauche + Panel central */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          
          {/* ─────────────────────────────────────────────────────────────────
              TIMELINE GAUCHE (Navigation Modules) - Composant T4
          ───────────────────────────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0">
            <ModuleNavigation
              steps={steps}
              activeStepIndex={activeStepIndex}
              onSelectStep={onModuleClick}
              className="sticky top-6"
            />
          </div>
          
          {/* ─────────────────────────────────────────────────────────────────
              PANEL CENTRAL (Contenu Module) - Composant T5
          ───────────────────────────────────────────────────────────────── */}
          <div className="flex-1">
            <ModulePanel
              step={activeStep}
              stepIndex={activeStepIndex}
              totalSteps={steps.length}
              prospect={prospect}
              prospectId={prospectId}
              projectType={projectType}
              forms={activeStepForms}
              documents={projectDocuments}
              messages={projectMessages}
              isReadOnly={isReadOnly}
              availableForms={availableForms}
              availableTemplates={availableTemplates}
              formsLoading={formsLoading}
              templatesLoading={templatesLoading}
              templateOps={templateOps}
            >
              {/* Footer avec boutons d'action - Composant T6 */}
              <ActionButtons
                onProceed={onProceed}
                onNeedData={onNeedData}
                isReadOnly={isReadOnly}
                stepStatus={activeStep?.status}
                showToast={toast}
              />
            </ModulePanel>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default WorkflowV2Page;

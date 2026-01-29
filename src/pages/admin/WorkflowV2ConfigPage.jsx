/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKFLOW V2 CONFIG PAGE - Cockpit Configuration Globale
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Page admin dédiée pour configurer TOUS les workflows sans ouvrir un prospect.
 * Route: /admin/workflow-v2-config
 * 
 * PROMPT 10 — COCKPIT WORKFLOW V2 (CONFIGURATION GLOBALE)
 * 
 * FONCTIONNALITÉS:
 *   - Vue globale de tous les project_types (ACC, Centrale, PDB, etc.)
 *   - Pour chaque type: liste des modules/étapes avec badge config
 *   - Clic sur module → ouvre ModuleConfigTab en mode GLOBAL (pas de prospectId)
 *   - Persistance via workflow_module_templates (org_id + project_type + module_id)
 * 
 * ⚠️ PORTÉE STRICTE:
 *   ❌ Aucun changement moteur
 *   ❌ Aucune exécution depuis cette page
 *   ❌ Aucun impact V1
 *   ✅ UI + navigation uniquement
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Layers,
  FileText,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/App';
import { useOrganization } from '@/contexts/OrganizationContext';

// ✅ Composants V2 existants
import ModuleConfigTab from '@/components/admin/workflow-v2/ModuleConfigTab';

// ✅ Hooks V2 existants
import { useSupabaseWorkflowModuleTemplates } from '@/hooks/useSupabaseWorkflowModuleTemplates';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';

// ✅ Validation config
import { isModuleConfigComplete } from '@/lib/moduleAIConfig';

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Project Type Card
// ─────────────────────────────────────────────────────────────────────────────

const ProjectTypeCard = ({ 
  projectType, 
  projectData, 
  onSelectModule, 
  selectedModuleId,
  configuredModules = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const steps = projectData?.steps || [];
  const configuredCount = steps.filter(step => {
    const moduleId = step.name?.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '') || '';
    return configuredModules.includes(`${projectType}:${moduleId}`);
  }).length;
  
  const projectColor = projectData?.color || 'bg-blue-100 text-blue-800';
  
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
            projectColor.includes('bg-') ? projectColor : 'bg-blue-100 text-blue-800'
          )}>
            {projectData?.icon || '📋'}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              {projectData?.title || projectType}
            </h3>
            <p className="text-sm text-gray-500">
              {steps.length} modules • {configuredCount} configurés
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Badge progression */}
          <span className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            configuredCount === steps.length && steps.length > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          )}>
            {configuredCount}/{steps.length}
          </span>
          
          <ChevronRight className={cn(
            "h-5 w-5 text-gray-400 transition-transform",
            isExpanded && "rotate-90"
          )} />
        </div>
      </button>
      
      {/* Steps List */}
      {isExpanded && steps.length > 0 && (
        <div className="border-t bg-gray-50/50">
          {steps.map((step, index) => {
            const moduleId = step.name?.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '') || `step-${index}`;
            const isConfigured = configuredModules.includes(`${projectType}:${moduleId}`);
            const isSelected = selectedModuleId === `${projectType}:${moduleId}`;
            
            return (
              <button
                key={moduleId}
                onClick={() => onSelectModule(projectType, moduleId, step)}
                className={cn(
                  "w-full px-5 py-3 flex items-center justify-between text-left",
                  "hover:bg-blue-50 transition-colors border-b last:border-b-0",
                  isSelected && "bg-blue-100 hover:bg-blue-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{step.icon || '📋'}</span>
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-blue-900" : "text-gray-700"
                    )}>
                      {step.name || `Module ${index + 1}`}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isConfigured ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Configuré
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      À configurer
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Empty state */}
      {isExpanded && steps.length === 0 && (
        <div className="px-5 py-8 text-center text-gray-400 border-t">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun module défini pour ce projet</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const WorkflowV2ConfigPage = () => {
  // Context
  const { projectsData } = useAppContext();
  const { organizationId } = useOrganization();
  
  // State local
  const [selectedModule, setSelectedModule] = useState(null);
  // selectedModule = { projectType, moduleId, step }
  
  // ✅ Hooks Supabase pour données réelles
  const { forms: supabaseForms, loading: formsLoading } = useSupabaseForms(organizationId);
  const { templates: supabaseTemplates, loading: templatesLoading } = useSupabaseContractTemplates(organizationId);
  
  // ✅ Hook persistance config (sans projectType = charge TOUS les templates)
  const templateOps = useSupabaseWorkflowModuleTemplates(organizationId, null);
  
  // Transformer pour l'UI
  const availableForms = useMemo(() => {
    if (!supabaseForms) return [];
    return supabaseForms.map(f => ({ id: f.id, name: f.name || f.title || 'Formulaire sans nom' }));
  }, [supabaseForms]);
  
  const availableTemplates = useMemo(() => {
    if (!supabaseTemplates) return [];
    return supabaseTemplates.map(t => ({ id: t.id, name: t.name || 'Template sans nom' }));
  }, [supabaseTemplates]);
  
  // Liste des project types
  const projectTypes = useMemo(() => {
    if (!projectsData) return [];
    return Object.entries(projectsData)
      .filter(([_, data]) => data?.steps?.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [projectsData]);
  
  // ✅ Liste des modules configurés (depuis les templates persistés)
  const configuredModules = useMemo(() => {
    if (!templateOps.templates) return [];
    
    // templates est un objet indexé par moduleId, on a besoin du projectType aussi
    return templateOps.getAllTemplatesList().map(t => 
      `${t.project_type}:${t.module_id}`
    );
  }, [templateOps]);
  
  // Handler sélection module
  const handleSelectModule = (projectType, moduleId, step) => {
    setSelectedModule({ projectType, moduleId, step });
  };
  
  // Handler retour
  const handleBack = () => {
    setSelectedModule(null);
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // VUE: Module sélectionné → Afficher ModuleConfigTab
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedModule) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              
              <div className="h-6 w-px bg-gray-200" />
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  {selectedModule.step?.name || selectedModule.moduleId}
                </h1>
                <p className="text-sm text-gray-500">
                  Configuration globale • {selectedModule.projectType}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Info banner */}
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Configuration globale</strong> — Cette configuration s'appliquera 
                à <strong>tous les projets "{selectedModule.projectType}"</strong> de votre organisation.
                Les modifications sont enregistrées en base et seront utilisées par défaut.
              </span>
            </p>
          </div>
          
          {/* ModuleConfigTab existant */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <ModuleConfigTab
              moduleId={selectedModule.moduleId}
              moduleName={selectedModule.step?.name || selectedModule.moduleId}
              isReadOnly={false}
              prospectId={null}  // ⚠️ Mode GLOBAL - pas de prospect
              projectType={selectedModule.projectType}
              availableForms={availableForms}
              availableTemplates={availableTemplates}
              templateOps={templateOps}
            />
          </div>
        </div>
      </div>
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // VUE: Liste des project types
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                Workflow V2 — Configuration
              </h1>
              <p className="text-gray-500 mt-2 max-w-2xl">
                Configurez la logique IA de chaque module sans ouvrir de prospect. 
                Ces configurations s'appliquent à tous les projets de votre organisation.
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{projectTypes.length}</p>
                <p className="text-gray-500">Types de projet</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{configuredModules.length}</p>
                <p className="text-gray-500">Modules configurés</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Info banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Configuration centralisée
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Chaque module peut être configuré indépendamment. Cliquez sur un module 
                pour définir ses actions, formulaires, templates et comportement IA.
              </p>
            </div>
          </div>
        </div>
        
        {/* Project Types Grid */}
        {projectTypes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun type de projet configuré
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Créez des types de projets avec des étapes dans la configuration 
              de votre organisation pour les voir apparaître ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectTypes.map(([projectType, projectData]) => (
              <ProjectTypeCard
                key={projectType}
                projectType={projectType}
                projectData={projectData}
                onSelectModule={handleSelectModule}
                selectedModuleId={selectedModule ? `${selectedModule.projectType}:${selectedModule.moduleId}` : null}
                configuredModules={configuredModules}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowV2ConfigPage;

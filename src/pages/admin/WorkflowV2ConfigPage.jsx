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
 * LAYOUT: 2 colonnes
 *   - Gauche: Navigation par project_type + modules
 *   - Droite: Configuration du module sélectionné
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
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/App';
import { useOrganization } from '@/contexts/OrganizationContext';

// ✅ Composants V2 existants
import ModuleConfigTab from '@/components/admin/workflow-v2/ModuleConfigTab';

// ✅ Hooks V2 existants
import { useSupabaseWorkflowModuleTemplates } from '@/hooks/useSupabaseWorkflowModuleTemplates';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const WorkflowV2ConfigPage = () => {
  // Context
  const { projectsData } = useAppContext();
  const { organizationId } = useOrganization();
  
  // State local
  const [selectedProjectType, setSelectedProjectType] = useState(null);
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
    // supabaseForms est un OBJET indexé par form_id, pas un array
    return Object.values(supabaseForms).map(f => ({ 
      id: f.id, 
      name: f.name || f.title || 'Formulaire sans nom',
      fields: f.fields || [], // ✨ AJOUT: Champs pour FormRequiredFieldsConfig
      audience: f.audience || 'client',
    }));
  }, [supabaseForms]);
  
  const availableTemplates = useMemo(() => {
    if (!supabaseTemplates) return [];
    // supabaseTemplates est un ARRAY
    if (!Array.isArray(supabaseTemplates)) {
      return Object.values(supabaseTemplates).map(t => ({ id: t.id, name: t.name || 'Template sans nom' }));
    }
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
    // templates est un objet indexé par moduleId
    if (!templateOps.templates || typeof templateOps.templates !== 'object') return [];
    
    // Convertir l'objet en array et extraire project_type:module_id
    const result = Object.values(templateOps.templates).map(t => 
      `${t.projectType}:${t.moduleId}`
    );
    console.log('[V2 ConfigPage] configuredModules:', result, 'selectedProjectType:', selectedProjectType);
    return result;
  }, [templateOps.templates]);

  // Auto-select first project type
  React.useEffect(() => {
    if (projectTypes.length > 0 && !selectedProjectType) {
      setSelectedProjectType(projectTypes[0][0]);
    }
  }, [projectTypes, selectedProjectType]);
  
  // Get current project data
  const currentProjectData = selectedProjectType ? projectsData[selectedProjectType] : null;
  const currentSteps = currentProjectData?.steps || [];
  
  // Handler sélection module
  const handleSelectModule = (projectType, moduleId, step) => {
    setSelectedModule({ projectType, moduleId, step });
  };
  
  // Stats
  const totalModules = projectTypes.reduce((acc, [_, data]) => acc + (data?.steps?.length || 0), 0);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Workflow V2 — Configuration
              </h1>
              <p className="text-sm text-gray-500">
                Configuration globale par type de projet
              </p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{projectTypes.length}</p>
              <p className="text-xs text-gray-500">Types de projet</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{configuredModules.length}</p>
              <p className="text-xs text-gray-500">Modules configurés</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{totalModules}</p>
              <p className="text-xs text-gray-500">Total modules</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - 2 colonnes */}
      <div className="flex">
        
        {/* ─────────────────────────────────────────────────────────────────
            COLONNE GAUCHE: Navigation (sticky)
        ───────────────────────────────────────────────────────────────── */}
        <div className="w-80 bg-white border-r flex-shrink-0 sticky top-0 self-start max-h-[calc(100vh-64px)] overflow-y-auto">
          
          {/* Project Type Tabs */}
          <div className="border-b p-3 flex-shrink-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
              Type de projet
            </p>
            <div className="flex flex-wrap gap-1.5">
              {projectTypes.map(([projectType, projectData]) => {
                const isSelected = selectedProjectType === projectType;
                const steps = projectData?.steps || [];
                const configuredCount = steps.filter(step => {
                  const moduleId = step.name?.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '') || '';
                  return configuredModules.includes(`${projectType}:${moduleId}`);
                }).length;
                
                return (
                  <button
                    key={projectType}
                    onClick={() => {
                      setSelectedProjectType(projectType);
                      setSelectedModule(null);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      isSelected 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <span>{projectData?.icon || '📋'}</span>
                    <span>{projectData?.title || projectType}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      isSelected 
                        ? "bg-white/20 text-white" 
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {configuredCount}/{steps.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Modules List */}
          <div className="overflow-y-auto flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 pt-3 pb-2">
              Modules ({currentSteps.length})
            </p>
            
            {currentSteps.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun module</p>
              </div>
            ) : (
              <div className="space-y-1 px-2 pb-4">
                {currentSteps.map((step, index) => {
                  const moduleId = step.name?.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '') || `step-${index}`;
                  const isConfigured = configuredModules.includes(`${selectedProjectType}:${moduleId}`);
                  const isSelected = selectedModule?.moduleId === moduleId && selectedModule?.projectType === selectedProjectType;
                  
                  return (
                    <button
                      key={moduleId}
                      onClick={() => handleSelectModule(selectedProjectType, moduleId, step)}
                      className={cn(
                        "w-full px-3 py-3 rounded-lg text-left transition-all",
                        "flex items-center gap-3",
                        isSelected 
                          ? "bg-blue-100 border-2 border-blue-500" 
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                      )}
                    >
                      <span className="text-xl flex-shrink-0">{step.icon || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isSelected ? "text-blue-900" : "text-gray-800"
                        )}>
                          {step.name || `Module ${index + 1}`}
                        </p>
                        {step.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isConfigured ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* ─────────────────────────────────────────────────────────────────
            COLONNE DROITE: Configuration
        ───────────────────────────────────────────────────────────────── */}
        <div className="flex-1">
          {selectedModule ? (
            <div className="p-6 max-w-4xl mx-auto">
              {/* Header module */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedModule.step?.icon || '📋'}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedModule.step?.name || selectedModule.moduleId}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {currentProjectData?.title || selectedProjectType} • Configuration globale
                    </p>
                  </div>
                </div>
                
                {/* Info banner */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700 flex items-start gap-2">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Cette configuration s'applique à <strong>tous les projets "{currentProjectData?.title || selectedProjectType}"</strong> de votre organisation.
                    </span>
                  </p>
                </div>
              </div>
              
              {/* ModuleConfigTab */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <ModuleConfigTab
                  moduleId={selectedModule.moduleId}
                  moduleName={selectedModule.step?.name || selectedModule.moduleId}
                  isReadOnly={false}
                  prospectId={null}
                  projectType={selectedModule.projectType}
                  availableForms={availableForms}
                  availableTemplates={availableTemplates}
                  templateOps={templateOps}
                />
              </div>
            </div>
          ) : (
            /* Empty state - aucun module sélectionné */
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sélectionnez un module
                </h3>
                <p className="text-gray-500">
                  Choisissez un module dans la liste à gauche pour configurer 
                  ses actions, formulaires, templates et comportement IA.
                </p>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default WorkflowV2ConfigPage;

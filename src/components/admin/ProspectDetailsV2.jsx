/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROSPECT DETAILS V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Version simplifiée de ProspectDetailsAdmin pour le Workflow V2.
 * 
 * ⚠️  RÈGLES ABSOLUES :
 *     - ZERO import de hooks V1 (useWorkflowExecutor, etc.)
 *     - ZERO cascade automatique
 *     - ZERO mutation directe
 *     - Lecture seule des étapes
 * 
 * Voir /docs/workflow-v2/01_vision.md pour la séparation V1/V2.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  User,
  ExternalLink,
  CheckCircle,
  Circle,
  Lock,
  Rocket,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/App';
import { cn } from '@/lib/utils';

// ✅ Imports V2 autorisés
import { 
  isWorkflowV2Enabled, 
  logV2,
} from '@/lib/workflowV2Config';
import { useSupabaseProjectStepsStatus } from '@/hooks/useSupabaseProjectStepsStatus';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: {
    label: 'Terminé',
    icon: CheckCircle,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
  in_progress: {
    label: 'En cours',
    icon: Circle,
    iconClass: 'text-blue-500 fill-blue-500',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  pending: {
    label: 'À venir',
    icon: Lock,
    iconClass: 'text-gray-300',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Info Client
// ─────────────────────────────────────────────────────────────────────────────

const ClientInfoSection = ({ prospect }) => {
  if (!prospect) return null;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Informations client
      </h2>
      
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <User className="h-7 w-7 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">
            {prospect.name || 'Client sans nom'}
          </h3>
          
          <div className="mt-3 space-y-2">
            {prospect.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${prospect.email}`} className="hover:text-blue-600">
                  {prospect.email}
                </a>
              </div>
            )}
            
            {prospect.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${prospect.phone}`} className="hover:text-blue-600">
                  {prospect.phone}
                </a>
              </div>
            )}
            
            {prospect.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{prospect.address}</span>
              </div>
            )}
            
            {prospect.company_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="h-4 w-4 text-gray-400" />
                <span>{prospect.company_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Liste des projets
// ─────────────────────────────────────────────────────────────────────────────

const ProjectsSection = ({ prospect, onOpenWorkflow }) => {
  const tags = prospect?.tags || [];
  
  if (tags.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Projets
        </h2>
        <p className="text-gray-400 text-center py-4">
          Aucun projet associé
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Projets ({tags.length})
      </h2>
      
      <div className="space-y-3">
        {tags.map((tag) => (
          <div 
            key={tag}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-gray-900">{tag}</span>
            </div>
            
            {isWorkflowV2Enabled() && (
              <Button
                size="sm"
                onClick={() => onOpenWorkflow(tag)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Rocket className="h-4 w-4" />
                Ouvrir Workflow V2
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Timeline des étapes (READ_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

const StepsTimeline = ({ steps = [], projectType }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Étapes — {projectType}
        </h2>
        <p className="text-gray-400 text-center py-4">
          Aucune étape configurée
        </p>
      </div>
    );
  }
  
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Étapes — {projectType}
        </h2>
        <span className="text-xs text-gray-400">
          {completedCount}/{steps.length} ({progressPercent}%)
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Timeline */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = step.status || 'pending';
          const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
          const IconComponent = config.icon;
          
          return (
            <div 
              key={step.id || index}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg',
                config.bgClass
              )}
            >
              <div className={cn('flex-shrink-0', config.iconClass)}>
                <IconComponent className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', config.textClass)}>
                  {step.icon || '📋'} {step.name || `Étape ${index + 1}`}
                </p>
              </div>
              
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                config.bgClass,
                config.textClass
              )}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Note READ_ONLY */}
      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-700">
          ⚠️ <strong>Mode lecture seule</strong> — Les étapes sont affichées mais non modifiables ici.
          Utilisez le bouton "Ouvrir Workflow V2" pour interagir.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page détails prospect V2 (simplifiée)
 * 
 * @param {Object} props
 * @param {Object} props.prospect - Données du prospect
 * @param {() => void} props.onClose - Callback fermeture
 */
const ProspectDetailsV2 = ({ prospect, onClose }) => {
  const navigate = useNavigate();
  const [selectedProjectType, setSelectedProjectType] = useState(
    prospect?.tags?.[0] || null
  );
  
  // ✅ Hook V2 autorisé (lecture seule)
  const { projectStepsStatus } = useSupabaseProjectStepsStatus(
    prospect?.id,
    { enabled: !!prospect?.id }
  );
  
  // Étapes du projet sélectionné
  const currentSteps = useMemo(() => {
    if (!selectedProjectType || !projectStepsStatus) return [];
    return projectStepsStatus[selectedProjectType] || [];
  }, [projectStepsStatus, selectedProjectType]);
  
  // Handler ouverture Workflow V2
  const handleOpenWorkflow = (projectType) => {
    logV2('ProspectDetailsV2: Ouverture Workflow', { 
      prospectId: prospect?.id, 
      projectType 
    });
    navigate(`/admin/workflow-v2/${prospect.id}/${projectType}`);
  };
  
  // Handler fermeture
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/admin/pipeline');
    }
  };
  
  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  
  if (!prospect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Aucun prospect sélectionné</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Prospect <span className="text-blue-600">V2</span>
              </h1>
              <p className="text-sm text-gray-500">
                {prospect.name} • {prospect.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
          
          {/* Badge V2 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Version V2
          </div>
        </div>
      </div>
      
      {/* Contenu */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Colonne gauche */}
          <div className="space-y-6">
            <ClientInfoSection prospect={prospect} />
            <ProjectsSection 
              prospect={prospect} 
              onOpenWorkflow={handleOpenWorkflow}
            />
          </div>
          
          {/* Colonne droite */}
          <div className="space-y-6">
            {/* Sélecteur de projet */}
            {prospect.tags?.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Afficher les étapes pour :
                </label>
                <div className="flex flex-wrap gap-2">
                  {prospect.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedProjectType(tag)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        selectedProjectType === tag
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Timeline des étapes */}
            {selectedProjectType && (
              <StepsTimeline 
                steps={currentSteps} 
                projectType={selectedProjectType}
              />
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ProspectDetailsV2;

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

const normalizeLabel = (label) => (label || '').toString().trim().toUpperCase();

// 🔥 PR-7: Comparateur shallow pour éviter re-renders inutiles
const arePropsEqual = (prevProps, nextProps) => {
  // Comparer les IDs stables (priorité)
  if (prevProps.sortableId !== nextProps.sortableId) return false;
  
  // Comparer les données du prospect (shallow)
  const prevP = prevProps.prospect;
  const nextP = nextProps.prospect;
  if (prevP.id !== nextP.id) return false;
  if (prevP.name !== nextP.name) return false;
  if (prevP.hasAppointment !== nextP.hasAppointment) return false;
  if (prevP.updatedAt !== nextP.updatedAt) return false;
  
  // Comparer _projectContext (shallow)
  const prevCtx = prevP._projectContext || {};
  const nextCtx = nextP._projectContext || {};
  if (prevCtx.projectType !== nextCtx.projectType) return false;
  if (prevCtx.projectTitle !== nextCtx.projectTitle) return false;
  if (prevCtx.stepLabel !== nextCtx.stepLabel) return false;
  
  // Comparer tags (array shallow)
  const prevTags = prevP.tags || [];
  const nextTags = nextP.tags || [];
  if (prevTags.length !== nextTags.length) return false;
  if (prevTags.some((t, i) => t !== nextTags[i])) return false;
  
  // projectsData: comparaison par référence (doit être mémorisé côté parent)
  if (prevProps.projectsData !== nextProps.projectsData) return false;
  
  // onClick: comparaison par référence (doit être useCallback côté parent)
  if (prevProps.onClick !== nextProps.onClick) return false;
  
  return true;
};

const ProspectCardInner = ({ prospect, onClick, sortableId, projectsData = {} }) => {
  const navigate = useNavigate();
  
  // 🔥 PR-8: Supprimé le useEffect N+1 qui chargeait project_infos pour chaque carte
  // Les projets sont déjà filtrés côté FinalPipeline via allProjectSteps
  // On affiche tous les tags du prospect (approche optimistic)
  const activeTags = Array.isArray(prospect.tags) ? prospect.tags : [];
  
  // 🎯 Contexte du projet pour CETTE carte spécifique
  const activeProjectLabel =
    prospect._projectContext?.projectTitle ||
    prospect._projectContext?.projectType ||
    null;
  const activeProjectType = prospect._projectContext?.projectType || null; // 🔥 Type du projet principal
  const activeStepLabel = prospect._projectContext?.stepLabel || null;
  const normalizedActiveLabel = activeProjectLabel ? normalizeLabel(activeProjectLabel) : null;
  const computedSortableId =
    sortableId ||
    (normalizedActiveLabel
      ? `${prospect.id}-${normalizedActiveLabel}`
      : `${prospect.id}-${prospect._projectContext?.projectType || 'default'}`);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: computedSortableId, data: { prospect } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layoutId={`prospect-card-${computedSortableId}`}
        whileHover={{ y: -4, scale: 1.02 }}
        onClick={onClick}
        className="bg-white rounded-xl shadow-card hover:shadow-soft p-4 cursor-grab active:cursor-grabbing transition-all"
      >
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-gray-800">{prospect.name}</h3>
          {prospect.hasAppointment && (
            <div className="flex items-center text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
              <Calendar className="h-3 w-3 mr-1" />
              <span>RDV</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          {/* 🎯 Afficher LE projet principal de cette carte - UNIQUEMENT SI ACTIF */}
          {activeProjectLabel && activeTags.includes(prospect._projectContext?.projectType || activeProjectLabel) && (
            <span
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border-2 border-blue-400 font-semibold shadow-sm tracking-wide ${
                projectsData[activeProjectType]?.color || 'bg-blue-100 text-blue-800'
              }`}
            >
              <span>{activeProjectLabel}</span>
            </span>
          )}
          
          {/* 📋 Afficher les autres tags en mode normal (non entourés) - UNIQUEMENT LES ACTIFS */}
          {activeTags
            .filter(tag => tag !== activeProjectType)
            .map(tag => {
              // 🔥 Utiliser le title et la couleur du projet depuis Supabase
              const projectTitle = projectsData[tag]?.title || tag;
              const projectColor = projectsData[tag]?.color || 'bg-gray-100 text-gray-800';

              return (
                <span
                  key={tag}
                  className={`text-xs px-2 py-1 rounded-full ${projectColor}`}
                >
                  {projectTitle}
                </span>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
};

// 🔥 PR-7: React.memo avec comparateur custom pour perf pipeline 1000+ prospects
const ProspectCard = memo(ProspectCardInner, arePropsEqual);

export default ProspectCard;

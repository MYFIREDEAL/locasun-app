import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const normalizeLabel = (label) => (label || '').toString().trim().toUpperCase();

const ProspectCard = ({ prospect, onClick, sortableId }) => {
  // 🎯 Contexte du projet pour CETTE carte spécifique
  const activeProjectLabel =
    prospect._projectContext?.projectTitle ||
    prospect._projectContext?.projectType ||
    null;
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
          {/* 🎯 Afficher LE projet principal de cette carte */}
          {activeProjectLabel && (
            <span
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border-2 border-blue-400 font-semibold shadow-sm tracking-wide ${(() => {
                const normalized = normalizeLabel(activeProjectLabel);
                switch (normalized) {
                  case 'ACC':
                    return 'bg-blue-100 text-blue-800';
                  case 'AUTONOMIE':
                    return 'bg-green-100 text-green-800';
                  case 'CENTRALE':
                    return 'bg-orange-100 text-orange-800';
                  case 'INVESTISSEMENT':
                    return 'bg-teal-100 text-teal-800';
                  case 'PRODUCTEURPRO':
                    return 'bg-purple-100 text-purple-800';
                  default:
                    return 'bg-gray-100 text-gray-600';
                }
              })()}`}
            >
              <span>{activeProjectLabel}</span>
            </span>
          )}
          
          {/* 📋 Afficher les autres tags en mode normal (non entourés) */}
          {(Array.isArray(prospect.tags) ? prospect.tags : [])
            .filter(tag => normalizeLabel(tag) !== normalizedActiveLabel)
            .map(tag => {
              const normalizedTag = normalizeLabel(tag);
              const tagColorClass = (() => {
                switch (normalizedTag) {
                  case 'ACC':
                    return 'bg-blue-100 text-blue-800';
                  case 'AUTONOMIE':
                    return 'bg-green-100 text-green-800';
                  case 'CENTRALE':
                    return 'bg-orange-100 text-orange-800';
                  case 'INVESTISSEMENT':
                    return 'bg-teal-100 text-teal-800';
                  case 'PRODUCTEURPRO':
                    return 'bg-purple-100 text-purple-800';
                  default:
                    return 'bg-gray-100 text-gray-600';
                }
              })();

              return (
                <span
                  key={tag}
                  className={`text-xs px-2 py-1 rounded-full ${tagColorClass}`}
                >
                  {tag}
                </span>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
};

export default ProspectCard;

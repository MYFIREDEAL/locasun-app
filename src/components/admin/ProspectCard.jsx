import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const normalizeLabel = (label) => (label || '').toString().trim().toUpperCase();

const ProspectCard = ({ prospect, onClick, sortableId }) => {
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
          {(Array.isArray(prospect.tags) ? prospect.tags : []).map(tag => {
            const normalizedTag = normalizeLabel(tag);
            const isActive = normalizedActiveLabel && normalizedTag === normalizedActiveLabel;
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

            if (isActive) {
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border-2 border-blue-400 font-semibold shadow-sm tracking-wide ${tagColorClass}`}
                >
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 shadow-inner" />
                  <span>{tag}</span>
                  {activeStepLabel && (
                    <span className="text-blue-500 font-medium">• {activeStepLabel}</span>
                  )}
                </span>
              );
            }
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

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const tagColors = {
  ACC: 'bg-blue-100 text-blue-800',
  Autonomie: 'bg-green-100 text-green-800',
  Centrale: 'bg-orange-100 text-orange-800',
  Investissement: 'bg-teal-100 text-teal-800',
  ProducteurPro: 'bg-purple-100 text-purple-800',
};

const ProspectCard = ({ prospect, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect.id, data: { prospect } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layoutId={`prospect-card-${prospect.id}`}
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
        <div className="flex flex-wrap gap-2 mt-3">
          {prospect.tags.map(tag => (
            <span key={tag} className={`text-xs font-medium px-2 py-1 rounded-full ${tagColors[tag] || 'bg-gray-100 text-gray-800'}`}>
              {tag}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ProspectCard;
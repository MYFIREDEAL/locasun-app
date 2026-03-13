import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight, Check, RefreshCw, Eye } from 'lucide-react';
import { useAppContext } from '@/App';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Extraire la première ligne de la description pour l'accroche
 */
const getShortDescription = (description, maxLen = 80) => {
  if (!description) return 'Découvrez cette offre et lancez votre projet.';
  const firstLine = description.split('\n').find(l => l.trim()) || '';
  // Retirer l'emoji de début si présent
  const cleaned = firstLine.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, '').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).trim() + '…';
};

// ─── Card produit mobile-first ───
const OfferCard = ({ project, projectStatus, index }) => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();

  const isProjectAdded = currentUser?.tags?.includes(project.type) || false;
  const isInactive = isProjectAdded && (projectStatus === 'abandon' || projectStatus === 'archive');
  const title = project.clientTitle || project.title;
  const accroche = getShortDescription(project.clientDescription);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={() => navigate(`/dashboard/offres/${project.type}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-md"
    >
      {/* Image */}
      <div className="relative h-36 md:h-44 w-full bg-gradient-to-br from-gray-100 to-gray-200">
        {project.coverImage ? (
          <img src={project.coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-gray-300" />
          </div>
        )}
        
        {/* Badge statut */}
        {isProjectAdded && !isInactive && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-semibold shadow">
              <Check className="h-2.5 w-2.5" /> Actif
            </span>
          </div>
        )}
        {isInactive && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-400 text-white text-[10px] font-semibold shadow">
              <RefreshCw className="h-2.5 w-2.5" /> Inactif
            </span>
          </div>
        )}

        {/* Gradient overlay bas */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Contenu */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{project.icon}</span>
              <h3 className="text-base font-bold text-gray-900 truncate">{title}</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{accroche}</p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Action hint */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {isProjectAdded ? 'Voir les détails' : 'Découvrir cette offre'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const OffersPage = () => {
  const { projectsData, currentUser } = useAppContext();
  const [projectStatuses, setProjectStatuses] = useState({});

  // Charger les statuts des projets du client
  useEffect(() => {
    const loadProjectStatuses = async () => {
      if (!currentUser?.id || !currentUser?.tags || currentUser.tags.length === 0) return;
      
      const { data } = await supabase
        .from('project_infos')
        .select('project_type, status')
        .eq('prospect_id', currentUser.id)
        .in('project_type', currentUser.tags);
      
      if (data) {
        const statusMap = {};
        data.forEach(item => {
          statusMap[item.project_type] = item.status || 'actif';
        });
        setProjectStatuses(statusMap);
      }
    };
    
    loadProjectStatuses();
  }, [currentUser]);

  const offers = Object.values(projectsData).filter(p => p.isPublic);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 pb-8"
    >
      {/* Header */}
      <div className="text-center px-4">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Nos offres ⚡</h1>
        <p className="text-gray-500 mt-1 text-sm max-w-md mx-auto">
          Choisissez le projet qui vous correspond
        </p>
      </div>

      {/* Grille de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
        {offers.map((project, i) => (
          <OfferCard 
            key={project.type} 
            project={project}
            projectStatus={projectStatuses[project.type] || 'actif'}
            index={i}
          />
        ))}
      </div>

      {/* Empty state */}
      {offers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Aucune offre disponible pour le moment</p>
        </div>
      )}
    </motion.div>
  );
};

export default OffersPage;
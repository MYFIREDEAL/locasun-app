import React from 'react';

/**
 * Skeleton Card - Animation de chargement pour les cartes de prospect
 * 🔥 PR-5: Effet shimmer moderne (dégradé qui glisse)
 */
const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden relative">
      {/* 🔥 Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      
      {/* Header avec avatar + nom */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4" />
          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2" />
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-3">
        <div className="h-6 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full w-16" />
        <div className="h-6 bg-gradient-to-r from-green-100 to-green-200 rounded-full w-20" />
      </div>

      {/* Footer avec icônes */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="w-5 h-5 bg-gray-200 rounded" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
};

export default SkeletonCard;

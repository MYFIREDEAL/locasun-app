import React from 'react';

/**
 * Skeleton Card - Animation de chargement pour les cartes de prospect
 * Style moderne avec animation pulse (gris clair → gris foncé)
 */
const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse">
      {/* Header avec avatar + nom */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-3">
        <div className="h-6 bg-gray-200 rounded-full w-16" />
        <div className="h-6 bg-gray-200 rounded-full w-20" />
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

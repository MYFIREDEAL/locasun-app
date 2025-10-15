import React, { useState } from 'react';
import { useAppContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

const SimplePipeline = () => {
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🏢 Pipeline - Gestion des Prospects
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">
              📞 Nouveaux Contacts
            </h2>
            <div className="text-blue-600">
              <p>Aucun prospect pour le moment</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-800 mb-3">
              🤝 En Négociation
            </h2>
            <div className="text-yellow-600">
              <p>Aucun prospect pour le moment</p>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-green-800 mb-3">
              ✅ Conclus
            </h2>
            <div className="text-green-600">
              <p>Aucun prospect pour le moment</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Info:</strong> Version simplifiée du Pipeline. 
            L'interface complète sera restaurée une fois le problème de contexte résolu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimplePipeline;
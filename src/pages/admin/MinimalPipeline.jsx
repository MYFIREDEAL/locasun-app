import React from 'react';
import { useAppContext } from '@/App';

const MinimalPipeline = () => {
  try {
    const { prospects = [] } = useAppContext();
    
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Pipeline Minimal</h1>
        <div className="bg-white p-4 rounded-lg shadow">
          <p>Nombre de prospects : {prospects.length}</p>
          <div className="mt-4">
            {prospects.slice(0, 3).map(prospect => (
              <div key={prospect.id} className="p-2 border-b">
                {prospect.name} - {prospect.email}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          ✅ Si vous voyez cette page, le contexte fonctionne.<br/>
          Le problème vient d'un composant spécifique du Pipeline original.
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">❌ Erreur Pipeline</h1>
        <p className="text-red-500">Erreur: {error.message}</p>
      </div>
    );
  }
};

export default MinimalPipeline;
import React from 'react';
import { useAppContext } from '@/App';
import { motion } from 'framer-motion';
import { DndContext, closestCenter } from '@dnd-kit/core';
// Test du composant ProspectCard (suspect principal)
import ProspectCard from '@/components/admin/ProspectCard';

const TestComposantProspectCard = () => {
  console.log('🃏 TestComposantProspectCard: Test ProspectCard');

  const { prospects = [] } = useAppContext();
  
  // Prospect de test
  const testProspect = {
    id: 'test-1',
    name: 'Test Prospect',
    email: 'test@example.com',
    phone: '01 23 45 67 89',
    status: 'new',
    project: 'Test Project'
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-6">
          🃏 Test Composant ProspectCard
        </h1>
        
        <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">✅ SUCCÈS - Jusqu'ici</p>
          <p>ProspectCard s'importe sans problème !</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">🃏 Test d'affichage ProspectCard</p>
          <div className="mt-4 max-w-xs">
            <ProspectCard 
              prospect={testProspect}
              onClick={() => console.log('Prospect clicked')}
            />
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">🔍 Résultat :</p>
          <p>Si vous voyez cette page ET la ProspectCard ci-dessus, alors ProspectCard fonctionne !</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Test effectué à : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestComposantProspectCard;
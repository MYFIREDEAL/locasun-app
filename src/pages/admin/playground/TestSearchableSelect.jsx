import React from 'react';
import { useAppContext } from '@/App';
// Test de SearchableSelect (suspect suivant)
import SearchableSelect from '@/components/ui/SearchableSelect';

const TestSearchableSelect = () => {
  console.log('🔍 TestSearchableSelect: Test SearchableSelect');

  const { users = {}, projectsData = {} } = useAppContext();

  const testOptions = [
    { value: '', label: 'Tous les projets' },
    { value: 'test1', label: 'Test 1' },
    { value: 'test2', label: 'Test 2' }
  ];

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-600 mb-6">
          🔍 Test SearchableSelect
        </h1>
        
        <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">✅ SUCCÈS - Import</p>
          <p>SearchableSelect s'importe sans problème !</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">🔍 Test d'affichage SearchableSelect</p>
          <div className="mt-4 max-w-xs">
            <SearchableSelect
              options={testOptions}
              value=""
              onSelect={(value) => console.log('Selected:', value)}
              placeholder="Choisir un projet"
              searchPlaceholder="Rechercher..."
              emptyText="Aucun projet."
            />
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">🔍 Résultat :</p>
          <p>Si vous voyez cette page ET le SearchableSelect ci-dessus, alors SearchableSelect fonctionne !</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Test effectué à : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestSearchableSelect;
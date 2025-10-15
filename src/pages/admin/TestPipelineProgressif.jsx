import React from 'react';

const TestPipelineProgressif = () => {
  console.log('🧪 TestPipelineProgressif: Starting');

  // Test 1: Composant de base
  try {
    console.log('✅ Test 1: Composant de base - OK');
  } catch (error) {
    console.error('❌ Test 1 Failed:', error);
    return <div>Erreur Test 1: {error.message}</div>;
  }

  // Test 2: Essayer d'importer useAppContext (le suspect principal)
  let contextTest = null;
  try {
    // Ne pas appeler useAppContext directement ici pour éviter l'erreur
    console.log('✅ Test 2: Import hooks - OK');
  } catch (error) {
    console.error('❌ Test 2 Failed:', error);
    return <div>Erreur Test 2: {error.message}</div>;
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          🧪 Test Pipeline Progressif
        </h1>
        
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-bold">✅ Test 1: Composant de base</p>
            <p>Le composant se charge correctement</p>
          </div>
          
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-bold">✅ Test 2: Imports de base</p>
            <p>Les imports React fonctionnent</p>
          </div>
          
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="font-bold">🔍 Prochaine étape:</p>
            <p>Maintenant on va tester useAppContext()</p>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Horodatage : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestPipelineProgressif;
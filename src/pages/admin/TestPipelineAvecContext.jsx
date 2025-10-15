import React from 'react';
import { useAppContext } from '@/App';

const TestPipelineAvecContext = () => {
  console.log('🧪 TestPipelineAvecContext: Starting');

  // Test 1: Composant de base
  let test1Status = "✅ OK";
  let test1Message = "Composant de base fonctionne";

  // Test 2: useAppContext
  let test2Status = "❌ ERREUR";
  let test2Message = "useAppContext a échoué";
  let contextData = null;

  try {
    contextData = useAppContext();
    test2Status = "✅ OK";
    test2Message = "useAppContext fonctionne";
    console.log('✅ Test 2: useAppContext - OK', contextData);
  } catch (error) {
    console.error('❌ Test 2 Failed:', error);
    test2Message = `useAppContext erreur: ${error.message}`;
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-600 mb-4">
          🧪 Test Pipeline AVEC Context
        </h1>
        
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-bold">{test1Status} Test 1: Composant de base</p>
            <p>{test1Message}</p>
          </div>
          
          <div className={`px-4 py-3 rounded border ${
            test2Status === "✅ OK" 
              ? "bg-green-100 border-green-400 text-green-700"
              : "bg-red-100 border-red-400 text-red-700"
          }`}>
            <p className="font-bold">{test2Status} Test 2: useAppContext</p>
            <p>{test2Message}</p>
            {contextData && (
              <div className="mt-2 text-sm">
                <p>Données context disponibles: {Object.keys(contextData).join(', ')}</p>
              </div>
            )}
          </div>
          
          {test2Status === "✅ OK" && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="font-bold">🔍 Prochaine étape:</p>
              <p>useAppContext fonctionne ! Le problème est ailleurs dans Pipeline.</p>
            </div>
          )}
          
          {test2Status === "❌ ERREUR" && (
            <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
              <p className="font-bold">🔍 Problème identifié:</p>
              <p>useAppContext ne fonctionne pas. C'est la cause de la page blanche.</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Horodatage : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestPipelineAvecContext;
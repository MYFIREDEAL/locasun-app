import React from 'react';
import { useAppContext } from '@/App';

const TestContextDirect = () => {
  console.log('🎯 TestContextDirect: Démarrage du test useAppContext');

  let status = "❌ ÉCHEC";
  let message = "useAppContext a échoué";
  let contextInfo = null;

  try {
    const context = useAppContext();
    status = "✅ SUCCÈS";
    message = `useAppContext fonctionne ! Données disponibles: ${Object.keys(context || {}).length} propriétés`;
    contextInfo = context;
    console.log('✅ useAppContext OK:', context);
  } catch (error) {
    console.error('❌ useAppContext ERREUR:', error);
    message = `Erreur useAppContext: ${error.message}`;
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-red-600 mb-6">
          🎯 Test Direct useAppContext
        </h1>
        
        <div className={`p-6 rounded-lg border-2 mb-6 ${
          status === "✅ SUCCÈS" 
            ? "bg-green-50 border-green-500 text-green-800"
            : "bg-red-50 border-red-500 text-red-800"
        }`}>
          <h2 className="text-2xl font-bold mb-2">{status}</h2>
          <p className="text-lg">{message}</p>
          
          {contextInfo && (
            <div className="mt-4 p-4 bg-white rounded border">
              <h3 className="font-bold mb-2">Propriétés du contexte :</h3>
              <ul className="list-disc list-inside text-sm">
                {Object.keys(contextInfo).map(key => (
                  <li key={key}>
                    <span className="font-mono">{key}</span>: {typeof contextInfo[key]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {status === "✅ SUCCÈS" && (
          <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <p className="font-bold">🔍 Conclusion :</p>
            <p>useAppContext fonctionne ! Le problème de Pipeline est ailleurs (probablement dans les imports ou composants utilisés).</p>
          </div>
        )}
        
        {status === "❌ ÉCHEC" && (
          <div className="bg-orange-50 border border-orange-400 text-orange-700 px-4 py-3 rounded">
            <p className="font-bold">🔍 Problème identifié :</p>
            <p>useAppContext ne fonctionne pas. C'est LA cause de la page blanche dans Pipeline.</p>
          </div>
        )}
        
        <div className="mt-8 text-sm text-gray-500">
          Test effectué à : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestContextDirect;
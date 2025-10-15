import React from 'react';

const DiagnosticSimple = () => {
  console.log('🚀 DiagnosticSimple: Component is rendering');
  
  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          ✅ Admin Layout Fonctionne !
        </h1>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Diagnostic réussi :</p>
          <ul className="list-disc list-inside mt-2">
            <li>AdminLayout charge correctement</li>
            <li>Routing fonctionne</li>
            <li>React rend le composant</li>
            <li>Tailwind CSS appliqué</li>
          </ul>
        </div>
        
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <p className="font-bold">Prochaines étapes :</p>
          <p>Maintenant nous pouvons tester progressivement les composants plus complexes.</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Horodatage : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticSimple;
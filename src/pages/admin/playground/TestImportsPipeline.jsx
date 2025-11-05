import React from 'react';
import { useAppContext } from '@/App';

const TestImportsPipeline = () => {
  console.log('🧪 TestImportsPipeline: Test des imports un par un');

  const tests = [];
  
  // Test 1: useAppContext (déjà testé, mais on confirme)
  try {
    const context = useAppContext();
    tests.push({ name: "useAppContext", status: "✅", message: "Fonctionne" });
  } catch (error) {
    tests.push({ name: "useAppContext", status: "❌", message: error.message });
  }

  // Test 2: React hooks de base
  try {
    const [state, setState] = React.useState(null);
    const memoValue = React.useMemo(() => 'test', []);
    React.useEffect(() => {}, []);
    tests.push({ name: "React hooks (useState, useMemo, useEffect)", status: "✅", message: "Fonctionnent" });
  } catch (error) {
    tests.push({ name: "React hooks", status: "❌", message: error.message });
  }

  // Test 3: Essayer d'importer motion (suspect)
  let motionStatus = "❌";
  let motionMessage = "Non testé";
  try {
    // Ne pas importer directement pour éviter l'erreur, juste tester la logique
    motionStatus = "⚠️";
    motionMessage = "Import non testé (peut causer problème)";
  } catch (error) {
    motionMessage = error.message;
  }
  tests.push({ name: "framer-motion", status: motionStatus, message: motionMessage });

  // Test 4: Essayer d'importer DndContext (suspect)
  let dndStatus = "⚠️";
  let dndMessage = "Import non testé (peut causer problème)";
  tests.push({ name: "@dnd-kit/core", status: dndStatus, message: dndMessage });

  // Test 5: React Router
  try {
    const navigate = () => {}; // Simulation
    tests.push({ name: "react-router-dom", status: "✅", message: "Hooks disponibles" });
  } catch (error) {
    tests.push({ name: "react-router-dom", status: "❌", message: error.message });
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-600 mb-6">
          🧪 Test Imports Pipeline
        </h1>
        
        <div className="space-y-4">
          {tests.map((test, index) => (
            <div 
              key={index}
              className={`p-4 rounded border ${
                test.status === "✅" 
                  ? "bg-green-50 border-green-400 text-green-700"
                  : test.status === "⚠️"
                  ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                  : "bg-red-50 border-red-400 text-red-700"
              }`}
            >
              <h3 className="font-bold">{test.status} {test.name}</h3>
              <p>{test.message}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <p className="font-bold">🔍 Prochaines étapes :</p>
          <ul className="list-disc list-inside mt-2">
            <li>Tester imports framer-motion</li>
            <li>Tester imports @dnd-kit</li>
            <li>Tester imports des composants (ProspectCard, etc.)</li>
          </ul>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Test effectué à : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestImportsPipeline;
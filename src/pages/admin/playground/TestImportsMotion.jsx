import React from 'react';
import { useAppContext } from '@/App';
// Test des imports suspects un par un

// Import 1: motion (suspect principal)
import { motion, AnimatePresence } from 'framer-motion';

const TestImportsMotion = () => {
  console.log('🎬 TestImportsMotion: Test framer-motion');

  const { prospects = [] } = useAppContext();

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-green-600 mb-6">
          🎬 Test Import Motion
        </h1>
        
        <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">✅ SUCCÈS</p>
          <p>framer-motion s'importe sans problème !</p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4"
        >
          <p className="font-bold">🎭 Animation Motion</p>
          <p>Cette div utilise framer-motion et s'anime !</p>
        </motion.div>
        
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">🔍 Prochaine étape :</p>
          <p>framer-motion fonctionne. Testons @dnd-kit maintenant.</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Test effectué à : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestImportsMotion;
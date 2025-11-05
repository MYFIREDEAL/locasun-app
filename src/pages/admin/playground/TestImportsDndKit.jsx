import React from 'react';
import { useAppContext } from '@/App';
// Test des imports @dnd-kit (suspect principal)
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const TestImportsDndKit = () => {
  console.log('🎯 TestImportsDndKit: Test @dnd-kit');

  const { prospects = [] } = useAppContext();

  const handleDragEnd = (event) => {
    console.log('Drag ended:', event);
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-orange-600 mb-6">
          🎯 Test Import @dnd-kit
        </h1>
        
        <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">✅ SUCCÈS</p>
          <p>@dnd-kit s'importe sans problème !</p>
        </div>
        
        <DndContext 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">🎯 DndContext</p>
            <p>Ce composant utilise DndContext et fonctionne !</p>
            
            <SortableContext 
              items={['item1', 'item2']} 
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-2">
                <div className="bg-white p-2 rounded border">
                  📋 Item 1 (dans SortableContext)
                </div>
                <div className="bg-white p-2 rounded border">
                  📋 Item 2 (dans SortableContext)
                </div>
              </div>
            </SortableContext>
          </div>
        </DndContext>
        
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">🔍 Prochaine étape :</p>
          <p>@dnd-kit fonctionne. Testons maintenant les composants (ProspectCard, etc.)</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Test effectué à : {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default TestImportsDndKit;
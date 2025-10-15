import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/App';
import ProspectCard from '@/components/admin/ProspectCard';
import { motion } from 'framer-motion';
import { DndContext } from '@dnd-kit/core';

const ProgressivePipeline = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  const TestStep = ({ stepNumber, title, testFunction, children }) => {
    if (step < stepNumber) {
      return (
        <div className="bg-gray-100 p-4 rounded mb-4">
          <p className="text-gray-600">⏳ Étape {stepNumber}: {title} (en attente)</p>
        </div>
      );
    }

    if (step === stepNumber) {
      try {
        testFunction?.();
        return (
          <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
            <p className="text-green-800 mb-2">✅ Étape {stepNumber}: {title} (OK)</p>
            {children}
            <button 
              onClick={() => setStep(step + 1)}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Étape suivante
            </button>
          </div>
        );
      } catch (err) {
        return (
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
            <p className="text-red-800 mb-2">❌ Étape {stepNumber}: {title} (ERREUR)</p>
            <p className="text-red-600 text-sm">Erreur: {err.message}</p>
            <button 
              onClick={() => setStep(step + 1)}
              className="mt-2 bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
            >
              Ignorer et continuer
            </button>
          </div>
        );
      }
    }

    return (
      <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
        <p className="text-blue-800">✅ Étape {stepNumber}: {title} (complétée)</p>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🔧 Diagnostic Pipeline Progressif
        </h1>

        <TestStep stepNumber={1} title="Interface de base">
          <p className="text-sm text-green-700">Interface basique avec titre et bouton</p>
        </TestStep>

        <TestStep 
          stepNumber={2} 
          title="Import useAppContext"
          testFunction={() => {
            // Tester si useAppContext est disponible
            if (!useAppContext) throw new Error('useAppContext non trouvé');
          }}
        >
          <p className="text-sm text-green-700">Import du contexte réussi</p>
        </TestStep>

        <TestStep 
          stepNumber={3} 
          title="Utilisation du contexte"
          testFunction={() => {
            // Utiliser le contexte importé
            // Test sera fait dans le rendu
          }}
        >
          <ContextTest />
        </TestStep>

        <TestStep 
          stepNumber={4} 
          title="Import ProspectCard"
          testFunction={() => {
            // ProspectCard est déjà importé
            if (!ProspectCard) throw new Error('ProspectCard non trouvé');
          }}
        >
          <p className="text-sm text-green-700">ProspectCard importé</p>
        </TestStep>

        <TestStep 
          stepNumber={5} 
          title="Import Framer Motion"
          testFunction={() => {
            // motion est déjà importé
            if (!motion) throw new Error('Framer Motion non trouvé');
          }}
        >
          <p className="text-sm text-green-700">Framer Motion OK</p>
        </TestStep>

        <TestStep 
          stepNumber={6} 
          title="Import DnD Kit"
          testFunction={() => {
            // DndContext est déjà importé
            if (!DndContext) throw new Error('DnD Kit non trouvé');
          }}
        >
          <p className="text-sm text-green-700">DnD Kit OK</p>
        </TestStep>

        <TestStep stepNumber={7} title="Pipeline final">
          <FinalPipelineTest />
        </TestStep>

        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            <strong>Objectif:</strong> Identifier exactement quelle dépendance cause le problème dans Pipeline.
          </p>
        </div>
      </div>
    </div>
  );
};

const ContextTest = () => {
  try {
    const context = useAppContext();
    return (
      <div className="text-sm text-green-700">
        <p>Contexte récupéré avec succès</p>
        <p>Prospects: {context?.prospects?.length || 0}</p>
        <p>Utilisateur actif: {context?.activeAdminUser?.name || 'Non défini'}</p>
      </div>
    );
  } catch (err) {
    return (
      <div className="text-sm text-red-700">
        <p>Erreur contexte: {err.message}</p>
      </div>
    );
  }
};

const FinalPipelineTest = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded p-3">
          <h3 className="font-medium text-blue-800">Nouveaux</h3>
          <div className="mt-2 space-y-2">
            <div className="bg-white rounded p-2 text-sm">
              <p className="font-medium">Jean Dupont</p>
              <p className="text-gray-600">Dupont SA</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded p-3">
          <h3 className="font-medium text-yellow-800">Qualifiés</h3>
          <div className="mt-2 space-y-2">
            <div className="bg-white rounded p-2 text-sm">
              <p className="font-medium">Marie Martin</p>
              <p className="text-gray-600">Martin & Co</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded p-3">
          <h3 className="font-medium text-green-800">Conclus</h3>
          <div className="mt-2 space-y-2">
            <div className="bg-white rounded p-2 text-sm">
              <p className="font-medium">Pierre Durand</p>
              <p className="text-gray-600">Tech Corp</p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-green-700">Interface Pipeline simulée fonctionnelle !</p>
    </div>
  );
};

export default ProgressivePipeline;
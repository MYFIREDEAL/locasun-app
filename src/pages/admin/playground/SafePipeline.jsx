import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/App';

const SafePipeline = () => {
  const [error, setError] = useState(null);

  // Récupérer le contexte correctement (au niveau racine du composant)
  let contextData = null;
  try {
    contextData = useAppContext();
  } catch (err) {
    // Si le contexte échoue, afficher l'erreur
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-800 mb-2">❌ Erreur de Contexte</h1>
          <p className="text-red-700 mb-4">Erreur: {err.message}</p>
          <p className="text-sm text-red-600">
            Le contexte de l'application n'est pas disponible. Vérifiez que le composant est bien dans AppContext.Provider.
          </p>
        </div>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-yellow-800 mb-2">⏳ Chargement...</h1>
          <p className="text-yellow-700">Récupération des données du contexte...</p>
        </div>
      </div>
    );
  }

  const { prospects = [], users = {}, activeAdminUser } = contextData;

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            🏢 Pipeline - Gestion des Prospects
          </h1>
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Ajouter un prospect
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-4">
              📞 Nouveaux Contacts ({prospects?.filter(p => p.status === 'lead')?.length || 0})
            </h2>
            <div className="space-y-2">
              {prospects?.filter(p => p.status === 'lead')?.map(prospect => (
                <div key={prospect.id} className="bg-white rounded p-3 shadow-sm">
                  <h3 className="font-medium text-gray-800">{prospect.name}</h3>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-gray-500">{prospect.email}</p>
                </div>
              )) || <p className="text-blue-600">Aucun nouveau contact</p>}
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-800 mb-4">
              🤝 En Négociation ({prospects?.filter(p => p.status === 'qualified')?.length || 0})
            </h2>
            <div className="space-y-2">
              {prospects?.filter(p => p.status === 'qualified')?.map(prospect => (
                <div key={prospect.id} className="bg-white rounded p-3 shadow-sm">
                  <h3 className="font-medium text-gray-800">{prospect.name}</h3>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-gray-500">{prospect.email}</p>
                </div>
              )) || <p className="text-yellow-600">Aucune négociation en cours</p>}
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-green-800 mb-4">
              ✅ Conclus ({prospects?.filter(p => p.status === 'converted')?.length || 0})
            </h2>
            <div className="space-y-2">
              {prospects?.filter(p => p.status === 'converted')?.map(prospect => (
                <div key={prospect.id} className="bg-white rounded p-3 shadow-sm">
                  <h3 className="font-medium text-gray-800">{prospect.name}</h3>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-gray-500">{prospect.email}</p>
                </div>
              )) || <p className="text-green-600">Aucun prospect converti</p>}
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">📊 Informations de Debug</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Nombre total de prospects: {prospects?.length || 0}</p>
            <p>• Utilisateur actif: {activeAdminUser?.name || 'Non défini'}</p>
            <p>• Nombre d'utilisateurs: {Object.keys(users).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafePipeline;
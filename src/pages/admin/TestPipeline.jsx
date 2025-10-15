import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/App';

const TestPipeline = () => {
  // On récupère le contexte et les paramètres URL
  const { prospects, projectsData, users, activeAdminUser } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProspect, setSelectedProspect] = useState(null);
  
  // Création de la liste des projets
  const projectOptions = useMemo(() => {
    if (!projectsData) return [];
    return Object.entries(projectsData).map(([key, project]) => ({ 
      value: key, 
      label: project.title 
    }));
  }, [projectsData]);

  // Projet sélectionné depuis l'URL
  const selectedProjectType = searchParams.get('project') || (projectOptions.length > 0 ? projectOptions[0].value : '');

  // Fonction pour mettre à jour les paramètres URL
  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Pipeline - Test Étape 3</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <p>✅ Pipeline de test - Le composant fonctionne.</p>
        <p>✅ Contexte récupéré - OK</p>
        <p>✅ Sélection de projet ajoutée</p>
        
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">📊 Données du contexte :</h3>
          <ul className="space-y-1 text-sm">
            <li>🏢 Prospects: {prospects ? prospects.length : 'non défini'}</li>
            <li>📁 Projets: {projectsData ? Object.keys(projectsData).length : 'non défini'}</li>
            <li>👥 Utilisateurs: {users ? Object.keys(users).length : 'non défini'}</li>
            <li>👤 Admin actif: {activeAdminUser ? activeAdminUser.name : 'non défini'}</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">🎯 Sélection de projet :</h3>
          <div className="flex items-center gap-4">
            <label className="font-medium">Projet:</label>
            <select 
              value={selectedProjectType} 
              onChange={(e) => updateQueryParam('project', e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="">Choisir un projet</option>
              {projectOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Projet sélectionné: {selectedProjectType || 'Aucun'}
          </p>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">🟦 Colonnes du projet sélectionné :</h3>
          <div className="flex gap-4 flex-wrap">
            {(projectsData && selectedProjectType && projectsData[selectedProjectType]?.steps) ? (
              projectsData[selectedProjectType].steps.map((step, idx) => (
                <div key={idx} className="bg-gray-100 rounded-lg px-4 py-2 mb-2 shadow text-gray-800">
                  <span className="font-semibold">{step.name}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500">Aucune colonne trouvée pour ce projet.</span>
            )}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">📦 Prospects par colonne (logique originale) :</h3>
          <div className="flex gap-4 flex-wrap">
            {(projectsData && selectedProjectType && projectsData[selectedProjectType]?.steps) ? (
              projectsData[selectedProjectType].steps.map((step, idx) => {
                const prospectsForStep = (prospects || []).filter(p => {
                  if (!p.tags || !p.tags.includes(selectedProjectType)) return false;
                  if (!p.id || !projectsData[selectedProjectType]) return false;
                  if (!p.id || typeof getProjectSteps !== 'function') return false;
                  const prospectSteps = getProjectSteps(p.id, selectedProjectType);
                  if (!prospectSteps) return false;
                  const currentStep = prospectSteps.find(s => s.status === 'in_progress' || s.status === 'current');
                  return currentStep && currentStep.name === step.name;
                });
                return (
                  <div key={idx} className="bg-gray-100 rounded-lg px-4 py-2 mb-2 shadow text-gray-800 min-w-[220px]">
                    <span className="font-semibold">{step.name}</span>
                    <div className="mt-2 space-y-2">
                      {prospectsForStep.length > 0 ? prospectsForStep.map(prospect => (
                        <div key={prospect.id} className="bg-white rounded p-2 shadow text-xs cursor-pointer hover:bg-blue-50"
                          onClick={() => setSelectedProspect(prospect)}>
                          <span className="font-bold">{prospect.name}</span> <span className="text-gray-500">({prospect.email})</span>
                          <div className="text-gray-600">Statut: {prospect.status}</div>
                        </div>
                      )) : (
                        <div className="text-gray-400 italic">Aucun prospect</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-gray-500">Aucune colonne trouvée pour ce projet.</span>
            )}
          </div>
        </div>

        {selectedProspect && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
              <button onClick={() => setSelectedProspect(null)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <h2 className="text-xl font-bold mb-4">Suivi du projet prospect</h2>
              <div className="flex gap-6 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Activité en cours</h3>
                  <div className="bg-gray-50 rounded p-3 text-sm mb-2">
                    {/* Placeholder activité, à remplacer par la vraie logique */}
                    <div><strong>Statut:</strong> {selectedProspect.status}</div>
                    <div><strong>Tags:</strong> {selectedProspect.tags ? selectedProspect.tags.join(', ') : '-'}</div>
                    <div><strong>Entreprise:</strong> {selectedProspect.company}</div>
                    <div><strong>Adresse:</strong> {selectedProspect.address}</div>
                    <div className="mt-2 text-blue-600">RDV à venir, documents, etc.</div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Chat centrale</h3>
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <div className="italic text-gray-400">Zone de chat (à intégrer)</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500">Espace pro pour communiquer avec le client, afficher les activités, RDV, documents, etc.</div>
            </div>
          </div>
        )}
        
        <div className="border-t pt-4">
          <p>🔄 Prochaine étape : Afficher les colonnes du projet sélectionné.</p>
        </div>
      </div>
    </div>
  );
};

export default TestPipeline;
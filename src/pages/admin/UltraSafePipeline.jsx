import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/App';
import { slugify } from '@/lib/utils';

const UltraSafePipeline = () => {
  const { prospects, projectsData, getProjectSteps, activeAdminUser } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [columns, setColumns] = useState({});
  const [selectedProspect, setSelectedProspect] = useState(null);

  const projectOptions = useMemo(() => 
    Object.entries(projectsData || {}).map(([key, project]) => ({ value: key, label: project.title }))
  , [projectsData]);

  const selectedProjectType = searchParams.get('project') || (projectOptions.length > 0 ? projectOptions[0].value : '');
  const selectedProspectId = searchParams.get('prospect');

  useEffect(() => {
    const prospectFromParam = (prospects || []).find(p => p.id === selectedProspectId);
    setSelectedProspect(prospectFromParam || null);
  }, [selectedProspectId, prospects]);

  useEffect(() => {
    if (!selectedProjectType || !projectsData || !projectsData[selectedProjectType]) {
      setColumns({});
      return;
    }

    try {
      const projectSteps = projectsData[selectedProjectType].steps || [];
      const newColumns = projectSteps.reduce((acc, step) => {
        acc[slugify(step.name)] = { name: step.name, items: [] };
        return acc;
      }, {});
      
      const filteredProspects = (prospects || []).filter(prospect => 
        prospect.tags && prospect.tags.includes(selectedProjectType)
      );

      filteredProspects.forEach(prospect => {
        try {
          const prospectSteps = getProjectSteps ? getProjectSteps(prospect.id, selectedProjectType) : [];
          const currentStep = prospectSteps.find(step => step.status === 'in_progress' || step.status === 'current');
          
          if (currentStep) {
            const columnKey = slugify(currentStep.name);
            if (newColumns[columnKey]) {
              newColumns[columnKey].items.push(prospect);
            }
          }
        } catch (e) {
          console.warn('Error processing prospect:', prospect.id, e);
        }
      });

      setColumns(newColumns);
    } catch (e) {
      console.error('Error setting up columns:', e);
      setColumns({});
    }
  }, [prospects, selectedProjectType, projectsData, getProjectSteps]);

  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleProspectClick = (prospect) => {
    updateQueryParam('prospect', prospect.id);
  };

  const handleBack = () => {
    updateQueryParam('prospect', null);
  };

  if (selectedProspect) {
    return (
      <div className="p-6">
        <button 
          onClick={handleBack} 
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ← Retour à la Pipeline
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">{selectedProspect.name}</h1>
          <div className="space-y-2">
            <p><strong>Email:</strong> {selectedProspect.email}</p>
            <p><strong>Téléphone:</strong> {selectedProspect.phone}</p>
            <p><strong>Statut:</strong> {selectedProspect.status}</p>
            {selectedProspect.tags && (
              <p><strong>Tags:</strong> {selectedProspect.tags.join(', ')}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
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
        
        <button 
          onClick={() => alert('Fonctionnalité d\'ajout de prospect à venir')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Nouveau Prospect
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.entries(columns).map(([columnId, column]) => (
          <div key={columnId} className="bg-gray-100 rounded-xl p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex justify-between items-center">
              {column.name}
              <span className="text-sm font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                {column.items.length}
              </span>
            </h2>
            <div className="space-y-4 overflow-y-auto flex-1">
              {column.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProspectClick(item)}
                >
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.phone}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(columns).length === 0 && selectedProjectType && (
        <div className="text-center text-gray-500 mt-8">
          <p>Aucune colonne trouvée pour ce projet.</p>
          <p className="text-sm">Vérifiez la configuration du projet.</p>
        </div>
      )}
    </div>
  );
};

export default UltraSafePipeline;
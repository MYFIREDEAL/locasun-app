import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Phone, Mail } from 'lucide-react';

const WorkingPipelineMinimal = () => {
  const [prospects] = useState([
    { id: '1', name: 'Jean Dupont', company: 'Dupont SA', email: 'jean@dupont.com', status: 'lead' },
    { id: '2', name: 'Marie Martin', company: 'Martin & Co', email: 'marie@martin.com', status: 'qualified' },
    { id: '3', name: 'Pierre Durand', company: 'Durand Industries', email: 'pierre@durand.com', status: 'opportunity' }
  ]);

  const columns = [
    { id: 'lead', name: 'Nouveaux Prospects', status: 'lead' },
    { id: 'qualified', name: 'Qualifiés', status: 'qualified' },
    { id: 'opportunity', name: 'Opportunité', status: 'opportunity' },
    { id: 'closed', name: 'Conclus', status: 'closed' }
  ];

  const getProspectsByStatus = (status) => prospects.filter(p => p.status === status);

  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🚀 Pipeline NOUVEAU</h1>
          <p className="text-gray-600">Version déployée à {new Date().toLocaleTimeString()}</p>
        </div>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus size={16} />
          Ajouter un prospect
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {columns.map((column) => {
          const columnProspects = getProspectsByStatus(column.status);
          return (
            <div key={column.id} className="bg-gray-100 rounded-xl p-4 flex flex-col">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex justify-between items-center">
                {column.name}
                <span className="text-sm font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                  {columnProspects.length}
                </span>
              </h2>
              
              <div className="space-y-4 overflow-y-auto flex-1">
                {columnProspects.map((prospect) => (
                  <div key={prospect.id} className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-semibold text-gray-800 mb-1">{prospect.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{prospect.company}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                          <Phone size={14} />
                        </button>
                        <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                          <Mail size={14} />
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">#{prospect.id}</span>
                    </div>
                  </div>
                ))}
                
                {columnProspects.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-sm">Aucun prospect</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkingPipelineMinimal;
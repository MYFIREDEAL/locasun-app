import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, Phone } from 'lucide-react';

const WorkingPipeline = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pipeline</h1>
            <p className="text-gray-600 mt-1">Gérez vos prospects et opportunités</p>
          </div>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus size={16} />
            Nouveau prospect
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Phone className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-blue-600 font-medium">Nouveaux</p>
                <p className="text-2xl font-bold text-blue-800">12</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="text-yellow-600" size={20} />
              <div>
                <p className="text-sm text-yellow-600 font-medium">Qualifiés</p>
                <p className="text-2xl font-bold text-yellow-800">8</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-orange-600" size={20} />
              <div>
                <p className="text-sm text-orange-600 font-medium">Négociation</p>
                <p className="text-2xl font-bold text-orange-800">5</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Conclus</p>
                <p className="text-2xl font-bold text-green-800">15</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Nouveaux Contacts */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Phone size={16} />
              Nouveaux Contacts
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Jean Dupont', company: 'Dupont SA', value: '15K€' },
                { name: 'Marie Martin', company: 'Martin & Co', value: '22K€' },
                { name: 'Pierre Durand', company: 'Tech Corp', value: '8K€' }
              ].map((prospect, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-500">
                  <h4 className="font-medium text-gray-800">{prospect.name}</h4>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">{prospect.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Qualifiés */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users size={16} />
              Qualifiés
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Sophie Laurent', company: 'Laurent SARL', value: '35K€' },
                { name: 'Marc Rousseau', company: 'Rousseau Industries', value: '28K€' }
              ].map((prospect, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-yellow-500">
                  <h4 className="font-medium text-gray-800">{prospect.name}</h4>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-yellow-600 font-medium mt-1">{prospect.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* En Négociation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Calendar size={16} />
              En Négociation
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Claire Moreau', company: 'Moreau Group', value: '45K€' }
              ].map((prospect, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-orange-500">
                  <h4 className="font-medium text-gray-800">{prospect.name}</h4>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-orange-600 font-medium mt-1">{prospect.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conclus */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              Conclus
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Antoine Dubois', company: 'Dubois & Fils', value: '52K€' },
                { name: 'Lucie Bernard', company: 'Bernard Tech', value: '31K€' }
              ].map((prospect, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-green-500">
                  <h4 className="font-medium text-gray-800">{prospect.name}</h4>
                  <p className="text-sm text-gray-600">{prospect.company}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">{prospect.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>✅ Pipeline fonctionnel !</strong> Interface administrative opérationnelle avec données de test.
            L'intégration complète avec le contexte sera restaurée progressivement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkingPipeline;
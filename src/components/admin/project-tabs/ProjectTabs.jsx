import React, { useState } from 'react';
import { FileText, Activity, FolderOpen } from 'lucide-react';
import NotesTab from './NotesTab';
import ActivityTab from './ActivityTab';
import FilesTab from './FilesTab';

const ProjectTabs = ({ prospectId, projectType }) => {
  const [activeTab, setActiveTab] = useState('notes');

  const tabs = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'activity', label: 'Activité', icon: Activity },
    { id: 'files', label: 'Fichiers', icon: FolderOpen },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all
                border-b-2 -mb-px
                ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Content */}
      <div className="min-h-[200px]">
        {activeTab === 'notes' && <NotesTab prospectId={prospectId} projectType={projectType} />}
        {activeTab === 'activity' && <ActivityTab prospectId={prospectId} projectType={projectType} />}
        {activeTab === 'files' && <FilesTab prospectId={prospectId} projectType={projectType} />}
      </div>
    </div>
  );
};

export default ProjectTabs;

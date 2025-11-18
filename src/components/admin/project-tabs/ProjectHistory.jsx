import React from 'react';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';

const ProjectHistory = ({ projectId, prospectId }) => {
  const {
    history,
    loading,
    error,
  } = useSupabaseProjectHistory({
    projectId,
    prospectId,
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="bg-white border rounded-xl p-4">
        <p className="text-sm text-gray-400">Sélectionnez un projet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-4">Historique du projet</h3>

      {loading && (
        <p className="text-xs text-gray-400">Chargement de l'historique…</p>
      )}

      {error && (
        <p className="text-xs text-red-500">Erreur : {error}</p>
      )}

      {!loading && history.length === 0 && (
        <p className="text-xs text-gray-400">Aucun événement pour ce projet.</p>
      )}

      <div className="flex flex-col gap-6">
        {history.map((event) => (
          <div key={event.id} className="relative pl-6">
            
            {/* Pastille */}
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-indigo-600"></div>

            {/* Contenu */}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-gray-800">
                {event.title || event.event_type}
              </p>

              {event.description && (
                <p className="text-xs text-gray-600">{event.description}</p>
              )}

              <p className="text-[10px] text-gray-400">
                {new Date(event.created_at).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectHistory;

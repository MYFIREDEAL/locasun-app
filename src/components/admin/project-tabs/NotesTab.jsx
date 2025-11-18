import { useState } from "react";
import { useSupabaseProjectNotes } from "@/hooks/useSupabaseProjectNotes";
import { useSupabaseProjectHistory } from "@/hooks/useSupabaseProjectHistory";

export default function NotesTab({ projectType, prospectId, currentUser }) {
  const [noteContent, setNoteContent] = useState("");

  const {
    notes,
    loading,
    saving,
    error,
    addNote,
  } = useSupabaseProjectNotes({
    projectType,
    prospectId,
    enabled: !!projectType,
  });

  const { addHistoryEvent } = useSupabaseProjectHistory({
    projectType,
    prospectId,
    enabled: !!projectType,
  });

  const handleSave = async () => {
    if (!noteContent.trim()) return;
    try {
      const newNote = await addNote({
        content: noteContent,
        createdBy: currentUser?.id,
        createdByName: currentUser?.email || currentUser?.full_name,
      });

      if (newNote && addHistoryEvent) {
        await addHistoryEvent({
          event_type: "note",
          title: "Note ajoutée",
          description: newNote.content || noteContent.trim(),
          metadata: {
            source: "notes_tab",
          },
          createdBy: currentUser?.id,
          createdByName: currentUser?.email || currentUser?.full_name,
        });
      }

      setNoteContent("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* Bloc d'édition */}
      <div className="bg-white rounded-xl border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Notes internes du projet
            </h3>
            <span className="text-xs text-gray-400">
              {projectType ? `Projet ${projectType}` : "Aucun projet sélectionné"}
            </span>
          </div>

          <textarea
            className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
            placeholder="Ajoute une note interne liée à ce projet…"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            disabled={!projectType || saving}
          />        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button type="button" className="flex items-center gap-1 hover:text-gray-700">
              <span>🖼️</span>
              <span>Image</span>
            </button>
            <button type="button" className="flex items-center gap-1 hover:text-gray-700">
              <span>@</span>
              <span>Mention</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!noteContent.trim() || !projectType || saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Enregistrement…" : "Enregistrer la note"}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-1">Erreur : {error}</p>
        )}
      </div>

      {/* Liste des notes */}
      <div className="bg-white rounded-xl border p-4 flex-1 overflow-y-auto">
        <h4 className="font-semibold text-sm mb-3">Notes précédentes</h4>

        {loading && (
          <p className="text-xs text-gray-400">Chargement des notes…</p>
        )}

        {!loading && notes?.length === 0 && (
          <p className="text-xs text-gray-400">
            Aucune note pour ce projet pour l'instant.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {notes?.map((note) => (
            <div key={note.id} className="border rounded-lg p-3 text-sm bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {note.created_by ? `Par ${note.created_by}` : "Note interne"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {note.created_at &&
                    new Date(note.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

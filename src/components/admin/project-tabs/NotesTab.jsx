import React, { useState } from 'react';
import { Send, AtSign, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const NotesTab = ({ prospectId, projectType }) => {
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast({
        title: 'Note vide',
        description: 'Veuillez saisir du contenu avant d\'enregistrer.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    // TODO: Intégration Supabase pour sauvegarder la note
    // await supabase.from('project_notes').insert({...})
    
    // Mock pour l'instant
    setTimeout(() => {
      toast({
        title: '✅ Note enregistrée',
        description: 'Votre note a été ajoutée au projet.',
        className: 'bg-green-500 text-white',
      });
      setNoteContent('');
      setIsSaving(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Éditeur de note */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Écrivez une note interne sur ce projet..."
          className="w-full px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
          rows={5}
        />
        
        {/* Barre d'outils */}
        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
              title="Mentionner un utilisateur"
            >
              <AtSign className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
              title="Joindre un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          
          <Button
            onClick={handleSaveNote}
            disabled={isSaving || !noteContent.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Liste des notes existantes (mock pour l'instant) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Notes précédentes</h3>
        
        {/* Exemple de note mockée */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                JL
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Jack LUC</p>
                <p className="text-xs text-gray-500">Il y a 2 heures</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-700">
            Client très intéressé par le projet ACC. À recontacter en début de semaine prochaine pour finaliser le devis.
          </p>
        </div>

        <div className="text-center py-6 text-sm text-gray-400">
          <p>Les notes seront chargées depuis Supabase</p>
          <p className="text-xs mt-1">(table: project_notes)</p>
        </div>
      </div>
    </div>
  );
};

export default NotesTab;

import React from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * Placeholder pour la liste des conversations (Phase 3)
 * Sera remplacé par ChatConversationsList dans l'étape 3 du redesign
 */
const ChatPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Vos conversations</h2>
      <p className="text-gray-500 text-sm max-w-xs">
        Retrouvez ici tous vos échanges avec votre conseiller pour chacun de vos projets.
      </p>
    </div>
  );
};

export default ChatPage;

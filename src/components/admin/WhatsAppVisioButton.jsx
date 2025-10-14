import React from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const WhatsAppVisioButton = () => {
  const handleVisioClick = () => {
    toast({
      title: "Lancement de la visio WhatsApp...",
      description: "N'oubliez pas d'autoriser les pop-ups si la fenêtre ne s'ouvre pas ! 🚀",
    });
  };

  return (
    <div className="w-full flex-shrink-0 bg-white rounded-3xl shadow-soft p-4">
      <h2 className="text-base font-bold text-gray-800 mb-3">Appeler en Visio</h2>
      <a
        href="https://wa.me/33612345678?text=Bonjour%2C+je+suis+pr%C3%AAt+pour+la+visio"
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleVisioClick}
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-500 hover:bg-green-600 transition-colors"
      >
        <MessageSquare className="h-5 w-5 mr-2" /> Visio WhatsApp
      </a>
    </div>
  );
};

export default WhatsAppVisioButton;
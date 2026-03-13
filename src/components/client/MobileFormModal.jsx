import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientFormPanel from '@/components/client/ClientFormPanel';

/**
 * Modal plein écran mobile pour remplir un formulaire
 * Wrapp ClientFormPanel dans un overlay fullscreen
 * 
 * Props:
 * - projectType: string — type du projet (ex: "Centrale")
 * - onClose: () => void — fermer la modal
 */
const MobileFormModal = ({ projectType, onClose }) => {
  return (
    <div className="fixed inset-0 bottom-[88px] z-50 flex flex-col bg-white">
      {/* Header fixe */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">📋 Formulaire</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Contenu scrollable — ClientFormPanel existant */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <ClientFormPanel isDesktop={false} projectType={projectType} />
      </div>
    </div>
  );
};

export default MobileFormModal;

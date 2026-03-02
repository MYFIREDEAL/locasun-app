import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

/**
 * CopyButton — Bouton réutilisable "Copier" avec feedback visuel + toast.
 *
 * @param {string} value - Le texte à copier dans le presse-papiers
 * @param {string} [label] - Label optionnel du toast (par défaut "Copié !")
 * @param {string} [variant] - Variant du bouton (default "outline")
 * @param {string} [size] - Taille du bouton (default "sm")
 * @param {string} [className] - Classes CSS additionnelles
 */
const CopyButton = ({ value, label = 'Copié !', variant = 'outline', size = 'sm', className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: `✅ ${label}`,
        description: 'Le lien a été copié dans votre presse-papiers.',
        className: 'bg-green-500 text-white',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier. Sélectionnez le lien manuellement.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`gap-1.5 shrink-0 ${className}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copié' : 'Copier'}
    </Button>
  );
};

export default CopyButton;

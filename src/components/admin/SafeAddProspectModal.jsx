import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';

// Import sécurisé des composants Dialog
let Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose;

try {
  const dialogComponents = require('@/components/ui/dialog');
  Dialog = dialogComponents.Dialog;
  DialogContent = dialogComponents.DialogContent;
  DialogHeader = dialogComponents.DialogHeader;
  DialogTitle = dialogComponents.DialogTitle;
  DialogDescription = dialogComponents.DialogDescription;
  DialogFooter = dialogComponents.DialogFooter;
  DialogClose = dialogComponents.DialogClose;
} catch (e) {
  console.warn('Dialog components not available, using fallback');
}

// Composant de fallback si Dialog n'est pas disponible
const FallbackDialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        {children}
      </div>
    </div>
  );
};

const FallbackDialogContent = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const FallbackDialogHeader = ({ children }) => (
  <div className="p-6 pb-4">{children}</div>
);

const FallbackDialogTitle = ({ children }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
);

const FallbackDialogDescription = ({ children }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
);

const FallbackDialogFooter = ({ children }) => (
  <div className="flex justify-end gap-2 p-6 pt-4">{children}</div>
);

const FallbackDialogClose = ({ children, asChild, ...props }) => {
  if (asChild) {
    return React.cloneElement(children, props);
  }
  return <button {...props}>{children}</button>;
};

const SafeAddProspectModal = ({ open, onOpenChange, onAddProspect }) => {
  const { currentUser, activeAdminUser, projectsData = {}, formContactConfig = [] } = useAppContext();
  const projectOptions = Object.values(projectsData).filter(p => p.isPublic);

  const getInitialFormState = () => {
    const state = formContactConfig.reduce((acc, field) => {
      acc[field.id] = '';
      return acc;
    }, {});
    state.tags = [];
    return state;
  };

  const [formData, setFormData] = useState(getInitialFormState());

  useEffect(() => {
    if (open) {
      setFormData(getInitialFormState());
    }
  }, [open, formContactConfig]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleTagChange = (tag) => {
    setFormData(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredField = formContactConfig.find(f => f.required);
    if (requiredField && !formData[requiredField.id]) {
      toast({
        title: "Champs requis",
        description: `Le champ "${requiredField.name.replace('*', '')}" est obligatoire.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.email) {
      toast({
        title: "Champs requis",
        description: "L'email est obligatoire.",
        variant: "destructive",
      });
      return;
    }

    // 🔥 Ne pas générer d'ID temporaire, Supabase le fera
    const newProspect = {
      ...formData,
      tags: formData.tags,
      hasAppointment: false,
      // ownerId sera défini dans le handler parent (FinalPipeline ou CompleteOriginalContacts)
    };

    await onAddProspect(newProspect);
    
    // 🔥 Toast de succès géré par useSupabaseProspects
    onOpenChange(false);
  };

  // Utiliser les composants originaux si disponibles, sinon les fallbacks
  const DialogComponent = Dialog || FallbackDialog;
  const DialogContentComponent = DialogContent || FallbackDialogContent;
  const DialogHeaderComponent = DialogHeader || FallbackDialogHeader;
  const DialogTitleComponent = DialogTitle || FallbackDialogTitle;
  const DialogDescriptionComponent = DialogDescription || FallbackDialogDescription;
  const DialogFooterComponent = DialogFooter || FallbackDialogFooter;
  const DialogCloseComponent = DialogClose || FallbackDialogClose;

  return (
    <DialogComponent open={open} onOpenChange={onOpenChange}>
      <DialogContentComponent className="sm:max-w-md">
        <DialogHeaderComponent>
          <DialogTitleComponent>Ajouter un nouveau prospect</DialogTitleComponent>
          <DialogDescriptionComponent>
            Remplissez les informations pour créer un nouveau prospect.
          </DialogDescriptionComponent>
        </DialogHeaderComponent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 px-6">
            {formContactConfig.map(field => (
              <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={field.id} className="text-right">
                  {field.name}
                </Label>
                <Input
                  id={field.id}
                  type={field.type}
                  value={formData[field.id] || ''}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  className="col-span-3"
                  required={field.required}
                />
              </div>
            ))}
            {projectOptions.length > 0 && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Projets</Label>
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  {projectOptions.map(project => (
                    <div key={project.type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${project.type}`}
                        checked={formData.tags.includes(project.type)}
                        onCheckedChange={() => handleTagChange(project.type)}
                      />
                      <Label htmlFor={`tag-${project.type}`} className="font-normal">{project.title}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooterComponent>
            <DialogCloseComponent asChild>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
            </DialogCloseComponent>
            <Button type="submit">Créer le prospect</Button>
          </DialogFooterComponent>
        </form>
      </DialogContentComponent>
    </DialogComponent>
  );
};

export default SafeAddProspectModal;

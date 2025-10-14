import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';

const AddProspectModal = ({ open, onOpenChange, onAddProspect }) => {
  const { currentUser, projectsData, formContactConfig } = useAppContext();
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

  const handleSubmit = (e) => {
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

    const newProspect = {
      id: `prospect-${Date.now()}`,
      ...formData,
      tags: formData.tags,
      hasAppointment: false,
      ownerId: currentUser ? currentUser.id : null,
    };

    onAddProspect(newProspect);
    
    toast({
      title: "✅ Prospect ajouté !",
      description: `${newProspect.name} a été ajouté à la colonne "Intéressé".`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau prospect</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau prospect.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit">Créer le prospect</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProspectModal;
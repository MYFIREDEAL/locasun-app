import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppContext } from '@/App';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Trash2, Plus, FolderKanban, GripVertical, ChevronDown } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { slugify } from '@/lib/utils';
import { logger } from '@/lib/logger';
import ModulesNavBar from '@/components/admin/ModulesNavBar';

// 🎨 Emojis utilisés dans l'application LOCASUN
const EMOJI_COLLECTION = [
  '🔌', '💡', '☀️', '💸', '🏭', '🆕', '✅', '⚡', '📝', '⏳',
  '🌞', '➡️', '🔎', '🛠️', '✍️', '🏦', '📦', '👷', '📋', '⚡️',
  '💶', '📈', '🔧',
];

// 🎯 Composant réutilisable : Emoji Picker avec bouton flèche
const EmojiPickerButton = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <Input 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-16 text-center text-xl"
    />
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          title="Choisir un emoji"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex flex-wrap gap-1 max-h-96 overflow-y-auto">
          {EMOJI_COLLECTION.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 rounded-md transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  </div>
);

// Options de couleurs pour les badges projet
const PROJECT_COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-800', label: 'Bleu', preview: 'bg-blue-100' },
  { value: 'bg-green-100 text-green-800', label: 'Vert', preview: 'bg-green-100' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Jaune', preview: 'bg-yellow-100' },
  { value: 'bg-red-100 text-red-800', label: 'Rouge', preview: 'bg-red-100' },
  { value: 'bg-purple-100 text-purple-800', label: 'Violet', preview: 'bg-purple-100' },
  { value: 'bg-pink-100 text-pink-800', label: 'Rose', preview: 'bg-pink-100' },
  { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo', preview: 'bg-indigo-100' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange', preview: 'bg-orange-100' },
  { value: 'bg-teal-100 text-teal-800', label: 'Turquoise', preview: 'bg-teal-100' },
  { value: 'bg-gray-100 text-gray-800', label: 'Gris', preview: 'bg-gray-100' },
];

const ProjectEditor = ({
  project,
  onSave,
  onCancel,
  globalPipelineSteps = []
}) => {
  const { organizationReady } = useOrganization();
  
  const createInitialProject = () => {
    const baseProject = project ? JSON.parse(JSON.stringify(project)) : {
      type: '',
      title: '',
      clientTitle: '',
      icon: '🆕',
      color: 'gradient-blue',
      steps: [],
      isPublic: true
    };

    const fallbackId = globalPipelineSteps[0]?.id ?? null;

    baseProject.steps = Array.isArray(baseProject.steps)
      ? baseProject.steps.map(step => ({
          ...step,
          id: step.id || `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          globalStepId: step.globalStepId ?? fallbackId
        }))
      : [];

    return baseProject;
  };

  const [editedProject, setEditedProject] = useState(createInitialProject);
  const [newStepName, setNewStepName] = useState('');
  const [newStepIcon, setNewStepIcon] = useState('➡️');

  // Mémoriser les options du Select pour éviter les re-renders inutiles
  const globalStepOptions = useMemo(() => 
    globalPipelineSteps.map(globalStep => (
      <SelectItem key={globalStep.id} value={globalStep.id}>
        {globalStep.label}
      </SelectItem>
    ))
  , [globalPipelineSteps]);

  useEffect(() => {
    setEditedProject(createInitialProject());
    setNewStepName('');
    setNewStepIcon('➡️');
  }, [project]);

  useEffect(() => {
    // Guard: ne pas exécuter tant que l'organisation n'est pas prête
    if (!organizationReady || globalPipelineSteps.length === 0) return;
    
    setEditedProject(prev => {
      const availableIds = new Set(globalPipelineSteps.map(step => step.id));
      const fallbackId = globalPipelineSteps[0]?.id ?? null;
      let hasChanges = false;

      const updatedSteps = (prev.steps || []).map(step => {
        const isValid = step.globalStepId && availableIds.has(step.globalStepId);
        const nextId = isValid ? step.globalStepId : fallbackId ?? null;
        if (nextId !== step.globalStepId) {
          hasChanges = true;
          return { ...step, globalStepId: nextId };
        }
        return step;
      });

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        steps: updatedSteps
      };
    });
  }, [globalPipelineSteps]);
  
  const handleStepChange = useCallback((index, field, value) => {
    setEditedProject(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = {
        ...newSteps[index],
        [field]: value
      };
      return {
        ...prev,
        steps: newSteps
      };
    });
  }, []);
  
  const addStep = useCallback(() => {
    if (!newStepName.trim()) return;
    const fallbackId = globalPipelineSteps[0]?.id ?? null;
    const newStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: newStepName,
      status: 'pending',
      icon: newStepIcon,
      descriptions: {},
      globalStepId: fallbackId
    };
    setEditedProject(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setNewStepName('');
    setNewStepIcon('➡️');
  }, [newStepName, newStepIcon, globalPipelineSteps]);
  
  const removeStep = useCallback((index) => {
    setEditedProject(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  }, []);

  const handleDragEnd = result => {
    if (!result.destination) return;
    const items = Array.from(editedProject.steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setEditedProject(prev => ({
      ...prev,
      steps: items
    }));
  };
  
  const handleDragStart = () => {
    // Désactiver les scroll pour éviter les décalages
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };
  
  const handleDragEndWithCleanup = (result) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    handleDragEnd(result);
  };

  const handleSave = () => {
    // 🔍 Déterminer si c'est une création ou modification
    const isExistingProject = project && project.type;
    
    const finalProject = {
      ...editedProject,
      // ✅ Si modification → garder le type existant
      // ✅ Si création → générer un nouveau type basé sur le titre
      type: isExistingProject 
        ? editedProject.type 
        : (slugify(editedProject.title) || `project-${Date.now()}`),
      id: editedProject.id || Date.now()
    };
    if (!finalProject.title) {
      toast({
        title: "Titre manquant",
        description: "Veuillez donner un titre à votre projet.",
        variant: "destructive"
      });
      return;
    }
    if (!finalProject.clientTitle) {
      finalProject.clientTitle = finalProject.title;
    }
    onSave(finalProject);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="text-lg font-semibold">Paramètres du Projet</h3>
        <div className="flex items-center space-x-2">
          <Switch 
            id="isPublic" 
            checked={editedProject.isPublic} 
            onCheckedChange={checked => setEditedProject(prev => ({
              ...prev,
              isPublic: checked
            }))} 
          />
          <Label htmlFor="isPublic">En ligne</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="project-title">Titre du Projet (Interne)</Label>
          <Input 
            id="project-title" 
            value={editedProject.title} 
            onChange={e => setEditedProject(prev => ({
              ...prev,
              title: e.target.value
            }))} 
          />
        </div>
        <div>
          <Label htmlFor="project-client-title">Nom affiché au client</Label>
          <Input 
            id="project-client-title" 
            value={editedProject.clientTitle} 
            onChange={e => setEditedProject(prev => ({
              ...prev,
              clientTitle: e.target.value
            }))} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="project-icon">Icône (Emoji)</Label>
          <EmojiPickerButton
            value={editedProject.icon}
            onChange={(newIcon) => setEditedProject(prev => ({
              ...prev,
              icon: newIcon
            }))}
          />
        </div>
        <div>
          <Label htmlFor="project-color">Couleur du Badge</Label>
          <Select 
            value={editedProject.color || 'bg-blue-100 text-blue-800'} 
            onValueChange={(value) => setEditedProject(prev => ({
              ...prev,
              color: value
            }))}
          >
            <SelectTrigger id="project-color">
              <SelectValue placeholder="Choisir une couleur" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_COLOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${option.preview} border border-gray-300`} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-md font-semibold text-gray-700 pt-4 border-t">Étapes de la Timeline</h3>
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEndWithCleanup}>
        <Droppable droppableId="steps">
          {provided => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {editedProject.steps.map((step, index) => (
                <Draggable key={step.id} draggableId={step.id} index={index}>
                  {(provided, snapshot) => {
                    const style = snapshot.isDragging
                      ? {
                          ...provided.draggableProps.style,
                          position: 'relative',
                          left: 'auto',
                          top: 'auto',
                        }
                      : provided.draggableProps.style;
                    
                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={style}
                        className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all ${snapshot.isDragging ? 'ring-2 ring-purple-200 shadow-lg' : ''}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3 md:flex-1">
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <EmojiPickerButton
                              value={step.icon}
                              onChange={(newIcon) => handleStepChange(index, 'icon', newIcon)}
                            />
                            <Input
                              value={step.name}
                              onChange={e => handleStepChange(index, 'name', e.target.value)}
                              placeholder="Nom de l'étape"
                              className="flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-2 md:w-72">
                            <Select
                              value={step.globalStepId ?? ''}
                              onValueChange={value => handleStepChange(index, 'globalStepId', value || null)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Associer à une étape globale" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Non assignée</SelectItem>
                                {globalStepOptions}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex items-end gap-2 pt-4 border-t">
        <div className="flex-grow">
          <Label>Ajouter une étape</Label>
          <div className="flex gap-2">
            <EmojiPickerButton
              value={newStepIcon}
              onChange={setNewStepIcon}
            />
            <Input 
              value={newStepName} 
              onChange={e => setNewStepName(e.target.value)} 
              placeholder="Nom de la nouvelle étape" 
              className="flex-1" 
            />
          </div>
        </div>
        <Button onClick={addStep}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Enregistrer le projet</Button>
      </div>
    </div>
  );
};

const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSave,
  globalPipelineSteps = []
}) => {
  const { projectsData = {} } = useAppContext();
  const [step, setStep] = useState(1);
  const [project, setProject] = useState(null);

  const handleSelectTemplate = templateKey => {
    const template = projectsData?.[templateKey];
    if (!template) {
      toast({
        title: "Modèle introuvable",
        description: "Le modèle de projet n'existe plus.",
        variant: "destructive"
      });
      return;
    }
    const newProject = {
      ...JSON.parse(JSON.stringify(template)),
      title: `${template.title} (Copie)`,
      clientTitle: `${template.clientTitle} (Copie)`,
      type: `${template.type}-copie-${Date.now()}`,
      isPublic: true
    };
    setProject(newProject);
    setStep(2);
  };

  const handleCreateFromScratch = () => {
    const fallbackId = globalPipelineSteps[0]?.id ?? null;
    setProject({
      type: '',
      title: '',
      clientTitle: '',
      icon: '🆕',
      color: 'gradient-blue',
      steps: [{
        name: 'Nouvelle Étape',
        status: 'pending',
        icon: '➡️',
        descriptions: {},
        globalStepId: fallbackId
      }],
      isPublic: true
    });
    setStep(2);
  };

  const handleSaveProject = editedProject => {
    onSave(editedProject);
    setStep(1);
    setProject(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setStep(1);
    setProject(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => {
      if (!isOpen) handleCancel();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Créer un nouveau projet' : 'Modifier le projet'}</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Choisissez un modèle de base ou partez de zéro." : "Personnalisez le titre, l'icône et les étapes de votre nouveau projet."}
          </DialogDescription>
        </DialogHeader>
        {step === 1 && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(projectsData).map(template => (
              <motion.button 
                key={template.type} 
                onClick={() => handleSelectTemplate(template.type)} 
                className="p-4 border rounded-lg hover:shadow-lg hover:border-blue-500 transition-all text-center space-y-2" 
                whileHover={{ y: -5 }}
              >
                <span className="text-4xl">{template.icon}</span>
                <p className="font-semibold">{template.title}</p>
              </motion.button>
            ))}
            <motion.button 
              onClick={handleCreateFromScratch} 
              className="p-4 border border-dashed rounded-lg hover:shadow-lg hover:border-green-500 transition-all text-center space-y-2 flex flex-col items-center justify-center" 
              whileHover={{ y: -5 }}
            >
              <Plus className="h-10 w-10 text-gray-400 mb-2" />
              <p className="font-semibold">Partir de zéro</p>
            </motion.button>
          </div>
        )}
        {step === 2 && project && (
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <ProjectEditor 
              project={project} 
              onSave={handleSaveProject} 
              onCancel={handleCancel} 
              globalPipelineSteps={globalPipelineSteps} 
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ProjectsManagementPage = () => {
  const {
    projectsData = {},
    setProjectsData,
    deleteProjectTemplate,
    globalPipelineSteps = []
  } = useAppContext();

  const [isCreateProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const handleSaveProject = async projectToSave => {
    const newProjectsData = {
      ...(projectsData || {}),
      [projectToSave.type]: projectToSave
    };
    
    try {
      await setProjectsData(newProjectsData);
      toast({
        title: "Projet enregistré !",
        description: `Le projet "${projectToSave.title}" a été sauvegardé.`,
        className: "bg-green-500 text-white"
      });
      setEditingProject(null);
    } catch (error) {
      toast({
        title: "Erreur !",
        description: "Impossible de sauvegarder le projet.",
        variant: "destructive"
      });
    }
  };

  const handleToggleProjectVisibility = (projectType, isPublic) => {
    const projectToUpdate = projectsData?.[projectType];
    if (projectToUpdate) {
      const updatedProject = {
        ...projectToUpdate,
        isPublic
      };
      handleSaveProject(updatedProject);
      toast({
        title: `Projet ${isPublic ? 'mis en ligne' : 'mis hors ligne'}`,
        description: `Le projet "${projectToUpdate.title}" est maintenant ${isPublic ? 'visible' : 'caché'} pour les clients.`
      });
    }
  };

  const handleDeleteProjectClick = (projectType) => {
    // 🔒 Protection UX : Empêcher la suppression des projets "En ligne"
    const template = projectsData?.[projectType];
    
    if (template?.isPublic) {
      toast({
        title: "Impossible de supprimer",
        description: "Désactivez ce projet avant de le supprimer.",
        variant: "destructive"
      });
      return;
    }
    
    // Si le projet est hors ligne, procéder à la suppression
    handleDeleteProject(projectType);
  };

  const handleDeleteProject = async projectType => {
    try {
      // 🔥 Trouver le template par type pour obtenir son ID Supabase (UUID)
      const template = projectsData?.[projectType];
      
      if (!template || !template.id) {
        throw new Error('Template introuvable ou ID manquant');
      }
      
      // 🔥 Appeler deleteTemplate avec l'UUID Supabase (pas le type string)
      await deleteProjectTemplate(template.id);
      
      toast({
        title: "Projet supprimé !",
        description: `Le projet "${template.title}" a été supprimé de la base de données.`,
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      logger.error('Erreur suppression projet', { error: error.message });
      toast({
        title: "Erreur !",
        description: error.message || "Impossible de supprimer le projet.",
        variant: "destructive"
      });
    }
  };

  const openProjectEditor = project => {
    setEditingProject(project);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ModulesNavBar activeModule="projets" />
      <div className="flex flex-1 gap-6 p-6">
      {/* Colonne gauche - Liste des projets */}
      <div className="w-[25%] flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-card h-full flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestion des Projets</h2>
            <Button 
              onClick={() => setCreateProjectOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              <Plus className="mr-2 h-4 w-4" /> Créer un projet
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {Object.values(projectsData || {}).length > 0 ? Object.values(projectsData || {}).map(p => (
              <div 
                key={p.type} 
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  editingProject?.type === p.type 
                    ? 'bg-blue-50 border-2 border-blue-500' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => openProjectEditor(p)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.isPublic ? '🟢 En ligne' : '🔴 Hors ligne'}</p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer "{p.title}" ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible et supprimera ce modèle de projet.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteProjectClick(p.type)} 
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">
                <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Aucun projet créé. Cliquez sur le bouton pour en ajouter un.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne droite - Éditeur de projet détaillé */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {editingProject ? `Modifier "${editingProject.title}"` : "Sélectionnez un projet"}
            </h2>
            <p className="text-sm text-gray-500">
              {editingProject 
                ? "Personnalisez les paramètres de votre projet et gérez ses étapes." 
                : "Cliquez sur un projet dans la liste pour le modifier."}
            </p>
          </div>

          {editingProject ? (
            <ProjectEditor 
              project={editingProject} 
              onSave={handleSaveProject} 
              onCancel={() => setEditingProject(null)} 
              globalPipelineSteps={globalPipelineSteps} 
            />
          ) : (
            <div className="text-center py-20 text-gray-400">
              <FolderKanban className="mx-auto h-20 w-20 mb-4" />
              <p className="text-lg">Sélectionnez un projet à modifier</p>
              <p className="text-sm mt-2">ou créez-en un nouveau</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Dialog de création de projet */}
      <CreateProjectDialog 
        open={isCreateProjectOpen} 
        onOpenChange={setCreateProjectOpen} 
        onSave={handleSaveProject} 
        globalPipelineSteps={globalPipelineSteps} 
      />
    </div>
  );
};

export default ProjectsManagementPage;

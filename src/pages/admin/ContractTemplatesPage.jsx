import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';
import { Plus, FileText, Edit } from 'lucide-react';

// Options de projets (même liste que ProfilePage)
const projectOptions = [
  { value: 'ACC', label: 'ACC' },
  { value: 'Centrale', label: 'Centrale' },
  { value: 'Investissement', label: 'Investissement' },
  { value: 'Autonomie', label: 'Autonomie' },
  { value: 'Borne', label: 'Borne' },
  { value: 'Autre', label: 'Autre' },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const ContractTemplatesPage = () => {
  const {
    templates: contractTemplates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deactivateTemplate
  } = useSupabaseContractTemplates();

  const [editingContractTemplate, setEditingContractTemplate] = useState(null);
  const [isPreviewTemplateOpen, setIsPreviewTemplateOpen] = useState(false);

  const handleSaveContractTemplate = async (templateToSave) => {
    const isNew = !templateToSave.id;
    
    const result = isNew 
      ? await createTemplate({
          name: templateToSave.name,
          projectType: templateToSave.projectType || 'ACC',
          contentHtml: templateToSave.contentHtml || '',
        })
      : await updateTemplate(templateToSave.id, {
          name: templateToSave.name,
          projectType: templateToSave.projectType,
          contentHtml: templateToSave.contentHtml,
        });

    if (result.success) {
      toast({
        title: "✅ Template enregistré !",
        description: `Le template "${templateToSave.name}" a été sauvegardé.`,
        className: "bg-green-500 text-white"
      });
      setEditingContractTemplate(null);
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible d'enregistrer le template : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  const handleDeactivateContractTemplate = async (templateId) => {
    const result = await deactivateTemplate(templateId);

    if (result.success) {
      toast({
        title: "✅ Template désactivé !",
        description: "Le template a été désactivé.",
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible de désactiver le template : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📄 Templates de contrats</h1>
          <p className="text-gray-600">Gérez vos modèles de contrats HTML pour chaque type de projet</p>
        </motion.div>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Colonne 1: Liste des templates (25%) */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Mes templates</h2>
                <Button 
                  onClick={() => setEditingContractTemplate({
                    name: '',
                    projectType: 'ACC',
                    contentHtml: ''
                  })} 
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  <Plus className="mr-2 h-4 w-4" /> Nouveau template
                </Button>
              </div>
              
              <div className="space-y-2">
                {templatesLoading ? (
                  <div className="text-center py-8 text-gray-500">Chargement...</div>
                ) : contractTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucun template</p>
                  </div>
                ) : (
                  contractTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setEditingContractTemplate(template)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                        editingContractTemplate?.id === template.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <span className="text-xs text-gray-500">{template.projectType}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">v{template.version}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${
                          template.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {template.isActive ? '✅' : '⛔'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Colonne 2: Éditeur de template (75%) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-card p-6">
              {editingContractTemplate ? (
                <div className="space-y-6">
                  {/* Header de l'éditeur */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        {editingContractTemplate.id ? (
                          <>
                            <Edit className="inline h-5 w-5 mr-2 text-purple-600" />
                            Modifier le template
                          </>
                        ) : (
                          <>
                            <Plus className="inline h-5 w-5 mr-2 text-purple-600" />
                            Créer un nouveau template
                          </>
                        )}
                      </h2>
                      {editingContractTemplate.id && (
                        <p className="text-sm text-gray-500 mt-1">
                          Version actuelle: v{editingContractTemplate.version || 1}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingContractTemplate.id && editingContractTemplate.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Désactiver
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Désactiver "{editingContractTemplate.name}" ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Le template sera marqué comme inactif mais restera dans la base.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => {
                                  handleDeactivateContractTemplate(editingContractTemplate.id);
                                  setEditingContractTemplate(null);
                                }} 
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Désactiver
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Formulaire d'édition */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Nom du template</Label>
                      <Input 
                        id="template-name"
                        value={editingContractTemplate.name || ''}
                        onChange={(e) => setEditingContractTemplate(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        placeholder="Ex: Contrat ACC Standard"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="template-project-type">Type de projet</Label>
                      <Select 
                        value={editingContractTemplate.projectType || 'ACC'}
                        onValueChange={(value) => setEditingContractTemplate(prev => ({
                          ...prev,
                          projectType: value
                        }))}
                      >
                        <SelectTrigger id="template-project-type" className="mt-1">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="template-content">Contenu HTML</Label>
                      <Textarea 
                        id="template-content"
                        value={editingContractTemplate.contentHtml || ''}
                        onChange={(e) => setEditingContractTemplate(prev => ({
                          ...prev,
                          contentHtml: e.target.value
                        }))}
                        placeholder="Entrez le contenu HTML du contrat..."
                        rows={20}
                        className="font-mono text-sm mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Utilisez du HTML valide. Les variables dynamiques seront remplacées lors de la génération du contrat.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingContractTemplate(null)}
                    >
                      Annuler
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="secondary"
                        onClick={() => setIsPreviewTemplateOpen(true)}
                        disabled={!editingContractTemplate.contentHtml}
                      >
                        👁️ Visualiser
                      </Button>
                      <Button 
                        onClick={() => handleSaveContractTemplate(editingContractTemplate)}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!editingContractTemplate.name || !editingContractTemplate.contentHtml}
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Sélectionnez un template
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Choisissez un template dans la liste ou créez-en un nouveau
                  </p>
                  <Button 
                    onClick={() => setEditingContractTemplate({
                      name: '',
                      projectType: 'ACC',
                      contentHtml: ''
                    })} 
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Créer un template
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Modal Prévisualisation Template */}
      <Dialog open={isPreviewTemplateOpen} onOpenChange={setIsPreviewTemplateOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Prévisualisation : {editingContractTemplate?.name || 'Template'}
            </DialogTitle>
            <DialogDescription>
              Aperçu du rendu HTML du template de contrat
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 max-h-[70vh] overflow-y-auto bg-white border rounded-lg">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: editingContractTemplate?.contentHtml || '' }}
            />
          </div>
          <DialogFooter className="px-6 pb-4">
            <Button onClick={() => setIsPreviewTemplateOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractTemplatesPage;

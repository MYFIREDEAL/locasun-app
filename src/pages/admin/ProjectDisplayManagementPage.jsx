import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/App';
import { Upload, Image as ImageIcon } from 'lucide-react';

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

const ProjectDisplayManagementPage = () => {
  const { projectsData = {}, setProjectsData } = useAppContext();

  const [selectedProjectForDisplay, setSelectedProjectForDisplay] = useState('');
  const [projectDisplayData, setProjectDisplayData] = useState({
    coverImage: '',
    clientDescription: '',
    ctaText: ''
  });
  const fileInputRef = useRef(null);

  const projectOptions = useMemo(() => Object.values(projectsData).map(p => ({
    value: p.type,
    label: p.title
  })), [projectsData]);

  // Auto-sélectionner le premier projet si aucun n'est sélectionné
  useEffect(() => {
    if (projectOptions.length > 0 && !selectedProjectForDisplay) {
      setSelectedProjectForDisplay(projectOptions[0].value);
    }
  }, [projectOptions, selectedProjectForDisplay]);

  // Charger les données d'affichage du projet sélectionné
  useEffect(() => {
    if (selectedProjectForDisplay && projectsData[selectedProjectForDisplay]) {
      const project = projectsData[selectedProjectForDisplay];
      setProjectDisplayData({
        coverImage: project.coverImage || '',
        clientDescription: project.clientDescription || '',
        ctaText: project.ctaText || ''
      });
    }
  }, [selectedProjectForDisplay, projectsData]);

  const handleDisplayDataChange = (field, value) => {
    setProjectDisplayData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveDisplayData = async () => {
    if (!selectedProjectForDisplay) return;
    const updatedProject = {
      ...projectsData[selectedProjectForDisplay],
      ...projectDisplayData
    };
    const newProjectsData = {
      ...projectsData,
      [selectedProjectForDisplay]: updatedProject
    };
    
    try {
      await setProjectsData(newProjectsData);
      toast({
        title: "✅ Modifications enregistrées !",
        description: `L'affichage du projet "${projectsData[selectedProjectForDisplay].title}" a été mis à jour.`,
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      toast({
        title: "❌ Erreur !",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleDisplayDataChange('coverImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedProject = selectedProjectForDisplay && projectsData[selectedProjectForDisplay];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🧱 Gestion de l'Affichage des Projets</h1>
          <p className="text-gray-600">Configurez l'apparence et les informations visibles par les clients pour chaque projet</p>
        </motion.div>

        {/* Contenu principal */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
          <div className="space-y-6">
            {/* Sélecteur de projet */}
            <div>
              <Label htmlFor="project-display-select">Sélectionner un projet</Label>
              <Select value={selectedProjectForDisplay} onValueChange={setSelectedProjectForDisplay}>
                <SelectTrigger id="project-display-select" className="mt-1">
                  <SelectValue placeholder="Choisir un projet" />
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

            {/* Formulaire d'édition - affiché seulement si un projet est sélectionné */}
            {selectedProjectForDisplay && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedProjectForDisplay}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6 pt-6 border-t"
                >
                  {/* Affichage du projet sélectionné */}
                  {selectedProject && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{selectedProject.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{selectedProject.title}</h3>
                          <p className="text-sm text-gray-600">Type: {selectedProject.type}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image de couverture */}
                  <div>
                    <Label htmlFor="project-cover-image">Image de couverture (URL)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="project-cover-image"
                        placeholder="https://exemple.com/image.jpg"
                        value={projectDisplayData.coverImage}
                        onChange={e => handleDisplayDataChange('coverImage', e.target.value)}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        title="Uploader une image"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Aperçu de l'image */}
                    {projectDisplayData.coverImage ? (
                      <div className="mt-3 relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 border">
                        <img
                          src={projectDisplayData.coverImage}
                          alt="Aperçu de la couverture"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '';
                            e.target.style.display = 'none';
                            toast({
                              title: "Erreur d'image",
                              description: "L'URL de l'image n'est pas valide.",
                              variant: "destructive"
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-center w-full aspect-video rounded-lg bg-gray-100 border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Aucune image de couverture</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Image affichée aux clients sur la page de présentation du projet
                    </p>
                  </div>

                  {/* Description du projet */}
                  <div>
                    <Label htmlFor="project-client-description">Description du projet</Label>
                    <Textarea
                      id="project-client-description"
                      placeholder="Courte description visible par le client..."
                      value={projectDisplayData.clientDescription}
                      onChange={e => handleDisplayDataChange('clientDescription', e.target.value)}
                      rows={5}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Texte présenté au client pour expliquer le projet
                    </p>
                  </div>

                  {/* Texte du bouton CTA */}
                  <div>
                    <Label htmlFor="project-cta-text">Texte du bouton (CTA)</Label>
                    <Input
                      id="project-cta-text"
                      placeholder="Ex: Ajouter ce projet"
                      value={projectDisplayData.ctaText}
                      onChange={e => handleDisplayDataChange('ctaText', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Texte affiché sur le bouton d'action principal
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSaveDisplayData}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!selectedProjectForDisplay}
                    >
                      Enregistrer les modifications
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Message si aucun projet */}
            {projectOptions.length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Aucun projet disponible
                </h3>
                <p className="text-gray-500">
                  Créez d'abord des projets dans la page "Gestion des Projets"
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProjectDisplayManagementPage;

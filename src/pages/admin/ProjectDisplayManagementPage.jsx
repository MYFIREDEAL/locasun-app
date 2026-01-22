import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { Upload, Image as ImageIcon } from 'lucide-react';
import ModulesNavBar from '@/components/admin/ModulesNavBar';

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
    label: p.title,
    icon: p.icon
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
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ModulesNavBar activeModule="catalogue" />
      <div className="flex flex-1 gap-6 p-6">
        {/* Colonne gauche - Liste des projets */}
        <div className="w-[25%] flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-card h-full flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">🧱 Catalogue Client</h2>
              <p className="text-sm text-gray-500">Configurez l'affichage des projets pour vos clients</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {projectOptions.length > 0 ? projectOptions.map(p => (
                <div 
                  key={p.value} 
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedProjectForDisplay === p.value 
                      ? 'bg-indigo-50 border-2 border-indigo-500' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedProjectForDisplay(p.value)}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="font-medium">{p.label}</span>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">Aucun projet disponible</p>
                  <p className="text-xs mt-1">Créez d'abord des projets dans "Gestion des Projets"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite - Éditeur d'affichage */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {selectedProject ? `Configuration de "${selectedProject.title}"` : "Sélectionnez un projet"}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedProject 
                  ? "Personnalisez l'image, la description et le bouton d'action affichés aux clients." 
                  : "Cliquez sur un projet dans la liste pour configurer son affichage."}
              </p>
            </div>

            {selectedProject ? (
              <div className="space-y-6">
                {/* Affichage du projet sélectionné */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedProject.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedProject.title}</h3>
                      <p className="text-sm text-gray-600">Type: {selectedProject.type}</p>
                    </div>
                  </div>
                </div>

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
                  >
                    Enregistrer les modifications
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <ImageIcon className="mx-auto h-20 w-20 mb-4" />
                <p className="text-lg">Sélectionnez un projet à configurer</p>
                <p className="text-sm mt-2">ou créez-en un dans "Gestion des Projets"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDisplayManagementPage;

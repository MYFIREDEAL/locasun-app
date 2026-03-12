import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ShoppingBag, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/App';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
// 🔥 PR-3: useSupabaseProspects supprimé - données centralisées dans AppContext
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const OfferCard = ({ project, projectStatus }) => {
  // 🔥 PR-3: updateProspect récupéré depuis AppContext (source unique)
  const { currentUser, setCurrentUser, updateProspect } = useAppContext();
  const navigate = useNavigate();
  
  // 🔥 Utiliser currentUser.tags depuis Supabase (pas localStorage)
  const isProjectAdded = currentUser?.tags?.includes(project.type) || false;
  const isInactive = isProjectAdded && (projectStatus === 'abandon' || projectStatus === 'archive');

  const handleReactivate = async () => {
    if (!currentUser?.id) return;

    try {
      // Remettre le statut à "actif" dans project_infos
      const { error } = await supabase
        .from('project_infos')
        .upsert({
          prospect_id: currentUser.id,
          project_type: project.type,
          status: 'actif',
          data: {}
        }, {
          onConflict: 'prospect_id,project_type'
        });

      if (error) throw error;

      // Ajouter un événement dans l'historique
      await supabase
        .from('project_history')
        .insert({
          prospect_id: currentUser.id,
          project_type: project.type,
          event_type: 'status',
          description: 'Projet réactivé par le client'
        });

      toast({
        title: "Projet réactivé ! ✅",
        description: `Le projet "${project.clientTitle}" est de nouveau actif dans votre tableau de bord.`,
        className: "bg-green-500 text-white"
      });

      // Recharger la page pour afficher les changements
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      logger.error('Erreur réactivation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réactiver le projet.",
        variant: "destructive"
      });
    }
  };

  const handleCtaClick = async () => {
    if (isProjectAdded && !isInactive) {
      // 🔥 Rediriger vers le projet dans le dashboard
      navigate('/dashboard', { 
        state: { openProjectType: project.type }
      });
      return;
    }

    if (!currentUser?.id) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour ajouter un projet.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Ajouter le nouveau tag au prospect dans Supabase
      const updatedTags = [...(currentUser.tags || []), project.type];
      
      await updateProspect({
        id: currentUser.id,
        tags: updatedTags,
      });

      // 🔥 INITIALISER LES ÉTAPES DANS SUPABASE dès l'ajout du projet par le client
      if (project.steps && project.steps.length > 0) {
        const initialSteps = JSON.parse(JSON.stringify(project.steps));
        initialSteps[0].status = 'in_progress'; // Première étape active
        
        // 🔥 Récupérer organization_id depuis le prospect (requis par la DB)
        const { data: prospectData, error: prospectError } = await supabase
          .from('prospects')
          .select('organization_id')
          .eq('id', currentUser.id)
          .single();
        
        if (prospectError || !prospectData?.organization_id) {
          logger.error('Organization introuvable pour le prospect:', { prospectId: currentUser.id, error: prospectError?.message });
          return;
        }
        
        const { error: stepsError } = await supabase
          .from('project_steps_status')
          .upsert({
            prospect_id: currentUser.id,
            project_type: project.type,
            organization_id: prospectData.organization_id,
            steps: initialSteps,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'prospect_id,project_type'
          });
        
        if (stepsError) {
          logger.error('⚠️ Erreur initialisation steps:', stepsError);
        }
        
        // ✅ Attendre 500ms pour que Supabase propage la donnée avant navigation
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // ✅ Mettre à jour currentUser localement pour UI immédiate
      setCurrentUser({
        ...currentUser,
        tags: updatedTags
      });

      toast({
        title: "Projet ajouté avec succès ! ✅",
        description: `Le projet "${project.clientTitle}" est maintenant dans votre tableau de bord.`,
      });
      
      // 🔥 Rediriger immédiatement vers le dashboard avec le projet sélectionné
      navigate('/dashboard', { 
        state: { openProjectType: project.type }
      });
    } catch (error) {
      logger.error('Erreur ajout projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le projet. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-2xl md:rounded-3xl shadow-soft overflow-hidden flex flex-col"
      whileHover={{ y: -5 }}
    >
      <div className="h-32 md:h-48 w-full bg-gray-100 flex items-center justify-center">
        {project.coverImage ? (
          <img src={project.coverImage} alt={project.clientTitle} className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag className="h-10 w-10 md:h-16 md:w-16 text-gray-300" />
        )}
      </div>
      <div className="p-4 md:p-6 flex-grow flex flex-col">
        <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{project.clientTitle}</h3>
        <p className="text-gray-600 text-xs md:text-sm flex-grow mb-3 md:mb-6">
          {project.clientDescription || 'Ce nouveau projet est disponible. Ajoutez-le à votre tableau de bord pour en savoir plus.'}
        </p>
        {isInactive ? (
          <Button 
            onClick={handleReactivate}
            className="w-full mt-auto rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm md:text-base"
            size="default"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Réactiver
          </Button>
        ) : (
          <Button 
            onClick={handleCtaClick}
            className={`w-full mt-auto rounded-xl text-sm md:text-base ${isProjectAdded ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'gradient-green hover:opacity-90'}`}
            size="default"
          >
            {isProjectAdded ? '➤ Voir le projet' : (project.ctaText || '➤ Ajouter ce projet')}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const OffersPage = () => {
  const { projectsData, currentUser } = useAppContext();
  const [projectStatuses, setProjectStatuses] = useState({});

  // Charger les statuts des projets du client
  useEffect(() => {
    const loadProjectStatuses = async () => {
      if (!currentUser?.id || !currentUser?.tags || currentUser.tags.length === 0) return;
      
      const { data } = await supabase
        .from('project_infos')
        .select('project_type, status')
        .eq('prospect_id', currentUser.id)
        .in('project_type', currentUser.tags);
      
      if (data) {
        const statusMap = {};
        data.forEach(item => {
          statusMap[item.project_type] = item.status || 'actif';
        });
        setProjectStatuses(statusMap);
      }
    };
    
    loadProjectStatuses();
  }, [currentUser]);

  const offers = Object.values(projectsData).filter(p => p.isPublic);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 md:space-y-8"
    >
      <div className="text-center">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900">Nos offres ⚡</h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base max-w-2xl mx-auto">Choisissez l'opportunité qui vous correspond.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {offers.map((project) => (
          <OfferCard 
            key={project.type} 
            project={project} 
            projectStatus={projectStatuses[project.type] || 'actif'}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default OffersPage;
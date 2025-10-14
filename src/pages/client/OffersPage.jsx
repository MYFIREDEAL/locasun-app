import React from 'react';
import { motion } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/App';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const OfferCard = ({ project }) => {
  const { addProject, userProjects } = useAppContext();
  const navigate = useNavigate();
  const isProjectAdded = userProjects.includes(project.type);

  const handleCtaClick = () => {
    if (isProjectAdded) {
      toast({
        title: "Projet déjà ajouté !",
        description: "Vous pouvez suivre ce projet dans votre Tableau de bord.",
        variant: "default",
      });
      navigate('/dashboard');
      return;
    }

    const success = addProject(project.type);
    if (success) {
      toast({
        title: "Projet ajouté avec succès ! ✅",
        description: `Le projet "${project.clientTitle}" est maintenant dans votre tableau de bord.`,
      });
      navigate('/dashboard');
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-3xl shadow-soft overflow-hidden flex flex-col"
      whileHover={{ y: -5 }}
    >
      <div className="h-48 w-full bg-gray-100 flex items-center justify-center">
        {project.coverImage ? (
          <img src={project.coverImage} alt={project.clientTitle} className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag className="h-16 w-16 text-gray-300" />
        )}
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{project.clientTitle}</h3>
        <p className="text-gray-600 text-sm flex-grow mb-6">
          {project.clientDescription || 'Ce nouveau projet est disponible. Ajoutez-le à votre tableau de bord pour en savoir plus.'}
        </p>
        <Button 
          onClick={handleCtaClick}
          className={`w-full mt-auto rounded-xl ${isProjectAdded ? 'bg-gray-300 hover:bg-gray-400' : 'gradient-green hover:opacity-90'}`}
          size="lg"
          disabled={isProjectAdded}
        >
          {isProjectAdded ? 'Voir le projet' : (project.ctaText || '👉 Ajouter ce projet')}
        </Button>
      </div>
    </motion.div>
  );
};

const OffersPage = () => {
  const { projectsData } = useAppContext();

  const offers = Object.values(projectsData).filter(p => p.isPublic);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Découvrez nos offres exclusives ⚡</h1>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">Choisissez l’opportunité qui vous correspond et suivez-la directement dans votre Tableau de bord.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {offers.map((project) => (
          <OfferCard key={project.type} project={project} />
        ))}
      </div>
    </motion.div>
  );
};

export default OffersPage;
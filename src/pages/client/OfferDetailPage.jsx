import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Check, RefreshCw, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Parse la description en blocs visuels (LEGACY — utilisé si pas de contentBlocks).
 */
const parseDescriptionToBlocks = (description) => {
  if (!description) return [];
  const lines = description.split('\n').filter(l => l.trim());
  const blocks = [];
  let currentTextBlock = [];
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const emojiMatch = trimmed.match(emojiRegex);
    if (emojiMatch) {
      if (currentTextBlock.length > 0) {
        blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
        currentTextBlock = [];
      }
      blocks.push({ type: 'feature', emoji: emojiMatch[0], text: trimmed.slice(emojiMatch[0].length).trim() });
    } else {
      currentTextBlock.push(trimmed);
    }
  }
  if (currentTextBlock.length > 0) {
    blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
  }
  return blocks;
};

// ═══ Rendu des content blocks (V2 — Page Builder) ═══

// Taille du bloc → largeur max sur desktop
const SIZE_TO_WIDTH = {
  small: 'max-w-sm',
  medium: 'max-w-lg',
  large: 'max-w-xl',
  full: 'max-w-2xl',
};

// Taille du bloc → hauteur hero image
const SIZE_TO_HERO_H = {
  small: 'h-36',
  medium: 'h-52',
  large: 'h-64',
  full: 'h-72',
};

// Taille du bloc → taille texte
const SIZE_TO_TEXT = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  full: 'text-base',
};

const ContentBlockRenderer = ({ block, project, index, isFirst }) => {
  const c = block.content || {};
  const delay = 0.05 + index * 0.06;
  const size = block.size || 'full';
  const widthCls = SIZE_TO_WIDTH[size] || 'max-w-2xl';
  const textCls = SIZE_TO_TEXT[size] || 'text-sm';

  switch (block.type) {
    case 'hero-image': {
      // Hauteur basée sur c.height (Petit/Moyen/Grand dans l'éditeur)
      const heroH = c.height === 'small' ? 'h-36' : c.height === 'large' ? 'h-72' : 'h-52';
      const fitCls = c.fit === 'contain' ? 'object-contain' : 'object-cover';
      return (
        <div className={`relative ${heroH} bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden`}>
          {c.url ? (
            <img src={c.url} alt="" className={`w-full h-full ${fitCls}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-16 w-16 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
        </div>
      );
    }

    case 'title':
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
          className={`px-5 md:px-8 -mt-6 relative z-10 ${widthCls} mx-auto`}
        >
          <div className="bg-white rounded-2xl shadow-md px-5 py-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{project?.icon}</span>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{c.text}</h1>
            </div>
          </div>
        </motion.div>
      );

    case 'tagline':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay }}
          className={`px-5 md:px-8 pb-3 ${widthCls} mx-auto`}
        >
          <p className={`${textCls} text-gray-600 leading-relaxed`}>{c.text}</p>
        </motion.div>
      );

    case 'feature':
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay }}
          className={`px-5 md:px-8 py-1 ${widthCls} mx-auto`}
        >
          <div className="flex gap-3 p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-xl">
              {c.emoji || '⚡'}
            </div>
            <p className={`${textCls} text-gray-700 leading-relaxed flex-1 pt-1.5`}>{c.text}</p>
          </div>
        </motion.div>
      );

    case 'text':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay }}
          className={`px-5 md:px-8 py-2 ${widthCls} mx-auto`}
        >
          <p className={`${textCls} text-gray-600 leading-relaxed`}>{c.text}</p>
        </motion.div>
      );

    case 'image': {
      const imgH = c.height === 'small' ? 'h-28' : c.height === 'large' ? 'h-56' : 'h-40';
      const imgFit = c.fit === 'contain' ? 'object-contain' : 'object-cover';
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay }}
          className={`px-5 md:px-8 py-2 ${widthCls} mx-auto`}
        >
          {c.url ? (
            <div>
              <img src={c.url} alt="" className={`w-full ${imgH} ${imgFit} rounded-2xl`} />
              {c.caption && <p className="text-xs text-gray-400 mt-1.5 text-center">{c.caption}</p>}
            </div>
          ) : (
            <div className={`w-full ${imgH} rounded-2xl bg-gray-200 flex items-center justify-center`}>
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </motion.div>
      );
    }

    case 'divider':
      if (c.style === 'dots') return <div className="text-center py-3 text-gray-300 text-sm tracking-[0.4em]">• • •</div>;
      if (c.style === 'space') return <div className="h-6" />;
      return <div className="px-8 py-3"><hr className="border-gray-200" /></div>;

    // CTA est géré séparément en sticky bottom, on skip ici
    case 'cta':
      return null;

    default:
      return null;
  }
};

// ─── Bloc "feature" avec emoji (LEGACY) ───
const FeatureBlock = ({ emoji, text, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 + index * 0.08 }}
    className="flex gap-3 p-4 rounded-2xl bg-white shadow-sm border border-gray-100"
  >
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-xl">
      {emoji}
    </div>
    <p className="text-sm text-gray-700 leading-relaxed flex-1 pt-1.5">{text}</p>
  </motion.div>
);

// ─── Bloc texte normal (LEGACY) ───
const TextBlock = ({ content, index }) => (
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.1 + index * 0.08 }}
    className="text-sm text-gray-600 leading-relaxed px-1"
  >
    {content}
  </motion.p>
);

const OfferDetailPage = () => {
  const { projectType } = useParams();
  const navigate = useNavigate();
  const { projectsData, currentUser, setCurrentUser, updateProspect } = useAppContext();
  const [projectStatus, setProjectStatus] = useState('actif');
  const [isLoading, setIsLoading] = useState(false);

  const project = projectsData[projectType];
  const isProjectAdded = currentUser?.tags?.includes(projectType) || false;
  const isInactive = isProjectAdded && (projectStatus === 'abandon' || projectStatus === 'archive');

  // Charger le statut du projet
  useEffect(() => {
    const loadStatus = async () => {
      if (!currentUser?.id || !isProjectAdded) return;
      const { data } = await supabase
        .from('project_infos')
        .select('status')
        .eq('prospect_id', currentUser.id)
        .eq('project_type', projectType)
        .single();
      if (data) setProjectStatus(data.status || 'actif');
    };
    loadStatus();
  }, [currentUser, projectType, isProjectAdded]);

  // Parser la description en blocs
  const legacyBlocks = parseDescriptionToBlocks(project?.clientDescription);
  
  // ✅ V2 : Utiliser contentBlocks si disponibles, sinon fallback legacy
  const contentBlocks = project?.contentBlocks || project?.content_blocks;
  const useV2 = contentBlocks && contentBlocks.length > 0;

  const handleAddProject = async () => {
    if (!currentUser?.id) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const updatedTags = [...(currentUser.tags || []), projectType];
      await updateProspect({ id: currentUser.id, tags: updatedTags });

      // Initialiser les étapes
      if (project.steps?.length > 0) {
        const initialSteps = JSON.parse(JSON.stringify(project.steps));
        initialSteps[0].status = 'in_progress';

        const { data: prospectData } = await supabase
          .from('prospects')
          .select('organization_id')
          .eq('id', currentUser.id)
          .single();

        if (prospectData?.organization_id) {
          await supabase
            .from('project_steps_status')
            .upsert({
              prospect_id: currentUser.id,
              project_type: projectType,
              organization_id: prospectData.organization_id,
              steps: initialSteps,
              updated_at: new Date().toISOString()
            }, { onConflict: 'prospect_id,project_type' });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCurrentUser({ ...currentUser, tags: updatedTags });
      toast({
        title: "Projet ajouté ! ✅",
        description: `"${project.clientTitle || project.title}" est dans votre tableau de bord.`,
        className: "bg-green-500 text-white"
      });
      navigate('/dashboard', { state: { openProjectType: projectType } });
    } catch (error) {
      logger.error('Erreur ajout projet:', error);
      toast({ title: "Erreur", description: "Impossible d'ajouter le projet.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      await supabase.from('project_infos').upsert({
        prospect_id: currentUser.id, project_type: projectType, status: 'actif', data: {}
      }, { onConflict: 'prospect_id,project_type' });

      await supabase.from('project_history').insert({
        prospect_id: currentUser.id, project_type: projectType,
        event_type: 'status', description: 'Projet réactivé par le client'
      });

      toast({ title: "Projet réactivé ! ✅", className: "bg-green-500 text-white" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      logger.error('Erreur réactivation:', error);
      toast({ title: "Erreur", description: "Impossible de réactiver.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Projet introuvable
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <ShoppingBag className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">Offre introuvable</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/dashboard/offres')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux offres
        </Button>
      </div>
    );
  }

  const title = project.clientTitle || project.title;
  
  // CTA text — priorité aux contentBlocks V2, sinon legacy
  const ctaText = useV2
    ? (contentBlocks.find(b => b.type === 'cta')?.content?.text || project.ctaText || '🚀 Lancer ce projet')
    : (project.ctaText || '🚀 Lancer ce projet');

  // Legacy blocks parsing
  const firstLine = !useV2 && legacyBlocks.length > 0 && legacyBlocks[0].type === 'text' ? legacyBlocks[0].content : null;
  const featureBlocks = !useV2 ? legacyBlocks.filter(b => b.type === 'feature') : [];
  const otherTextBlocks = !useV2 ? legacyBlocks.filter((b, i) => b.type === 'text' && i > 0) : [];

  // V2 : séparer le hero (rendu avant le bouton retour) du reste
  const v2HeroBlock = useV2 ? contentBlocks.find(b => b.type === 'hero-image') : null;
  const v2OtherBlocks = useV2 ? contentBlocks.filter(b => b.type !== 'hero-image') : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      
      {/* ═══ MODE V2 (contentBlocks du Page Builder) ═══ */}
      {useV2 ? (
        <>
          {/* Hero image V2 */}
          <div className="relative">
            {v2HeroBlock ? (
              <ContentBlockRenderer block={v2HeroBlock} project={project} index={0} isFirst />
            ) : (
              <div className="w-full h-52 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-gray-400" />
              </div>
            )}
            {/* Bouton retour */}
            <button
              onClick={() => navigate('/dashboard/offres')}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-4 w-4 text-gray-700" />
            </button>
            {isProjectAdded && !isInactive && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold shadow-md">
                  <Check className="h-3 w-3" /> Actif
                </span>
              </div>
            )}
          </div>

          {/* Autres blocs V2 */}
          <div className="max-w-2xl mx-auto relative z-10 pt-2">
            {v2OtherBlocks.map((block, i) => (
              <ContentBlockRenderer key={block.id || i} block={block} project={project} index={i} isFirst={i === 0 && !v2HeroBlock} />
            ))}
          </div>
        </>
      ) : (
        /* ═══ MODE LEGACY (description parsée) ═══ */
        <>
          <div className="relative">
            <div className="w-full h-52 md:h-72 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
              {project.coverImage ? (
                <img src={project.coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            </div>
            <button
              onClick={() => navigate('/dashboard/offres')}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-4 w-4 text-gray-700" />
            </button>
            {isProjectAdded && !isInactive && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold shadow-md">
                  <Check className="h-3 w-3" /> Actif
                </span>
              </div>
            )}
          </div>

          <div className="px-5 md:px-8 -mt-6 relative z-10 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-5 mb-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{project.icon}</span>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
              </div>
              {firstLine && (
                <p className="text-sm text-gray-600 leading-relaxed">{firstLine}</p>
              )}
            </motion.div>

            {featureBlocks.length > 0 && (
              <div className="space-y-3 mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Les avantages</h2>
                {featureBlocks.map((block, i) => (
                  <FeatureBlock key={i} emoji={block.emoji} text={block.text} index={i} />
                ))}
              </div>
            )}

            {otherTextBlocks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-3">
                {otherTextBlocks.map((block, i) => (
                  <TextBlock key={i} content={block.content} index={featureBlocks.length + i} />
                ))}
              </div>
            )}

            {legacyBlocks.length === 0 && project.clientDescription && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {project.clientDescription}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ CTA Bottom Sticky (mobile) ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
        <div className="max-w-2xl mx-auto">
          {isInactive ? (
            <Button
              onClick={handleReactivate}
              disabled={isLoading}
              className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base shadow-lg"
            >
              {isLoading ? '⏳ Réactivation...' : <><RefreshCw className="mr-2 h-4 w-4" /> Réactiver ce projet</>}
            </Button>
          ) : isProjectAdded ? (
            <Button
              onClick={() => navigate('/dashboard', { state: { openProjectType: projectType } })}
              className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base shadow-lg"
            >
              ➤ Voir mon projet <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleAddProject}
              disabled={isLoading}
              className="w-full h-12 rounded-2xl gradient-green hover:opacity-90 text-white font-semibold text-base shadow-lg"
            >
              {isLoading ? '⏳ Ajout en cours...' : ctaText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferDetailPage;

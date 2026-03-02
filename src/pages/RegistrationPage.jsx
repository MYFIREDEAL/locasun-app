import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { User, Mail, Phone, Building2 } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSupabaseProjectTemplates } from '@/hooks/useSupabaseProjectTemplates'; // 🔥 MULTI-TENANT

const RegistrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slugUser } = useParams();
  const { currentUser, activeAdminUser, setActiveAdminUser } = useAppContext(); // 🔥 Retiré projectsData
  const { organizationId } = useOrganization();
  
  // 🔥 MULTI-TENANT: Charger les templates filtrés par organization
  const { projectTemplates, loading: templatesLoading } = useSupabaseProjectTemplates({ organizationId });
  
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [affiliateInfo, setAffiliateInfo] = useState({ id: null, name: null });
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false); // État pour afficher le message de succès

  // 🔥 PROTECTION: Empêche toute session admin de polluer l'inscription client
  useEffect(() => {
    // Purger TOUT state admin du localStorage au montage
    localStorage.removeItem("activeAdminUser");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("users");
    
    if (activeAdminUser) {
      setActiveAdminUser(null);
    }
  }, [activeAdminUser, setActiveAdminUser]);

  // 🔥 MULTI-TENANT: Utiliser projectTemplates du hook (filtré par org)
  const projectOptions = useMemo(() => {
    if (!projectTemplates || projectTemplates.length === 0) return [];
    return projectTemplates
        .filter(p => p.isPublic || p.is_public)
        .map(p => ({
            id: p.type,
            label: p.clientTitle || p.client_title,
            icon: p.icon
        }));
  }, [projectTemplates]);

  // 🔌 INTEGRATIONS: Pré-sélection via query param ?project={slug}
  // Le slug est comparé à slugify(p.type) des projets de CETTE org uniquement
  // Si invalide ou absent → ignoré silencieusement
  useEffect(() => {
    const projectParam = new URLSearchParams(location.search).get('project');
    if (!projectParam || projectOptions.length === 0) return;

    const matchedProject = projectOptions.find(
      p => slugify(p.id) === projectParam.toLowerCase()
    );

    if (matchedProject && !selectedProjects.includes(matchedProject.id)) {
      setSelectedProjects(prev => [...prev, matchedProject.id]);
    }
  }, [projectOptions, location.search]); // Re-run quand les templates chargent

  // ✅ Toast si l'utilisateur est déjà connecté
  useEffect(() => {
    if (currentUser) {
      toast({
        title: "Vous êtes déjà connecté",
        description: "Redirection vers votre espace client...",
        variant: "destructive",
      });
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  }, [currentUser, navigate]);

  // 🔥 Charger l'info d'affiliation directement depuis Supabase (pas besoin de hook)
  useEffect(() => {
    const affiliateSlug = slugUser || sessionStorage.getItem('affiliateUser');
    if (!affiliateSlug) return;

    // Requête directe sans session (table users est accessible en lecture)
    // ✅ FIX: Chercher par affiliate_slug au lieu de id
    supabase
      .from('users')
      .select('id, name, affiliate_slug')
      .eq('affiliate_slug', affiliateSlug)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setAffiliateInfo({ id: data.id, name: data.name });
        } else {
          console.error('❌ Commercial non trouvé pour le slug:', affiliateSlug, error);
        }
      });
  }, [slugUser]);

  const handleCheckboxChange = (projectId) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Le nom complet est requis.";
    if (!formData.email) newErrors.email = "L'adresse e-mail est requise.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "L'adresse e-mail est invalide.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (selectedProjects.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un projet.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const finalProjects = [...new Set(selectedProjects)];

      // 🔥 ÉTAPE 1: Vérifier si prospect existe déjà DANS CETTE ORGANISATION (RPC pour éviter 403)
      // Multi-tenant : même email peut s'inscrire dans plusieurs organisations
      const { data: prospectExists, error: checkError } = await supabase
        .rpc('check_prospect_exists_in_org', { 
          p_email: formData.email.trim(),
          p_organization_id: organizationId
        });

      if (checkError) {
        console.error('Error checking prospect:', checkError);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier l'email. Réessayez.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (prospectExists) {
        toast({
          title: "Compte existant",
          description: "Un compte existe déjà avec cet email dans cette organisation. Connectez-vous plutôt.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 🔥 ÉTAPE 2: Créer le prospect via RPC server-side
      // La RPC s'exécute avec SECURITY DEFINER (droits admin)
      // Contourne les limites RLS du client anonyme
      const { data: prospectId, error: prospectError } = await supabase
        .rpc('create_affiliated_prospect', {
          p_name: formData.name,
          p_email: formData.email.trim(),
          p_phone: null,
          p_company: null,
          p_address: '',
          p_affiliate_slug: slugUser || null,
          p_tags: finalProjects,
          p_status: null, // null = auto-detect first pipeline step
          p_host: window.location.hostname // 🔥 REQUIS pour résolution organization_id
        });

      if (prospectError) {
        console.error('❌ Erreur création prospect:', prospectError);
        throw prospectError;
      }

      // 🔥 ÉTAPE 3: Envoyer le Magic Link
      // 🔥 Utiliser le hostname actuel pour rediriger vers la bonne org
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: formData.email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        }
      });

      if (magicLinkError) {
        throw magicLinkError;
      }

      // ✅ NOTE: Les étapes projet (project_steps_status) sont automatiquement initialisées 
      // par le trigger PostgreSQL 'trigger_init_project_steps_on_tags_changed' 
      // quand la RPC 'create_affiliated_prospect' crée le prospect avec tags[]

      sessionStorage.removeItem('affiliateUser');

      // ✅ AFFICHER LE MESSAGE "MAGIC LINK ENVOYÉ"
      setMagicLinkSent(true);
      toast({
        title: "✅ Compte créé !",
        description: "Un email vous a été envoyé. Cliquez sur le lien pour accéder à votre espace.",
        className: "bg-green-500 text-white",
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Si le Magic Link a été envoyé, afficher un message de succès
  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-soft text-center"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">✅ Inscription réussie !</h1>
            <p className="text-lg text-gray-600 mb-4">
              Un email avec un lien de connexion vous a été envoyé à :
            </p>
            <p className="text-xl font-semibold text-blue-600 mb-6">{formData.email}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                📧 <strong>Vérifiez votre boîte mail</strong> et cliquez sur le lien pour accéder à votre espace client.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Le lien est valide pendant 60 minutes.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/client-access')} 
            className="w-full gradient-blue text-white"
          >
            Retour à la connexion
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-soft"
      >
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Choisissez vos projets</h1>
        <p className="text-center text-gray-600 mb-8">Commencez par sélectionner les projets qui vous intéressent.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {projectOptions.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <Label
                  htmlFor={project.id}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedProjects.includes(project.id) ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                >
                  <Checkbox
                    id={project.id}
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => handleCheckboxChange(project.id)}
                  />
                  <span className="text-base font-medium text-gray-800 flex items-center">
                    <span className="mr-2">{project.icon}</span> {project.label}
                  </span>
                </Label>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4 pt-6 border-t mt-6">
             <div>
                <Label htmlFor="name">Nom complet</Label>
                <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="name" placeholder="Jean Dupont" onChange={handleInputChange} value={formData.name} className="pl-10" disabled={loading} />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
             </div>
             <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="email" type="email" placeholder="jean.dupont@email.com" onChange={handleInputChange} value={formData.email} className="pl-10" disabled={loading} />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
             </div>
          </div>
          
          <Button type="submit" size="lg" className="w-full gradient-green text-white text-base font-semibold py-6 rounded-xl shadow-soft hover:shadow-lg transition-all transform hover:scale-105" disabled={loading}>
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => navigate('/client-access')}
                className="text-blue-600 font-medium hover:underline"
              >
                Se connecter
              </button>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegistrationPage;
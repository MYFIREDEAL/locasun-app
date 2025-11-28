import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { User, Mail } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const { slugUser } = useParams();
  const { projectsData } = useAppContext();
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [affiliateInfo, setAffiliateInfo] = useState({ id: null, name: null });
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false); // État pour afficher le message de succès

  const projectOptions = useMemo(() => {
    if (!projectsData || Object.keys(projectsData).length === 0) return [];
    return Object.values(projectsData)
        .filter(p => p.isPublic)
        .map(p => ({
            id: p.type,
            label: p.clientTitle,
            icon: p.icon
        }));
  }, [projectsData]);

  // 🔥 Charger l'info d'affiliation directement depuis Supabase (pas besoin de hook)
  useEffect(() => {
    const affiliateId = slugUser || sessionStorage.getItem('affiliateUser');
    if (!affiliateId) return;

    // Requête directe sans session (table users est accessible en lecture)
    supabase
      .from('users')
      .select('id, name')
      .eq('id', affiliateId)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setAffiliateInfo({ id: data.id, name: data.name });
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

      // Vérifier si prospect existe déjà
      const { data: existingProspect } = await supabase
        .from('prospects')
        .select('*')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingProspect) {
        toast({
          title: "Compte existant",
          description: "Un compte existe déjà avec cet email. Utilisez la connexion.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // ÉTAPE 1 : Envoyer le Magic Link (Supabase crée le compte auth automatiquement)
      const { data: otpData, error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/dashboard`,
        }
      });

      if (magicLinkError) {
        console.error('❌ Erreur Magic Link:', magicLinkError);
        throw magicLinkError;
      }

      console.log('✅ Magic Link envoyé:', otpData);

      // ÉTAPE 2 : Créer le prospect
      // Par défaut, assigner le propriétaire à Jack Luc si aucun affilié détecté
      const DEFAULT_JACK_USER_ID = '82be903d-9600-4c53-9cd4-113bfaaac12e';

      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: null,
          company_name: null,
          address: '',
          owner_id: affiliateInfo.id || DEFAULT_JACK_USER_ID,
          status: 'Intéressé',
          tags: finalProjects,
          has_appointment: false,
          affiliate_name: affiliateInfo.name || 'Jack Luc',
        }])
        .select()
        .single();

      if (prospectError) {
        console.error('❌ Erreur création prospect:', prospectError);
        throw prospectError;
      }

      console.log('✅ Prospect créé:', prospectData);

      sessionStorage.removeItem('affiliateUser');

      // Afficher le message de succès
      setMagicLinkSent(true);

      toast({
        title: "✅ Magic Link envoyé !",
        description: "Vérifiez votre boîte mail et cliquez sur le lien pour accéder à votre espace.",
        className: "bg-green-500 text-white",
        duration: 8000,
      });
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
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
const RegistrationPageOLD = () => {
  const navigate = useNavigate();
  const { slugUser } = useParams();
  const { projectsData, setUserProjects, addProspect, setCurrentUser } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger les utilisateurs Supabase
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
  const [errors, setErrors] = useState({});
  const [affiliateInfo, setAffiliateInfo] = useState({ id: null, name: null });

  // 🔥 Transformer array Supabase en object pour compatibilité
  const users = useMemo(() => {
    return supabaseUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [supabaseUsers]);

  const projectOptions = useMemo(() => 
    Object.values(projectsData)
        .filter(p => p.isPublic)
        .map(p => ({
            id: p.type,
            label: p.clientTitle,
            icon: p.icon
        })), 
  [projectsData]);

  useEffect(() => {
    // Attend que users soit bien chargé avant d'initialiser affiliateInfo
    if (!users || Object.keys(users).length === 0) return;
    const affiliateId = slugUser || sessionStorage.getItem('affiliateUser');
    if (affiliateId) {
      const owner = users[affiliateId];
      if (owner) {
        setAffiliateInfo({ id: owner.id, name: owner.name });
      }
    }
  }, [slugUser, users]);

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
    if (!formData.phone) newErrors.phone = "Le numéro de téléphone est requis.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const finalProjects = [...new Set(selectedProjects)];

      // 🔥 ÉTAPE 1: Créer uniquement le prospect (pas de compte Auth pour l'instant)
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company || null,
          address: '',
          owner_id: affiliateInfo.id || DEFAULT_JACK_USER_ID, // Jack Luc par défaut
          status: 'Intéressé',
          tags: finalProjects, // Projets sélectionnés
          has_appointment: false,
          affiliate_name: affiliateInfo.name || 'Jack Luc',
        }])
        .select()
        .single();

      if (prospectError) {
        console.error('❌ Erreur création prospect:', prospectError);
        toast({
          title: "Erreur",
          description: prospectError.message === 'duplicate key value violates unique constraint "prospects_email_key"'
            ? "Un compte existe déjà avec cet email."
            : "Impossible de créer votre profil. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      sessionStorage.removeItem('affiliateUser');

      toast({
        title: "✅ Inscription réussie !",
        description: "Vous allez recevoir un lien de connexion par email.",
        className: "bg-blue-500 text-white",
      });

      // 🔥 ÉTAPE 2: Rediriger vers /client-access avec email pré-rempli
      navigate('/client-access', { state: { email: formData.email } });
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

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
                    <Input id="name" placeholder="Jack Dupont" onChange={handleInputChange} value={formData.name} className="pl-10" />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
             </div>
             <div>
                <Label htmlFor="company">Société (Optionnel)</Label>
                <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="company" placeholder="Nom de votre société" onChange={handleInputChange} value={formData.company} className="pl-10" />
                </div>
             </div>
             <div>
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="phone" type="tel" placeholder="06 12 34 56 78" onChange={handleInputChange} value={formData.phone} className="pl-10" />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
             </div>
             <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="email" type="email" placeholder="jack.dupont@email.com" onChange={handleInputChange} value={formData.email} className="pl-10" />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
             </div>
          </div>
          
          <Button type="submit" size="lg" className="w-full gradient-green text-white text-base font-semibold py-6 rounded-xl shadow-soft hover:shadow-lg transition-all transform hover:scale-105">
            Valider et accéder à mon espace
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default RegistrationPage;
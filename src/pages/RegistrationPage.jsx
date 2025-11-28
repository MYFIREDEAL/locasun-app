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
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { supabase } from '@/lib/supabase';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const { slugUser } = useParams();
  const { projectsData } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers();
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [affiliateInfo, setAffiliateInfo] = useState({ id: null, name: null });
  const [loading, setLoading] = useState(false);

  // Transformer array Supabase en object pour compatibilité
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

      // Créer le prospect (sans user_id pour l'instant - sera ajouté au premier login Magic Link)
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: null,
          company_name: null,
          address: '',
          owner_id: affiliateInfo.id || null,
          status: 'Intéressé',
          tags: finalProjects,
          has_appointment: false,
          affiliate_name: affiliateInfo.name || null,
        }])
        .select()
        .single();

      if (prospectError) {
        throw prospectError;
      }

      // Envoyer le Magic Link
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/dashboard`,
        }
      });

      if (magicLinkError) {
        throw magicLinkError;
      }

      sessionStorage.removeItem('affiliateUser');

      toast({
        title: "✅ Inscription réussie !",
        description: "Consultez votre boîte mail pour accéder à votre espace.",
        className: "bg-green-500 text-white",
      });

      // Rediriger vers une page de confirmation
      setTimeout(() => navigate('/client-access'), 2000);
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
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', company: '' });
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
    if (!formData.password) newErrors.password = "Le mot de passe est requis.";
    else if (formData.password.length < 6) newErrors.password = "Le mot de passe doit contenir au moins 6 caractères.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const finalProjects = [...new Set(selectedProjects)];

      // 🔥 ÉTAPE 1: Créer le compte dans Supabase Auth (ESPACE CLIENT, pas admin!)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            email_confirm: false, // Forcer la confirmation à false
          }
        }
      });

      if (authError) {
        console.error('❌ Erreur Auth:', authError);
        toast({
          title: "Erreur d'inscription",
          description: authError.message === 'User already registered' 
            ? "Un compte existe déjà avec cet email."
            : authError.message,
          variant: "destructive",
        });
        return;
      }

      if (!authData.user || !authData.session) {
        toast({
          title: "Erreur",
          description: "Impossible de créer le compte. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // 🔥 IMPORTANT : Attendre que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 500));

      // 🔥 ÉTAPE 2: Créer le prospect dans public.prospects avec user_id
      // La session est maintenant active, donc auth.uid() retournera le bon user_id
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .insert([{
          user_id: authData.user.id, // ⚠️ IMPORTANT: Lier le prospect au compte Auth
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company || null,
          address: '',
          owner_id: affiliateInfo.id || null, // Commercial qui a parrainé (si lien d'affiliation)
          status: 'Intéressé',
          tags: finalProjects, // Projets sélectionnés
          has_appointment: false,
          affiliate_name: affiliateInfo.name || null,
        }])
        .select()
        .single();

      if (prospectError) {
        console.error('❌ Erreur création prospect:', prospectError);
        // Si le prospect existe déjà, supprimer le compte Auth créé
        await supabase.auth.signOut();
        toast({
          title: "Erreur",
          description: "Impossible de créer votre profil. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // 🔥 ÉTAPE 3: Définir currentUser dans le contexte (format app)
      const clientUserData = {
        id: prospectData.id,
        userId: prospectData.user_id, // UUID de auth.users
        name: prospectData.name,
        email: prospectData.email,
        phone: prospectData.phone,
        company: prospectData.company_name,
        address: prospectData.address,
        tags: prospectData.tags,
        status: prospectData.status,
        ownerId: prospectData.owner_id,
        affiliateName: prospectData.affiliate_name,
        hasAppointment: prospectData.has_appointment,
      };

      setCurrentUser(clientUserData);
      
      sessionStorage.removeItem('affiliateUser');

      toast({
        title: "✅ Inscription réussie !",
        description: "Bienvenue dans votre espace client Evatime.",
        className: "bg-blue-500 text-white",
      });

      // 🔥 ÉTAPE 4: Rediriger vers le dashboard CLIENT
      navigate('/dashboard');
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
             <div>
                <Label htmlFor="password">Mot de passe</Label>
                 <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="password" type="password" placeholder="••••••••" onChange={handleInputChange} value={formData.password} className="pl-10" />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
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
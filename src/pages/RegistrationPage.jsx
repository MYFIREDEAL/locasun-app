import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { User, Phone, Mail, Lock, Building2 } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';

const RegistrationPage = () => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const finalProjects = [...new Set(selectedProjects)];

      const newProspect = {
        id: `prospect-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        address: '', // Address can be added later
        tags: finalProjects,
        status: 'Intéressé',
        hasAppointment: false,
        ownerId: affiliateInfo.id || 'user-1', // Default to admin if no affiliate
      };

      addProspect(newProspect);
      
      localStorage.setItem('userProjects', JSON.stringify(finalProjects));
      setUserProjects(finalProjects);

      const currentUserData = { 
        id: newProspect.id, 
        name: newProspect.name, 
        email: newProspect.email,
        phone: newProspect.phone,
        company: newProspect.company,
        address: newProspect.address
      };
      
      let affiliateName = affiliateInfo.name;
      if (!affiliateName && affiliateInfo.id && users[affiliateInfo.id]) {
        affiliateName = users[affiliateInfo.id].name;
      }
      if (!affiliateName && users['user-1']) {
        affiliateName = users['user-1'].name;
      }
      if (!affiliateName) {
        affiliateName = 'Admin';
      }
      setCurrentUser(currentUserData, affiliateName);
      
      sessionStorage.removeItem('affiliateUser');

      toast({
        title: "Inscription réussie !",
        description: "Bienvenue dans votre espace Evatime.",
      });
      navigate('/dashboard');
    }
  };

  // DEBUG: Affiche les infos d'affiliation récupérées
  console.log('Affiliation DEBUG:', { affiliateInfo });
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
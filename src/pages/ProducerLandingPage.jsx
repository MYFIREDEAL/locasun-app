import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { User, Phone, Mail, Lock, Building, DollarSign, Zap, Users } from 'lucide-react';

const ProducerLandingPage = () => {
  const navigate = useNavigate();
  const { setUserProjects, addProspect, setCurrentUser } = useAppContext();
  const [formData, setFormData] = useState({ company: '', name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.company) newErrors.company = "Le nom de l'entreprise est requis.";
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
      const projects = ['ProducteurPro'];
      
      const newProspect = {
        id: `prospect-${Date.now()}`,
        name: formData.name,
        companyName: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: '',
        tags: projects,
        status: 'Intéressé',
        hasAppointment: false,
      };

      addProspect(newProspect);

      // 🔥 PHASE 4: localStorage.setItem('userProjects') supprimé - currentUser.tags géré par Supabase
      if(setUserProjects) setUserProjects(projects);

      const currentUserData = { id: newProspect.id, name: newProspect.name, email: newProspect.email };
      // 🔥 PHASE 3: localStorage.setItem('currentUser') supprimé - Supabase gère via loadAuthUser()
      setCurrentUser(currentUserData);
      
      toast({
        title: "Inscription réussie !",
        description: "Bienvenue dans votre espace partenaire Evatime.",
      });
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Content Section */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight">
              Vendez votre électricité à un tarif <span className="text-green-400">plus attractif</span> que l'EDF OA.
            </h1>
            <p className="text-lg text-gray-300">
              Grâce à l'autoconsommation collective (ACC), vous pouvez vendre votre surplus d'énergie directement aux consommateurs locaux, en court-circuitant les tarifs d'obligation d'achat. Augmentez la rentabilité de vos centrales, qu'il s'agisse d'une seule installation ou d'un parc entier.
            </p>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-500/20 p-2 rounded-full"><DollarSign className="h-5 w-5 text-green-400" /></div>
                <p><span className="font-bold">Rentabilité Maximale :</span> Obtenez un meilleur prix pour chaque kWh produit.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-500/20 p-2 rounded-full"><Users className="h-5 w-5 text-green-400" /></div>
                <p><span className="font-bold">Circuit Court :</span> Vendez localement et renforcez votre impact territorial.</p>
              </div>
               <div className="flex items-start space-x-3">
                <div className="bg-green-500/20 p-2 rounded-full"><Zap className="h-5 w-5 text-green-400" /></div>
                <p><span className="font-bold">Simplicité Garantie :</span> Notre plateforme gère la complexité administrative pour vous.</p>
              </div>
            </div>
          </motion.div>

          {/* Form Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20"
          >
            <h2 className="text-3xl font-bold text-center mb-6">Devenez Partenaire Producteur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <Label htmlFor="company" className="text-gray-300">Nom de l'entreprise</Label>
                  <div className="relative mt-1">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="company" placeholder="Solar Corp" onChange={handleInputChange} value={formData.company} className="pl-10 bg-white/10 text-white placeholder-gray-400 border-white/30 focus:ring-green-400 focus:border-green-400" />
                  </div>
                  {errors.company && <p className="text-red-400 text-xs mt-1">{errors.company}</p>}
               </div>
               <div>
                  <Label htmlFor="name" className="text-gray-300">Nom complet</Label>
                  <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="name" placeholder="Jack Dupont" onChange={handleInputChange} value={formData.name} className="pl-10 bg-white/10 text-white placeholder-gray-400 border-white/30 focus:ring-green-400 focus:border-green-400" />
                  </div>
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
               </div>
               <div>
                  <Label htmlFor="phone" className="text-gray-300">Téléphone</Label>
                  <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="phone" type="tel" placeholder="06 12 34 56 78" onChange={handleInputChange} value={formData.phone} className="pl-10 bg-white/10 text-white placeholder-gray-400 border-white/30 focus:ring-green-400 focus:border-green-400" />
                  </div>
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
               </div>
               <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="email" type="email" placeholder="jack.dupont@email.com" onChange={handleInputChange} value={formData.email} className="pl-10 bg-white/10 text-white placeholder-gray-400 border-white/30 focus:ring-green-400 focus:border-green-400" />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
               </div>
               <div>
                  <Label htmlFor="password" className="text-gray-300">Mot de passe</Label>
                   <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="password" type="password" placeholder="••••••••" onChange={handleInputChange} value={formData.password} className="pl-10 bg-white/10 text-white placeholder-gray-400 border-white/30 focus:ring-green-400 focus:border-green-400" />
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
               </div>
              <Button type="submit" size="lg" className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 mt-4">
                Je maximise mes revenus
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProducerLandingPage;
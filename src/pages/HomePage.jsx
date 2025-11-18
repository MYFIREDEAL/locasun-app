import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';

const HowItWorksCard = ({ icon, title, description, badgeText, delay }) => (
  <motion.div
    className="bg-white border border-[#eef1f4] rounded-2xl shadow-card p-6 flex flex-col"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <h3 className="text-xl font-bold text-gray-800 mb-3">{icon} {title}</h3>
    <p className="text-gray-600 flex-grow">{description}</p>
    <div className="mt-4">
      <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
        {badgeText}
      </span>
    </div>
  </motion.div>
);

const LoginModal = ({ isOpen, onOpenChange, loginType }) => {
  const navigate = useNavigate();
  const { setCurrentUser, setActiveAdminUser, prospects } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      // Connexion via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier si c'est un user PRO ou un CLIENT
      if (loginType === 'pro') {
        // Récupérer les données du user PRO depuis public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (userError || !userData) {
          console.error('❌ Erreur détaillée:', userError);
          toast({
            title: "Erreur",
            description: `Compte professionnel introuvable. ${userError?.message || ''}`,
            variant: "destructive",
          });
          await supabase.auth.signOut();
          return;
        }

        // Connexion PRO réussie
        toast({
          title: "Connexion réussie !",
          description: "Redirection vers l'espace pro...",
          className: "bg-green-500 text-white",
        });
        
        // ✅ Transformer les données Supabase (snake_case → camelCase)
        const transformedUserData = {
          id: userData.id,
          userId: userData.user_id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          phone: userData.phone,
          avatarUrl: userData.avatar_url,
          managerId: userData.manager_id,
          accessRights: userData.access_rights, // ⚠️ IMPORTANT pour les droits d'accès
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
        };
        
        // ✅ Définir activeAdminUser pour les PRO (pas currentUser)
        setActiveAdminUser(transformedUserData);
        onOpenChange(false);
        setTimeout(() => navigate('/admin'), 500);
      } else {
        // Récupérer les données du CLIENT depuis public.prospects
        const { data: prospectData, error: prospectError } = await supabase
          .from('prospects')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (prospectError || !prospectData) {
          toast({
            title: "Erreur",
            description: "Compte client introuvable.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          return;
        }

        // Connexion CLIENT réussie
        toast({
          title: "Connexion réussie !",
          description: "Redirection vers votre espace client...",
          className: "bg-blue-500 text-white",
        });

        setCurrentUser(prospectData);
        onOpenChange(false);
        setTimeout(() => navigate('/dashboard'), 500);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la connexion.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = () => {
    toast({
      title: "🚧 Bientôt disponible",
      description: "La récupération de mot de passe n'est pas encore implémentée.",
    });
  };

  const title = loginType === 'pro' ? 'Connexion Espace Pro' : 'Connexion Espace Client';
  const buttonClass = loginType === 'pro' ? 'gradient-green text-white' : 'gradient-blue text-white';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-6 px-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="votre@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" placeholder="********" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className={`w-full ${buttonClass} text-lg py-6`}>
            Se connecter
          </Button>
          <div className="text-center">
            <button type="button" onClick={handleForgotPassword} className="text-sm text-blue-600 hover:underline">
              Mot de passe oublié ?
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const HomePage = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginType, setLoginType] = useState('client'); // 'client' or 'pro'
  const { slugUser } = useParams();

  useEffect(() => {
    if (slugUser) {
      sessionStorage.setItem('affiliateUser', slugUser);
    }
  }, [slugUser]);

  const openLoginModal = (type) => {
    setLoginType(type);
    setIsLoginOpen(true);
  };

  const registrationLink = slugUser ? `/inscription/${slugUser}` : '/inscription';

  return (
    <div className="bg-gray-50 relative">
      <header className="absolute top-0 right-0 p-4 md:p-6 z-20">
        <div className="flex items-center space-x-3">
          <Button onClick={() => openLoginModal('pro')} className="gradient-green text-white shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            Espace Pro
          </Button>
          <Button onClick={() => openLoginModal('client')} className="gradient-blue text-white shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            Espace Client
          </Button>
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} loginType={loginType} />

      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="relative w-full max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.7, ease: 'easeOut' }} 
            className="relative z-10 space-y-6"
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Gagnez <span className="text-green-600">35% </span> sur votre électricité,
              garantis entre 5 et 10 ans ⚡
            </motion.h1>
            <motion.h2 
              className="text-4xl md:text-5xl font-extrabold text-gray-800 leading-tight" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              grâce à une centrale solaire à côté de chez vous 🚀
            </motion.h2>

            <motion.p 
              className="max-w-2xl mx-auto text-lg text-gray-600" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.6, duration: 0.5 }}
            ></motion.p>
            
            <motion.div 
              className="flex flex-col md:flex-row items-center justify-center"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Link to={registrationLink}>
                <Button size="lg" className="gradient-green text-white px-8 py-6 rounded-2xl shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105 text-lg font-semibold">
                  Je démarre mon projet
                </Button>
              </Link>
              <a href="#comment-ca-marche" className="mt-3 md:mt-0 md:ml-4 text-base font-medium text-[#1976D2] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md">
                Comment ça marche ?
              </a>
            </motion.div>
          </motion.div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-3/4 -translate-y-3/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <section id="comment-ca-marche" className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-gray-800 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Comment ça marche ?
          </motion.h2>
          <motion.p 
            className="max-w-3xl mx-auto text-lg text-gray-600 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Un système simple et transparent qui permet de consommer l’électricité produite par une centrale solaire locale, avec des économies garanties.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <HowItWorksCard
              icon="☀️"
              title="Producteur"
              description="Centrale solaire photovoltaïque qui produit de l’électricité verte."
              badgeText="⚡ Production locale d’énergie renouvelable"
              delay={0.3}
            />
            <HowItWorksCard
              icon="🤝"
              title="PMO"
              description="Association qui gère et répartit l’énergie de manière équitable."
              badgeText="🔒 Gestion transparente et bénéfique pour tous"
              delay={0.4}
            />
            <HowItWorksCard
              icon="🏠"
              title="Consommateurs"
              description="Particuliers et entreprises qui bénéficient d’une électricité moins chère."
              badgeText="💰 Jusqu’à 40% d’économies sur la facture"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      <style jsx="true">{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { User, Mail, Phone, MapPin, Bell, Building2, Lock, LogOut } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Checkbox } from '@/components/ui/checkbox';
    import { toast } from '@/components/ui/use-toast';
    import { useLocation, useNavigate } from 'react-router-dom';
    import { useAppContext } from '@/App';
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
    import { supabase } from '@/lib/supabase';
    import { useSupabaseProspects } from '@/hooks/useSupabaseProspects';

    const SettingsSection = ({ title, children }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-card"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-6">{title}</h2>
        <div className="space-y-6">{children}</div>
      </motion.div>
    );

    const SettingsPage = () => {
      const location = useLocation();
      const navigate = useNavigate();
      const { currentUser, setCurrentUser } = useAppContext();
      const { updateProspect: updateSupabaseProspect } = useSupabaseProspects();
      const isProfilePage = location.pathname.includes('/profil');

      const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
      });

      // ❌ SUPPRIMÉ: passwordData (Client n'a plus de mot de passe - Magic Link uniquement)

      useEffect(() => {
        if (currentUser) {
          setFormData({
            name: currentUser.name || '',
            companyName: currentUser.companyName || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            address: currentUser.address || '',
          });
        }
      }, [currentUser]);

      const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
      };

      const handleSaveInfo = async () => {
        if (!currentUser) return;

        try {
          // Mettre à jour dans Supabase (table prospects)
          const result = await updateSupabaseProspect({
            id: currentUser.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.companyName,
            address: formData.address,
          });

          console.log('✅ [SettingsPage] Update result:', result);

          // Mettre à jour le contexte local avec les données retournées par Supabase
          // La RPC retourne un array, on prend le premier élément
          if (result && result.length > 0) {
            const dbProspect = result[0];
            const updatedUser = {
              id: dbProspect.id,
              name: dbProspect.name,
              email: dbProspect.email,
              phone: dbProspect.phone,
              companyName: dbProspect.company_name,
              address: dbProspect.address,
              tags: dbProspect.tags || [],
              userId: dbProspect.user_id,
              ownerId: dbProspect.owner_id,
              status: dbProspect.status,
              hasAppointment: dbProspect.has_appointment,
              affiliateName: dbProspect.affiliate_name,
              formData: dbProspect.form_data || {},
              createdAt: dbProspect.created_at,
              updatedAt: dbProspect.updated_at,
            };
            setCurrentUser(updatedUser);
            console.log('✅ [SettingsPage] currentUser mis à jour localement');
          }

          toast({
            title: "Profil mis a jour !",
            description: "Vos informations ont ete enregistrees avec succes.",
            className: "bg-green-100 border-green-300 text-green-800",
          });
        } catch (error) {
          console.error('Erreur sauvegarde profil:', error);
          toast({
            title: "Erreur",
            description: "Impossible de sauvegarder les modifications.",
            variant: "destructive",
          });
        }
      };

      const handleSavePreferences = () => {
        toast({
          title: `Sauvegarde des "Préférences de notifications"...`,
          description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
      };

      // ❌ SUPPRIMÉ: handleChangePassword (Client utilise Magic Link uniquement)

      const handleLogout = async () => {
        try {
          // Deconnexion de Supabase Auth
          await supabase.auth.signOut();
          
          // Nettoyer le contexte local
          setCurrentUser(null);
          localStorage.removeItem('evatime_current_user');
          
          toast({
            title: "Deconnexion reussie",
            description: "A bientot !",
          });
          
          navigate('/');
        } catch (error) {
          console.error('Erreur deconnexion:', error);
          // Deconnecter quand meme localement
          setCurrentUser(null);
          localStorage.removeItem('evatime_current_user');
          navigate('/');
        }
      };

      const pageTitle = isProfilePage ? "Mon Profil" : "Paramètres";
      const pageDescription = isProfilePage ? "Gérez vos informations personnelles et vos préférences." : "Gérez les paramètres de l'application.";

      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-gray-600 mt-1">{pageDescription}</p>
          </div>

          <SettingsSection title="Informations Personnelles">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nom complet</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input id="name" type="text" placeholder="Jack Dupont" className="pl-10" value={formData.name} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="companyName">Société</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input id="companyName" type="text" placeholder="Nom de votre société" className="pl-10" value={formData.companyName} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input id="email" type="email" placeholder="jack.dupont@email.com" className="pl-10" value={formData.email} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input id="phone" type="tel" placeholder="06 12 34 56 78" className="pl-10" value={formData.phone} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input id="address" type="text" placeholder="123 Rue de Paris, 75001 Paris" className="pl-10" value={formData.address} onChange={handleInputChange} />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-4 mt-6 pt-6 border-t">
              {/* ❌ SUPPRIMÉ: Bouton "Changer le mot de passe" - Client utilise Magic Link uniquement */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir vous déconnecter ? Vous recevrez un nouveau lien sécurisé pour vous reconnecter.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                      Se déconnecter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={handleSaveInfo} className="bg-green-600 hover:bg-green-700">Enregistrer les modifications</Button>
            </div>
          </SettingsSection>

          <SettingsSection title="Préférences de notifications">
            <p className="text-sm text-gray-600">Choisissez comment nous pouvons vous contacter pour les mises à jour importantes de vos projets.</p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <Checkbox id="notif-email" defaultChecked />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="notif-email" className="font-medium cursor-pointer">
                    Par e-mail
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Recevez les notifications directement dans votre boîte de réception.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <Checkbox id="notif-sms" />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="notif-sms" className="font-medium cursor-pointer">
                    Par SMS
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Recevez des alertes rapides sur votre téléphone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSavePreferences} className="w-full sm:w-auto">Enregistrer les préférences</Button>
            </div>
          </SettingsSection>
        </div>
      );
    };

    export default SettingsPage;
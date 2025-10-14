import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { User, Mail, Phone, MapPin, Bell, Building2 } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Checkbox } from '@/components/ui/checkbox';
    import { toast } from '@/components/ui/use-toast';
    import { useLocation } from 'react-router-dom';
    import { useAppContext } from '@/App';

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
      const { currentUser, updateProspect } = useAppContext();
      const isProfilePage = location.pathname.includes('/profil');

      const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
      });

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

      const handleSaveInfo = () => {
        if (!currentUser) return;

        const updatedProspectData = {
          ...currentUser,
          ...formData,
        };
        
        updateProspect(updatedProspectData);

        toast({
          title: "Profil mis à jour !",
          description: "Vos informations ont été enregistrées avec succès.",
          className: "bg-green-100 border-green-300 text-green-800",
        });
      };

      const handleSavePreferences = () => {
        toast({
          title: `Sauvegarde des "Préférences de notifications"...`,
          description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
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
            <div className="flex justify-end">
              <Button onClick={handleSaveInfo} className="w-full sm:w-auto">Enregistrer les modifications</Button>
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
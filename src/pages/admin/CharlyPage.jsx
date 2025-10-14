import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Phone, MessageSquare, Mail, Plus, Bot, CheckCircle, Zap, Clock, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import CharlyChat from '@/components/admin/CharlyChat';
import WhatsAppVisioButton from '@/components/admin/WhatsAppVisioButton';

const StatCard = ({ icon, value, label, color }) => (
  <motion.div 
    whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.08)' }}
    className="bg-white p-6 rounded-2xl shadow-soft cursor-pointer"
    onClick={() => toast({ title: `Affichage de la liste pour "${label}"... (placeholder)`})}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

const CharlyPage = () => {
  const stats = [
    { icon: <Calendar className="text-white" />, value: '12', label: 'RDV fixés (semaine)', color: 'bg-blue-500' },
    { icon: <Phone className="text-white" />, value: '84', label: 'Appels passés', color: 'bg-green-500' },
    { icon: <MessageSquare className="text-white" />, value: '156', label: 'SMS envoyés', color: 'bg-purple-500' },
    { icon: <Mail className="text-white" />, value: '32', label: 'Emails envoyés', color: 'bg-orange-500' },
  ];

  const campaigns = [
    { name: 'Relance prospects inactifs', date: '05/09/2025', status: 'Terminée' },
    { name: 'Annonce Batterie Virtuelle', date: '01/09/2025', status: 'Terminée' },
    { name: 'Campagne RDV Septembre', date: '28/08/2025', status: 'Terminée' },
  ];

  const scripts = ['Relance Étude', 'Annonce Batterie', 'RDV initial'];

  const superpowers = {
    available: [
      { name: 'Prise de RDV intelligente', icon: <Calendar className="text-green-500" /> },
      { name: 'Envoi de SMS & Emails', icon: <Mail className="text-green-500" /> },
      { name: 'Appels IA scénarisés', icon: <Bot className="text-green-500" /> },
      { name: 'Actions rapides (Appel, Mail, WhatsApp)', icon: <Zap className="text-green-500" /> },
    ],
    soon: [
      { name: 'Relances automatiques & personnalisées', icon: <Clock className="text-yellow-500" /> },
      { name: 'Briefings RDV pré-remplis', icon: <Clock className="text-yellow-500" /> },
      { name: 'Coaching commercial en temps réel', icon: <Clock className="text-yellow-500" /> },
      { name: 'Analyse des opportunités', icon: <Clock className="text-yellow-500" /> },
    ],
  };

  const handleNewCampaign = (type) => {
    toast({
      title: `Création d'une nouvelle campagne "${type}"... (placeholder)`,
    });
  };

  return (
    <div className="flex space-x-8 h-full">
        <div className="flex-1 min-w-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Charly AI Cockpit</h1>
                <p className="text-gray-600 mb-8">Pilotez votre assistant IA pour booster votre productivité.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, index) => <StatCard key={index} {...stat} />)}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-soft">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Campagnes Charly</h2>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle campagne</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleNewCampaign('SMS de groupe')}><MessageSquare className="mr-2 h-4 w-4" /> SMS de groupe</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleNewCampaign('Email de groupe')}><Mail className="mr-2 h-4 w-4" /> Email de groupe</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleNewCampaign('Appel IA de groupe')}><Bot className="mr-2 h-4 w-4" /> Appel IA de groupe</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <ul className="space-y-3">
                            {campaigns.map((c, i) => (
                                <li key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-800">{c.name}</p>
                                        <p className="text-sm text-gray-500">{c.date}</p>
                                    </div>
                                    <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">{c.status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-soft">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Scripts & Messages</h2>
                            <Button variant="outline" onClick={() => toast({ title: "Création d'un nouveau script... (placeholder)"})}><Plus className="mr-2 h-4 w-4" /> Créer un script</Button>
                        </div>
                        <ul className="space-y-3">
                            {scripts.map((s, i) => (
                                <li key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                                    <p className="font-medium text-gray-800">{s}</p>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-soft mt-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Super-pouvoirs de Charly</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Déjà disponible</h3>
                            <ul className="space-y-2">
                                {superpowers.available.map((p, i) => (
                                    <li key={i} className="flex items-center text-gray-600">
                                        {p.icon}
                                        <span className="ml-3">{p.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center"><Clock className="h-5 w-5 text-yellow-500 mr-2" /> Bientôt disponible</h3>
                            <ul className="space-y-2">
                                {superpowers.soon.map((p, i) => (
                                    <li key={i} className="flex items-center text-gray-500">
                                        {p.icon}
                                        <span className="ml-3">{p.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
        {/* The right sidebar content (CharlyChat and WhatsAppVisioButton) is now handled by AdminLayout */}
        <aside className="hidden lg:block">
            <div className="flex flex-col space-y-6 h-full">
                <CharlyChat />
                <WhatsAppVisioButton />
            </div>
        </aside>
    </div>
  );
};

export default CharlyPage;
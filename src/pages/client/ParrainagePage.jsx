import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Euro, Copy, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';

const ParrainagePage = () => {
  const { currentUser } = useAppContext();
  const [copied, setCopied] = useState(false);

  // Données statiques pour l'instant (à connecter plus tard)
  const referralStats = {
    filleuls: 4,
    confirmes: 3,
    gainsCumules: 300,
  };

  const referralLink = `https://evatime.fr/inscription/${currentUser?.name?.replace(/\s+/g, '-') || 'Jack-Luc'}`;

  const parrainages = [
    {
      id: 1,
      filleul: 'Sophie Martin',
      statut: 'En attente',
      gain: null,
      date: '06/11/2025',
      badgeColor: 'bg-yellow-100 text-yellow-700',
    },
    {
      id: 2,
      filleul: 'Julien Dubois',
      statut: 'Confirmé',
      gain: 100,
      date: '02/11/2025',
      badgeColor: 'bg-green-100 text-green-700',
    },
    {
      id: 3,
      filleul: 'Alexandre Petit',
      statut: 'Confirmé',
      gain: 100,
      date: '28/10/2025',
      badgeColor: 'bg-green-100 text-green-700',
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Lien copié !",
      description: "Le lien de parrainage a été copié dans le presse-papier.",
      className: "bg-green-500 text-white",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteClick = () => {
    toast({
      title: "Invitation",
      description: "Fonctionnalité d'invitation à venir...",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* En-tête avec illustration */}
      <div className="bg-white rounded-2xl shadow-card p-8 text-center">
        {/* Illustration */}
        <div className="mb-6">
          <img 
            src="https://ik.imagekit.io/qbfbbu1mo/New%20Folder/ChatGPT%20Image%206%20nov.%202025%20a%CC%80%2017_33_52.png?updatedAt=1762449722267" 
            alt="Parrainage"
            className="w-full max-w-sm mx-auto h-auto object-contain"
          />
        </div>
        
        {/* Titre */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
          <Euro className="h-8 w-8 text-blue-600" />
          Parrainage
        </h1>
        
        {/* Description */}
        <p className="text-gray-700 text-lg max-w-2xl mx-auto">
          Pour chaque ami qui souscrit à une offre grâce à vous, c'est{' '}
          <span className="font-bold text-gray-900">100 € pour lui</span> et{' '}
          <span className="font-bold text-gray-900">100 € pour vous</span>.
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Filleuls</p>
              <p className="text-3xl font-bold text-gray-900">{referralStats.filleuls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Confirmés</p>
              <p className="text-3xl font-bold text-gray-900">{referralStats.confirmes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Euro className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gains cumulés</p>
              <p className="text-3xl font-bold text-gray-900">{referralStats.gainsCumules} €</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lien de parrainage */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Votre lien de parrainage unique</h2>
        <div className="flex items-center space-x-2">
          <Input
            value={referralLink}
            readOnly
            className="flex-1 bg-gray-50 border-gray-200"
          />
          <Button
            onClick={handleCopyLink}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copier le lien
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Suivi des parrainages */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Suivi de vos parrainages</h2>
          <Button
            onClick={handleInviteClick}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un ami
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Filleul
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Gain
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {parrainages.map((parrainage) => (
                <tr key={parrainage.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 text-gray-900 font-medium">
                    {parrainage.filleul}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${parrainage.badgeColor}`}>
                      {parrainage.statut}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-900 font-medium">
                    {parrainage.gain ? `+${parrainage.gain} €` : '—'}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {parrainage.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default ParrainagePage;

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
      {/* Hero Section - Accrocheur */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 p-8 lg:p-12 items-center">
          {/* Texte accrocheur */}
          <div className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              <Euro className="h-5 w-5" />
              Programme de parrainage
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Gagnez de l'argent en recommandant nos services ! 💰
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Chaque ami que vous parrainez vous rapporte{' '}
              <span className="font-bold text-yellow-300 text-2xl">100 €</span> 
              {' '}et lui offre également{' '}
              <span className="font-bold text-yellow-300 text-2xl">100 €</span> de réduction.
              <br />
              <span className="text-white font-semibold mt-2 block">
                C'est gagnant-gagnant ! 🤝
              </span>
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                onClick={handleInviteClick}
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Inviter un ami maintenant
              </Button>
              <Button
                onClick={handleCopyLink}
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Lien copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5 mr-2" />
                    Copier mon lien
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Illustration */}
          <div className="hidden lg:block flex-shrink-0">
            <img 
              src="https://ik.imagekit.io/qbfbbu1mo/New%20Folder/ChatGPT%20Image%206%20nov.%202025%20a%CC%80%2017_33_52.png?updatedAt=1762449722267" 
              alt="Parrainage"
              className="w-80 h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Vos performances */}
      <div className="bg-white rounded-2xl shadow-card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-600" />
          Vos performances de parrainage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border-2 border-blue-200 cursor-pointer"
          >
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-medium text-blue-700 mb-2 uppercase tracking-wide">Filleuls inscrits</p>
            <p className="text-5xl font-extrabold text-blue-900 mb-1">{referralStats.filleuls}</p>
            <p className="text-xs text-blue-600">personnes invitées</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border-2 border-green-200 cursor-pointer"
          >
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Check className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-medium text-green-700 mb-2 uppercase tracking-wide">Parrainages confirmés</p>
            <p className="text-5xl font-extrabold text-green-900 mb-1">{referralStats.confirmes}</p>
            <p className="text-xs text-green-600">souscriptions validées</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 text-center border-2 border-yellow-200 cursor-pointer"
          >
            <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Euro className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-medium text-yellow-700 mb-2 uppercase tracking-wide">Revenus générés</p>
            <p className="text-5xl font-extrabold text-yellow-900 mb-1">{referralStats.gainsCumules} €</p>
            <p className="text-xs text-yellow-600">total des gains</p>
          </motion.div>
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

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
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 md:gap-8 p-5 md:p-8 lg:p-12 items-center">
          {/* Texte accrocheur */}
          <div className="text-white space-y-3 md:space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium">
              <Euro className="h-4 w-4 md:h-5 md:w-5" />
              Programme de parrainage
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
              Gagnez de l'argent en recommandant nos services ! 💰
            </h1>
            <p className="text-sm md:text-xl text-blue-100 leading-relaxed">
              Chaque ami que vous parrainez vous rapporte{' '}
              <span className="font-bold text-yellow-300 text-base md:text-2xl">100 €</span> 
              {' '}et lui offre également{' '}
              <span className="font-bold text-yellow-300 text-base md:text-2xl">100 €</span> de réduction.
              <br />
              <span className="text-white font-semibold mt-1 md:mt-2 block">
                C'est gagnant-gagnant ! 🤝
              </span>
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-2 md:gap-4 pt-2 md:pt-4">
              <Button
                onClick={handleInviteClick}
                size="default"
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold shadow-lg hover:shadow-xl transition-all text-sm md:text-base md:h-11"
              >
                <UserPlus className="h-4 w-4 mr-1.5 md:mr-2" />
                Inviter un ami
              </Button>
              <Button
                onClick={handleCopyLink}
                size="default"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 font-semibold text-sm md:text-base md:h-11"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copier mon lien
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Illustration */}
          <div className="hidden lg:block flex-shrink-0">
            <img
              src="https://ik.imagekit.io/bqla7nrgyf/ChatGPT%20Image%206%20nov.%202025%20a%CC%80%2017_33_52.png.webp?updatedAt=1762764615950"
              alt="Programme de parrainage"
              className="w-80 h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Vos performances */}
      <div className="bg-white rounded-2xl shadow-card p-4 md:p-8">
        <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
          Vos performances
        </h2>
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 md:p-6 text-center border border-blue-200 md:border-2"
          >
            <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 shadow-lg">
              <Users className="h-5 w-5 md:h-8 md:w-8 text-white" />
            </div>
            <p className="text-[10px] md:text-sm font-medium text-blue-700 mb-1 uppercase tracking-wide">Filleuls</p>
            <p className="text-2xl md:text-5xl font-extrabold text-blue-900">{referralStats.filleuls}</p>
            <p className="text-[10px] md:text-xs text-blue-600 mt-0.5">inscrits</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 md:p-6 text-center border border-green-200 md:border-2"
          >
            <div className="w-10 h-10 md:w-16 md:h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 shadow-lg">
              <Check className="h-5 w-5 md:h-8 md:w-8 text-white" />
            </div>
            <p className="text-[10px] md:text-sm font-medium text-green-700 mb-1 uppercase tracking-wide">Confirmés</p>
            <p className="text-2xl md:text-5xl font-extrabold text-green-900">{referralStats.confirmes}</p>
            <p className="text-[10px] md:text-xs text-green-600 mt-0.5">validés</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-3 md:p-6 text-center border border-yellow-200 md:border-2"
          >
            <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4 shadow-lg">
              <Euro className="h-5 w-5 md:h-8 md:w-8 text-white" />
            </div>
            <p className="text-[10px] md:text-sm font-medium text-yellow-700 mb-1 uppercase tracking-wide">Revenus</p>
            <p className="text-2xl md:text-5xl font-extrabold text-yellow-900">{referralStats.gainsCumules}€</p>
            <p className="text-[10px] md:text-xs text-yellow-600 mt-0.5">total gains</p>
          </motion.div>
        </div>
      </div>

      {/* Lien de parrainage */}
      <div className="bg-white rounded-2xl shadow-card p-4 md:p-6">
        <h2 className="text-base md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Votre lien de parrainage</h2>
        <div className="flex items-center gap-2">
          <Input
            value={referralLink}
            readOnly
            className="flex-1 bg-gray-50 border-gray-200 text-xs md:text-sm h-9 md:h-10"
          />
          <Button
            onClick={handleCopyLink}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 h-9 md:h-10 text-xs md:text-sm px-3 md:px-4"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copier
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Suivi des parrainages */}
      <div className="bg-white rounded-2xl shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-base md:text-xl font-semibold text-gray-900">Suivi</h2>
          <Button
            onClick={handleInviteClick}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm h-8 md:h-10 px-3 md:px-4"
          >
            <UserPlus className="h-4 w-4 mr-1 md:mr-2" />
            Inviter
          </Button>
        </div>

        {/* Vue mobile : cartes */}
        <div className="space-y-3 md:hidden">
          {parrainages.map((parrainage) => (
            <div key={parrainage.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{parrainage.filleul}</p>
                <p className="text-xs text-gray-500">{parrainage.date}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {parrainage.gain && (
                  <span className="text-sm font-bold text-green-600">+{parrainage.gain}€</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${parrainage.badgeColor}`}>
                  {parrainage.statut}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Vue desktop : tableau */}
        <div className="hidden md:block overflow-x-auto">
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

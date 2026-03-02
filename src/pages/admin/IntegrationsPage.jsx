import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Zap, Code2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const TABS = [
  { id: 'sans-code', label: 'Sans code', icon: Link2, description: 'Liens, QR codes, widgets embed', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'make', label: 'Make', icon: Zap, description: 'Scénarios Make prêts à l\'emploi', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'developpeur', label: 'Développeur', icon: Code2, description: 'Webhooks, API keys, endpoints', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sans-code');

  return (
    <motion.div
      className="max-w-5xl mx-auto space-y-8 p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/profil')}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Intégrations</h1>
          <p className="text-gray-500 mt-1">Liens, Make ou webhook</p>
        </div>
      </motion.div>

      {/* Tabs / Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                isActive
                  ? `${tab.color} shadow-md ring-2 ring-offset-2 ring-current`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/60' : 'bg-gray-100'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">{tab.label}</span>
              <span className={`text-sm ${isActive ? 'opacity-80' : 'text-gray-400'}`}>{tab.description}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Content placeholder */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center"
      >
        <div className="flex flex-col items-center gap-4 py-8">
          {activeTab === 'sans-code' && <Link2 className="w-12 h-12 text-blue-400" />}
          {activeTab === 'make' && <Zap className="w-12 h-12 text-purple-400" />}
          {activeTab === 'developpeur' && <Code2 className="w-12 h-12 text-emerald-400" />}

          <h2 className="text-xl font-semibold text-gray-800">
            {TABS.find(t => t.id === activeTab)?.label}
          </h2>
          <p className="text-gray-400 max-w-md">
            À configurer (Action suivante)
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IntegrationsPage;

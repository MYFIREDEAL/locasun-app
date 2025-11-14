import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const DocumentItem = ({ name, date, size }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-between p-4 bg-white rounded-xl shadow-card hover:shadow-soft transition-shadow"
  >
    <div className="flex items-center space-x-4">
      <FileText className="h-6 w-6 text-blue-500" />
      <div>
        <p className="font-medium text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{date} - {size}</p>
      </div>
    </div>
    <Button 
      variant="ghost" 
      size="icon" 
      className="rounded-full"
      onClick={() => toast({ title: `Téléchargement de "${name}"... (placeholder)`})}
    >
      <Download className="h-5 w-5 text-gray-500" />
    </Button>
  </motion.div>
);

const Dropzone = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    toast({
      title: "Fichier déposé !",
      description: "La fonctionnalité de téléversement n'est pas encore implémentée. 🚀",
    });
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
        isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-100'
      }`}
    >
      <UploadCloud className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-green-600' : 'text-gray-400'}`} />
      <p className="font-semibold text-gray-700">Glissez-déposez vos documents ici</p>
      <p className="text-sm text-gray-500 mt-1">ou cliquez pour sélectionner des fichiers</p>
      <Button variant="outline" className="mt-4" onClick={() => toast({ title: "La sélection de fichiers n'est pas encore implémentée."})}>
        Parcourir
      </Button>
    </div>
  );
};

const DocumentsPage = () => {
  const documents = [
    { name: 'Contrat_ACC_Signé.pdf', date: '15 Mars 2024', size: '2.3 MB' },
    { name: 'Devis_Batterie_Virtuelle.pdf', date: '10 Mars 2024', size: '850 KB' },
    { name: 'Facture_Installation_Solaire.pdf', date: '01 Février 2024', size: '1.1 MB' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vos Documents</h1>
        <p className="text-gray-600 mt-1">Retrouvez tous vos contrats, devis et factures.</p>
      </div>

      <div className="space-y-4">
        {documents.map((doc, index) => (
          <DocumentItem key={index} {...doc} />
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Téléverser un document</h2>
        <Dropzone />
      </div>
    </motion.div>
  );
};

export default DocumentsPage;
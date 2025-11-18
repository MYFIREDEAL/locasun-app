import React, { useState } from 'react';
import { Upload, Download, Trash2, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const FilesTab = ({ prospectId, projectType }) => {
  const [files, setFiles] = useState([
    // Mock data pour l'instant
    {
      id: '1',
      name: 'Devis_ACC_2025.pdf',
      type: 'application/pdf',
      size: '245 KB',
      uploadedAt: new Date(2025, 10, 15),
      uploadedBy: 'Jack LUC',
    },
    {
      id: '2',
      name: 'Plan_installation.png',
      type: 'image/png',
      size: '1.2 MB',
      uploadedAt: new Date(2025, 10, 12),
      uploadedBy: 'Jack LUC',
    },
  ]);

  const handleFileUpload = (event) => {
    const selectedFiles = event.target.files;
    if (selectedFiles.length > 0) {
      toast({
        title: '📤 Upload en cours',
        description: `${selectedFiles.length} fichier(s) en cours de téléchargement...`,
      });
      
      // TODO: Implémenter upload vers Supabase Storage
      // await supabase.storage.from('project-files').upload(...)
    }
  };

  const handleDownload = (file) => {
    toast({
      title: '📥 Téléchargement',
      description: `Téléchargement de ${file.name}...`,
    });
    // TODO: Implémenter download depuis Supabase Storage
  };

  const handleDelete = (file) => {
    toast({
      title: '🗑️ Fichier supprimé',
      description: `${file.name} a été supprimé.`,
      variant: 'destructive',
    });
    setFiles(files.filter((f) => f.id !== file.id));
    // TODO: Implémenter suppression dans Supabase Storage
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer">
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Cliquez pour ajouter des fichiers
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, images, documents (max 10 MB)
          </p>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          />
        </label>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Fichiers ({files.length})
        </h3>

        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun fichier ajouté</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.size} • {formatDate(file.uploadedAt)} • par {file.uploadedBy}
                  </p>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 hover:bg-red-50 rounded text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center py-4 text-sm text-gray-400 border-t border-gray-100">
        <p>Les fichiers seront stockés dans Supabase Storage</p>
        <p className="text-xs mt-1">(bucket: project-files)</p>
      </div>
    </div>
  );
};

export default FilesTab;

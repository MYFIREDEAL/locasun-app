import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Upload, Download, Trash2, FileText, Image, File, Eye, PenTool } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';
import { useAppContext } from '@/App';
import { useYousignSignature } from '@/hooks/useYousignSignature';
import { toast } from '@/components/ui/use-toast';

const FilesTab = ({ projectType, prospectId, currentUser }) => {
  const { activeAdminUser } = useAppContext();
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    files,
    loading,
    uploading,
    deleting,
    error,
    uploadFile,
    deleteFile,
  } = useSupabaseProjectFiles({
    projectType,
    prospectId,
    enabled: !!projectType,
  });

  const { addHistoryEvent } = useSupabaseProjectHistory({
    projectType,
    prospectId,
    enabled: !!projectType,
  });

  const { createSignature, loading: signingLoading } = useYousignSignature();

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      // Uploader tous les fichiers en parallèle
      const uploadPromises = files.map(async (file) => {
        setSelectedFile(file);
        
        const uploaded = await uploadFile({
          file,
          uploadedBy: currentUser?.id,
        });

        if (uploaded && addHistoryEvent) {
          await addHistoryEvent({
            event_type: "file",
            title: "Fichier ajouté",
            description: uploaded.file_name,
            metadata: {
              size: uploaded.file_size,
              type: uploaded.file_type,
              storage_path: uploaded.storage_path,
            },
            createdBy: activeAdminUser?.id || currentUser?.id,
            createdByName: activeAdminUser?.name || activeAdminUser?.email || currentUser?.full_name || currentUser?.email,
          });
        }

        return uploaded;
      });

      await Promise.all(uploadPromises);
      
      setSelectedFile(null);
      event.target.value = '';
    } catch (err) {
      logger.error('Error uploading files:', err);
      setSelectedFile(null);
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600);

      if (error) {
        logger.error('Error creating signed URL:', error);
        return;
      }
      
      // Télécharger le fichier via fetch pour contourner CORS
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      
      // Créer une URL locale pour le blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Créer un lien pour télécharger
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      logger.error('Error downloading file:', err);
    }
  };

  const handleView = async (file) => {
    try {
      logger.debug('👁️ Generating signed URL for view', { storagePath: file.storage_path });
      
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600); // 1 heure

      if (error) {
        logger.error('Error creating signed URL:', error);
        return;
      }

      logger.debug('✅ Signed URL generated', { url: data.signedUrl });
      
      // Ouvrir dans un nouvel onglet
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      logger.error('Error viewing file:', err);
    }
  };

  const handleSignature = async (file) => {
    try {
      logger.debug('📝 Launching signature', { fileId: file.id });

      const result = await createSignature({
        fileId: file.id,
        prospectId,
        projectType,
      });

      if (result.success && result.signatureLink) {
        toast({
          title: '✅ Signature lancée !',
          description: 'Le lien de signature a été envoyé au client par email.',
          className: 'bg-green-500 text-white',
        });

        // Ouvrir le lien de signature dans un nouvel onglet (optionnel)
        if (confirm('Voulez-vous ouvrir le lien de signature ?')) {
          window.open(result.signatureLink, '_blank');
        }
      }
    } catch (err) {
      logger.error('Error creating signature:', err);
      toast({
        title: '❌ Erreur',
        description: `Impossible de créer la signature: ${err.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Supprimer le fichier "${file.file_name}" ?`)) return;
    
    try {
      await deleteFile(file.id, file.storage_path);
    } catch (err) {
      logger.error('Error deleting file:', err);
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  if (!projectType) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Sélectionnez un projet pour voir les fichiers</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer">
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Upload en cours...' : 'Cliquez pour ajouter des fichiers'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, images, documents • Sélection multiple possible • Max 10 MB par fichier
          </p>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            disabled={uploading}
            multiple
          />
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Fichiers ({files.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Chargement des fichiers...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun fichier pour ce projet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex-shrink-0">{getFileIcon(file.file_type)}</div>
                
                <div className="flex-1 min-w-0">
                  {file.field_label ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {file.field_label}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {file.file_name}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                  </p>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleView(file)}
                    className="p-2 hover:bg-green-50 rounded text-green-600 transition-colors"
                    title="Voir"
                    disabled={deleting || signingLoading}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {file.file_type === 'application/pdf' && file.field_label !== 'Document signé' && (
                    <button
                      onClick={() => handleSignature(file)}
                      className="p-2 hover:bg-purple-50 rounded text-purple-600 transition-colors disabled:opacity-50"
                      title="Lancer signature Yousign"
                      disabled={deleting || signingLoading}
                    >
                      <PenTool className="h-4 w-4" />
                    </button>
                  )}
                  {file.field_label === 'Document signé' && (
                    <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                      ✓ Signé
                    </span>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                    title="Télécharger"
                    disabled={deleting || signingLoading}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 hover:bg-red-50 rounded text-red-600 transition-colors disabled:opacity-50"
                    title="Supprimer"
                    disabled={deleting || signingLoading}
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
        <p>Fichiers stockés dans Supabase Storage</p>
        <p className="text-xs mt-1">(bucket: project-files)</p>
      </div>
    </div>
  );
};

export default FilesTab;

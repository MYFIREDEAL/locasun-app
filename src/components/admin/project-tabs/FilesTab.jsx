import React, { useState } from 'react';
import { Upload, Download, Trash2, FileText, Image, File } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';

const FilesTab = ({ projectType, prospectId, currentUser }) => {
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    try {
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
          createdBy: currentUser?.id,
          createdByName: currentUser?.email || currentUser?.full_name,
        });
      }

      setSelectedFile(null);
      // Reset input
      event.target.value = '';
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 3600);

      if (error) {
        console.error('Error creating signed URL:', error);
        return;
      }
      
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Supprimer le fichier "${file.file_name}" ?`)) return;
    
    try {
      await deleteFile(file.id, file.storage_path);
    } catch (err) {
      console.error('Error deleting file:', err);
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
            PDF, images, documents (max 10 MB)
          </p>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            disabled={uploading}
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                  </p>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                    title="Télécharger"
                    disabled={deleting}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 hover:bg-red-50 rounded text-red-600 transition-colors disabled:opacity-50"
                    title="Supprimer"
                    disabled={deleting}
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

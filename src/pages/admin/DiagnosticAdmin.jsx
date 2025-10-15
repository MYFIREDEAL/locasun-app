import React from 'react';
import { useLocation } from 'react-router-dom';

const DiagnosticAdmin = () => {
  const location = useLocation();
  
  return (
    <div className="p-8 bg-white border-2 border-red-500 rounded-lg m-4">
      <h1 className="text-2xl font-bold text-red-600 mb-4">🔍 DIAGNOSTIC ADMIN</h1>
      <div className="space-y-2 text-sm">
        <p><strong>Chemin actuel:</strong> {location.pathname}</p>
        <p><strong>Hash:</strong> {location.hash}</p>
        <p><strong>Search:</strong> {location.search}</p>
        <p><strong>Route complète:</strong> {window.location.href}</p>
        <p><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</p>
      </div>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="font-semibold">✅ Si vous voyez ce message, cela signifie que :</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Le routing fonctionne</li>
          <li>AdminLayout se charge</li>
          <li>Le problème vient du composant Pipeline</li>
        </ul>
      </div>
    </div>
  );
};

export default DiagnosticAdmin;
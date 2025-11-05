import React from 'react';
import { useAppContext } from '@/App';

const UltraSimpleContacts = () => {
  // Test basique du contexte
  let contextData;
  try {
    contextData = useAppContext();
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Contacts - Erreur Contexte</h1>
        <p className="text-red-600">Erreur: {error.message}</p>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Contacts - Pas de contexte</h1>
        <p>Le contexte n'est pas disponible</p>
      </div>
    );
  }

  const { prospects = [] } = contextData;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Contacts - Version Ultra Simple</h1>
      <div className="bg-green-100 p-4 rounded mb-4">
        ✅ Le contexte fonctionne !
      </div>
      <div className="bg-blue-100 p-4 rounded">
        <p>Nombre de prospects: {prospects.length}</p>
        {prospects.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Premier prospect:</h3>
            <p>Nom: {prospects[0].firstName} {prospects[0].lastName}</p>
            <p>Email: {prospects[0].email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UltraSimpleContacts;
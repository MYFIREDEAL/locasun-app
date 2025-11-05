import React from 'react';

const UltraMinimal = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'green' }}>✅ ULTRA MINIMAL FONCTIONNE</h1>
      <p>Si vous voyez cette page, le problème vient de :</p>
      <ul>
        <li>useAppContext()</li>
        <li>AdminLayout</li>
        <li>Ou un autre import spécifique</li>
      </ul>
      <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '20px' }}>
        <strong>Test réussi :</strong> Routing et composant de base fonctionnent
      </div>
    </div>
  );
};

export default UltraMinimal;
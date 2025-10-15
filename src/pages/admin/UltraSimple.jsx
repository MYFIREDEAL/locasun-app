import React from 'react';

const UltraSimple = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Page Ultra Simple</h1>
      <p>Si vous voyez ce texte, la navigation fonctionne.</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        ✅ React fonctionne
      </div>
      <div className="mt-2 p-4 bg-blue-100 rounded">
        ✅ Tailwind fonctionne
      </div>
      <div className="mt-2 p-4 bg-yellow-100 rounded">
        ✅ AdminLayout fonctionne
      </div>
    </div>
  );
};

export default UltraSimple;
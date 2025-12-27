import React from "react";

export default function ConfigurationIA() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-2xl font-semibold">Configuration IA</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Pilotez le comportement réel de Charly sur les projets clients
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-gray-200">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">IA ACTIVE</span>
          </div>
          <div className="rounded-full bg-white px-3 py-2 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
            Version : <span className="font-medium">v1.0</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi title="Projets gérés" value="128" icon="📁" />
        <Kpi title="Actions données" value="462" icon="✅" />
        <Kpi title="Tâches bloquantes" value="37" icon="⛔" />
        <Kpi title="IA désactivations" value="2" icon="🔕" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Prompt */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold">🧠 Prompt système Charly</h2>
          <p className="mb-3 text-sm text-gray-500">
            Prompt exécuté pour tous les utilisateurs
          </p>

          <textarea
            className="h-96 w-full resize-none rounded-lg border bg-gray-50 p-4 font-mono text-sm"
            defaultValue={`Tu es Charly, assistant projet EVATIME.

Mission :
Faire avancer les projets clients.

Règles :
- Identifier le projet actif
- Identifier l'étape en cours
- Proposer UNE seule action
- Toujours fournir un lien clair
- Répondre en JSON strict
`}
          />

          <div className="mt-4 flex justify-end gap-3">
            <button className="rounded-lg border px-4 py-2 text-sm">
              Désactiver IA
            </button>
            <button className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white">
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Sources */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold">
            🔐 Données accessibles par Charly
          </h2>

          <Check label="Utilisateurs" checked />
          <Check label="Projets" checked />
          <Check label="Étapes projet" checked />
          <Check label="Tâches / Activités" checked />
          <Check label="Messages envoyés" checked />

          <Check label="Finances" disabled />
          <Check label="Facturation" disabled />

          <p className="mt-4 text-xs text-gray-400">
            Lecture serveur uniquement
          </p>
        </div>

        {/* Simulation */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold">
            🧪 Simulation Charly (conditions réelles)
          </h2>

          <select className="mb-3 w-full rounded-lg border px-3 py-2 text-sm">
            <option>Client – Jean Dupont</option>
          </select>

          <select className="mb-4 w-full rounded-lg border px-3 py-2 text-sm">
            <option>ACC – Inscription</option>
          </select>

          <button className="mb-4 w-full rounded-lg bg-green-600 py-2 text-sm text-white">
            Simuler la réponse
          </button>

          <div className="rounded-lg bg-gray-50 p-4 text-sm">
            <p className="text-xs text-gray-400">(aperçu – non envoyé)</p>
            <p className="mt-2">
              Merci de compléter vos informations client afin de poursuivre votre
              projet.
            </p>

            <button className="mt-3 rounded-lg bg-green-100 px-3 py-1 text-sm text-green-700">
              Remplir le formulaire
            </button>

            <div className="mt-2 text-xs text-gray-400">
              /mobile/form/info-client
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, icon }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex justify-between">
        <div>
          <div className="text-xl font-semibold">{value}</div>
          <div className="text-sm text-gray-500">{title}</div>
        </div>
        <div className="text-xl">{icon}</div>
      </div>
    </div>
  );
}

function Check({ label, checked, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} readOnly />
      <span className={disabled ? "text-gray-300" : ""}>{label}</span>
    </label>
  );
}

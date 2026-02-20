import React, { useState } from 'react';
import { Send } from 'lucide-react';

/**
 * /partner/charly
 * Chat simplifié avec l'assistant IA Charly — côté partenaire
 * Phase 1: placeholder avec message d'accueil
 */
const PartnerCharlyPage = () => {
  const [messages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Bonjour ! Voici vos priorités. Exécutez chaque point, je gère le reste.",
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    // TODO: Phase 2 — intégrer avec le backend Charly
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5rem)]">
      {/* Header Charly */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
          C
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Charly</h1>
          <p className="text-xs text-blue-600 font-bold tracking-wide uppercase">Assistant Direction</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[80%] mb-3 ${msg.role === 'assistant' ? '' : 'ml-auto'}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'assistant'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Question courte..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerCharlyPage;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE LIVE CARD - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Carte interactive pour un module du workflow avec :
 * - Message IA dynamique (non figé)
 * - Chat UI minimal
 * - 2 boutons max : PROCEED et NEED_DATA
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - NEED_DATA = IA répond (stub), aucun état modifié
 *     - PROCEED = callback onProceed (stub), pas de routing
 * 
 * Pattern : "Appel d'offre investisseurs"
 * Voir /docs/workflow-v2/02_pattern_module_live.md
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User, 
  Send,
  Rocket,
  HelpCircle,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logV2, DEFAULT_BUTTON_LABELS } from '@/lib/workflowV2Config';
import { getModuleAIConfig, getActionDescription } from '@/lib/moduleAIConfig';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - ID unique
 * @property {'ai'|'user'} sender - Expéditeur
 * @property {string} content - Contenu du message
 * @property {Date} timestamp - Horodatage
 */

// Messages IA stub (simulés)
const AI_STUB_RESPONSES = [
  "Je comprends votre question. Laissez-moi vérifier les informations disponibles...",
  "D'après les données du projet, voici ce que je peux vous dire...",
  "Bonne question ! Voici les éléments à prendre en compte...",
  "Je vais analyser votre demande. Un instant...",
  "Voici les informations que j'ai pu rassembler pour vous...",
];

// Délai simulation réponse IA (ms)
const AI_RESPONSE_DELAY = 1200;

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Message Bubble
// ─────────────────────────────────────────────────────────────────────────────

const MessageBubble = ({ message, isTyping = false }) => {
  const isAI = message.sender === 'ai';
  
  return (
    <div className={cn(
      'flex gap-2 mb-3',
      isAI ? 'justify-start' : 'justify-end'
    )}>
      {/* Avatar AI */}
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      {/* Bulle message */}
      <div className={cn(
        'max-w-[80%] px-4 py-2.5 rounded-2xl',
        isAI 
          ? 'bg-gray-100 text-gray-800 rounded-tl-sm' 
          : 'bg-blue-600 text-white rounded-tr-sm'
      )}>
        {isTyping ? (
          <div className="flex gap-1 py-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        
        {/* Timestamp */}
        {!isTyping && message.timestamp && (
          <p className={cn(
            'text-xs mt-1 opacity-60',
            isAI ? 'text-gray-500' : 'text-blue-100'
          )}>
            {new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        )}
      </div>
      
      {/* Avatar User */}
      {!isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600" />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Chat Input
// ─────────────────────────────────────────────────────────────────────────────

const ChatInput = ({ onSend, disabled, placeholder = "Poser une question..." }) => {
  const [input, setInput] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex-1 px-4 py-2 text-sm border rounded-full',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed'
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !input.trim()}
        className="rounded-full bg-blue-600 hover:bg-blue-700"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Carte module live avec chat IA intégré
 * 
 * @param {Object} props
 * @param {string} props.moduleId - ID du module
 * @param {string} props.moduleName - Nom du module
 * @param {string} props.moduleIcon - Emoji/icône
 * @param {string} [props.initialMessage] - Message IA initial (fallback si pas de config)
 * @param {() => void} props.onProceed - Callback PROCEED
 * @param {(question: string) => Promise<string>} [props.onAskAI] - Callback custom pour réponse IA
 * @param {string} [props.proceedLabel] - Label bouton PROCEED (override config)
 * @param {string} [props.needDataLabel] - Label bouton NEED_DATA (override config)
 * @param {boolean} [props.disabled] - Désactiver les interactions
 */
const ModuleLiveCard = ({
  moduleId,
  moduleName = 'Module',
  moduleIcon = '📋',
  initialMessage,
  onProceed,
  onAskAI,
  proceedLabel: propProceedLabel,
  needDataLabel: propNeedDataLabel,
  disabled = false,
  className,
}) => {
  // ───────────────────────────────────────────────────────────────────────────
  // CONFIG IA PAR MODULE
  // ───────────────────────────────────────────────────────────────────────────
  
  const moduleConfig = getModuleAIConfig(moduleId);
  
  // Résolution des labels : props > config > default
  const proceedLabel = propProceedLabel || moduleConfig.buttonLabels?.proceedLabel || DEFAULT_BUTTON_LABELS.proceed;
  const needDataLabel = propNeedDataLabel || moduleConfig.buttonLabels?.needDataLabel || DEFAULT_BUTTON_LABELS.needData;
  
  // Message initial : props > config.instructions > fallback
  const effectiveInitialMessage = initialMessage || moduleConfig.instructions || 
    "Bonjour ! Je suis là pour vous accompagner dans cette étape. Comment puis-je vous aider ?";
  
  logV2('ModuleLiveCard: Config chargée', { 
    moduleId, 
    knowledgeKey: moduleConfig.knowledgeKey,
    proceedLabel,
    needDataLabel 
  });
  
  // ───────────────────────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────────────────────
  
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      sender: 'ai',
      content: effectiveInitialMessage,
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProceedLoading, setIsProceedLoading] = useState(false);
  const [showAllowedActions, setShowAllowedActions] = useState(false);
  
  const chatContainerRef = useRef(null);
  
  // ───────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ───────────────────────────────────────────────────────────────────────────
  
  // Auto-scroll vers le bas
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);
  
  // ───────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleSendMessage = async (content) => {
    logV2('ModuleLiveCard: Message envoyé', { moduleId, content });
    
    // Ajouter message utilisateur
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Simuler typing IA
    setIsTyping(true);
    
    try {
      // Réponse IA (custom ou stub)
      let aiResponse;
      
      if (onAskAI) {
        // Callback custom fourni
        aiResponse = await onAskAI(content);
      } else {
        // Stub : réponse aléatoire après délai
        await new Promise(resolve => setTimeout(resolve, AI_RESPONSE_DELAY));
        aiResponse = AI_STUB_RESPONSES[Math.floor(Math.random() * AI_STUB_RESPONSES.length)];
      }
      
      // Ajouter réponse IA
      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      
      logV2('ModuleLiveCard: Réponse IA', { moduleId, response: aiResponse });
      
    } catch (error) {
      logV2('ModuleLiveCard: Erreur IA', error);
      
      // Message d'erreur
      setMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`,
        sender: 'ai',
        content: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleNeedData = () => {
    logV2('ModuleLiveCard: NEED_DATA cliqué', { 
      moduleId, 
      knowledgeKey: moduleConfig.knowledgeKey 
    });
    
    // Construire message avec knowledgeKey si disponible
    let messageContent;
    if (moduleConfig.knowledgeKey) {
      messageContent = `📚 **Base de connaissance : ${moduleConfig.knowledgeKey}**\n\n` +
        `Je vais consulter les informations disponibles pour "${moduleName}". ` +
        `Posez votre question ci-dessous ou cliquez sur "${proceedLabel}" quand vous êtes prêt à continuer.`;
    } else {
      messageContent = `📝 Vous avez demandé plus d'informations. ` +
        `Posez votre question ci-dessous ou cliquez sur "${proceedLabel}" quand vous êtes prêt à continuer.`;
    }
    
    const systemMessage = {
      id: `system-${Date.now()}`,
      sender: 'ai',
      content: messageContent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
  };
  
  const handleProceed = async () => {
    logV2('ModuleLiveCard: PROCEED cliqué', { moduleId });
    
    setIsProceedLoading(true);
    
    try {
      // Appeler callback parent (stub)
      await onProceed?.();
      
      // Message de confirmation
      const confirmMessage = {
        id: `confirm-${Date.now()}`,
        sender: 'ai',
        content: `✅ Action "${proceedLabel}" enregistrée ! (Mode simulation - aucune modification effectuée)`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
      
    } catch (error) {
      logV2('ModuleLiveCard: Erreur PROCEED', error);
    } finally {
      setIsProceedLoading(false);
    }
  };
  
  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  
  return (
    <div className={cn(
      'bg-white rounded-xl shadow-lg border overflow-hidden',
      'flex flex-col',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">{moduleIcon} {moduleName}</span>
        </div>
        <p className="text-xs text-white/80 mt-1">
          Assistant IA • Module interactif
        </p>
      </div>
      
      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 p-4 overflow-y-auto max-h-80 min-h-[200px] bg-gray-50"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <MessageBubble 
            message={{ sender: 'ai', content: '' }} 
            isTyping={true} 
          />
        )}
      </div>
      
      {/* Allowed Actions (READ_ONLY) */}
      {moduleConfig.allowedActions?.length > 0 && (
        <div className="border-t bg-white">
          <button
            onClick={() => setShowAllowedActions(!showAllowedActions)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>✨</span>
              <span>Actions IA possibles ({moduleConfig.allowedActions.length})</span>
            </span>
            {showAllowedActions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {showAllowedActions && (
            <div className="px-4 pb-3 space-y-2">
              <p className="text-xs text-gray-400 italic mb-2">
                💡 Mode lecture seule — Ce que l'IA pourra faire plus tard
              </p>
              {moduleConfig.allowedActions.map((actionId) => {
                const action = getActionDescription(actionId);
                return (
                  <div 
                    key={actionId}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <span className="text-lg">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{action.label}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-3 border-t bg-white">
        <ChatInput 
          onSend={handleSendMessage}
          disabled={disabled || isTyping}
          placeholder="Poser une question à l'IA..."
        />
      </div>
      
      {/* Action Buttons */}
      <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
        <p className="text-xs text-gray-400">
          💡 Mode simulation
        </p>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNeedData}
            disabled={disabled}
            className="gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            {needDataLabel}
          </Button>
          
          <Button
            size="sm"
            onClick={handleProceed}
            disabled={disabled || isProceedLoading}
            className="gap-1 bg-blue-600 hover:bg-blue-700"
          >
            {isProceedLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {proceedLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModuleLiveCard;

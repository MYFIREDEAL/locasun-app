import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Composant d'édition inline
 * Affiche le texte, au clic passe en mode édition
 * Sauvegarde au blur ou Enter, annule avec Escape
 * 
 * @param {string} value - Valeur actuelle
 * @param {function} onSave - Callback appelé à la sauvegarde (value) => Promise<void>
 * @param {string} placeholder - Texte affiché si valeur vide
 * @param {string} className - Classes CSS additionnelles
 * @param {string} inputClassName - Classes CSS pour l'input
 * @param {boolean} multiline - Utiliser textarea au lieu de input
 * @param {string} as - Type de rendu: 'h1', 'h2', 'p', 'span'
 */
export const InlineEditable = ({
  value,
  onSave,
  placeholder = 'Cliquez pour modifier...',
  className = '',
  inputClassName = '',
  multiline = false,
  as = 'span',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  // Sync with external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      if (!multiline) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleClick = () => {
    if (!disabled && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('InlineEditable save error:', error);
      // Optionally show error state
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = (e) => {
    // Don't save if clicking on cancel button
    if (e.relatedTarget?.dataset?.action === 'cancel') {
      return;
    }
    handleSave();
  };

  // Render component based on 'as' prop
  const Tag = as;
  const displayValue = value || placeholder;
  const isEmpty = !value;

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    
    return (
      <div className="inline-flex items-center gap-2 w-full">
        <InputComponent
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          className={cn(
            'flex-1 px-3 py-2 border border-blue-400 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'bg-white text-gray-900',
            multiline && 'min-h-[80px] resize-y',
            isSaving && 'opacity-50 cursor-not-allowed',
            inputClassName
          )}
          placeholder={placeholder}
          rows={multiline ? 3 : undefined}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="Enregistrer"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          data-action="cancel"
          onClick={handleCancel}
          disabled={isSaving}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <Tag
      onClick={handleClick}
      className={cn(
        'group cursor-pointer inline-flex items-center gap-2',
        'hover:bg-blue-50 rounded-lg px-2 py-1 -mx-2 -my-1',
        'transition-colors duration-150',
        isEmpty && 'text-gray-400 italic',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      title={disabled ? undefined : 'Cliquez pour modifier'}
    >
      <span>{displayValue}</span>
      {!disabled && (
        <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Tag>
  );
};

/**
 * Composant d'édition inline pour les icônes (emoji picker simple)
 */
export const InlineEditableIcon = ({
  value,
  onSave,
  className = '',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '📋');
  const popoverRef = useRef(null);

  // Common emojis for blocks - inclut ceux de locasun.io
  const commonEmojis = [
    '☀️', '🤝', '�', '⚡', '�', '�', '�', '🌱',
    '�', '🔧', '✅', '📞', '🎯', '⭐', '📊', '💰',
    '👥', '�', '📈', '💼', '🛠️', '�', '🎉', '✨'
  ];

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '📋');
    }
  }, [value, isEditing]);

  // Fermer le picker en cliquant en dehors
  useEffect(() => {
    if (isEditing) {
      const handleClickOutside = (e) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target)) {
          setIsEditing(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  const handleSelect = async (emoji) => {
    try {
      await onSave(emoji);
      setEditValue(emoji);
      setIsEditing(false);
    } catch (error) {
      console.error('InlineEditableIcon save error:', error);
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-block" ref={popoverRef}>
        <button
          type="button"
          className="text-4xl"
        >
          {editValue}
        </button>
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 grid grid-cols-8 gap-2 min-w-[280px]">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-blue-50 hover:scale-125 rounded-lg transition-all duration-150"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsEditing(true)}
      disabled={disabled}
      className={cn(
        'text-4xl hover:scale-110 transition-transform cursor-pointer',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      title={disabled ? undefined : 'Cliquez pour changer l\'icône'}
    >
      {value || '📋'}
    </button>
  );
};

export default InlineEditable;

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Upload, Image as ImageIcon, Eye, EyeOff, Save, ShoppingBag,
  Type, FileText, MousePointerClick, Smartphone, Sparkles,
  Check, AlertCircle, ArrowLeft, GripVertical, Trash2, Plus,
  LayoutTemplate, Maximize2, Minimize2, Copy, Smile,
  Heading, AlignLeft, Minus, Star, ChevronDown, ChevronUp,
  Palette, Wand2
} from 'lucide-react';
import ModulesNavBar from '@/components/admin/ModulesNavBar';

// ═══════════════════════════════════════════════════════════════
// BLOCK TYPES & PRESETS
// ═══════════════════════════════════════════════════════════════

const BLOCK_TYPES = {
  'hero-image': { label: 'Image Hero', icon: '🖼️', lucide: ImageIcon, color: 'bg-purple-100 text-purple-700' },
  'title': { label: 'Titre', icon: '📝', lucide: Heading, color: 'bg-blue-100 text-blue-700' },
  'tagline': { label: 'Accroche', icon: '✨', lucide: Star, color: 'bg-amber-100 text-amber-700' },
  'feature': { label: 'Avantage', icon: '⚡', lucide: Smile, color: 'bg-emerald-100 text-emerald-700' },
  'text': { label: 'Texte', icon: '📄', lucide: AlignLeft, color: 'bg-gray-100 text-gray-700' },
  'image': { label: 'Image', icon: '📸', lucide: ImageIcon, color: 'bg-pink-100 text-pink-700' },
  'divider': { label: 'Séparateur', icon: '➖', lucide: Minus, color: 'bg-gray-100 text-gray-500' },
  'cta': { label: 'Bouton CTA', icon: '🔘', lucide: MousePointerClick, color: 'bg-green-100 text-green-700' },
};

const SIZE_OPTIONS = [
  { value: 'small', label: 'S', desc: 'Petit' },
  { value: 'medium', label: 'M', desc: 'Moyen' },
  { value: 'large', label: 'L', desc: 'Grand' },
  { value: 'full', label: 'XL', desc: 'Plein' },
];

const createBlock = (type, overrides = {}) => ({
  id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  size: 'full',
  content: getDefaultContent(type),
  ...overrides
});

function getDefaultContent(type) {
  switch (type) {
    case 'hero-image': return { url: '', height: 'medium' };
    case 'title': return { text: 'Titre du projet' };
    case 'tagline': return { text: 'Une accroche percutante pour vos clients' };
    case 'feature': return { emoji: '⚡', text: 'Décrivez un avantage clé ici' };
    case 'text': return { text: 'Paragraphe de texte libre...' };
    case 'image': return { url: '', caption: '', height: 'medium' };
    case 'divider': return { style: 'line' };
    case 'cta': return { text: '🚀 Lancer ce projet', style: 'primary' };
    default: return {};
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES PRÉDÉFINIS
// ═══════════════════════════════════════════════════════════════

const PAGE_TEMPLATES = [
  {
    id: 'landing-classic',
    name: '🏠 Landing classique',
    desc: 'Hero + titre + avantages + CTA',
    blocks: [
      createBlock('hero-image', { content: { url: '', height: 'large' } }),
      createBlock('title', { content: { text: 'Votre projet solaire' } }),
      createBlock('tagline', { content: { text: 'Investissez malin, produisez local' } }),
      createBlock('feature', { content: { emoji: '☀️', text: 'Énergie propre et renouvelable' } }),
      createBlock('feature', { content: { emoji: '💰', text: 'Rentabilité garantie dès la 1ère année' } }),
      createBlock('feature', { content: { emoji: '🔧', text: 'Installation et maintenance incluses' } }),
      createBlock('cta', { content: { text: '🚀 Commencer mon projet', style: 'primary' } }),
    ]
  },
  {
    id: 'minimal',
    name: '🪶 Minimaliste',
    desc: 'Image + texte court + CTA',
    blocks: [
      createBlock('hero-image', { content: { url: '', height: 'medium' } }),
      createBlock('title', { content: { text: 'Titre du projet' } }),
      createBlock('text', { content: { text: 'Une description concise de votre offre en quelques lignes.' } }),
      createBlock('cta', { content: { text: '➤ En savoir plus', style: 'primary' } }),
    ]
  },
  {
    id: 'full-features',
    name: '🌟 Showcase complet',
    desc: 'Tous les types de blocs',
    blocks: [
      createBlock('hero-image', { content: { url: '', height: 'large' } }),
      createBlock('title', { content: { text: 'Offre premium' } }),
      createBlock('tagline', { content: { text: 'Tout inclus pour votre tranquillité' } }),
      createBlock('divider'),
      createBlock('feature', { content: { emoji: '🏆', text: 'Qualité certifiée premium' } }),
      createBlock('feature', { content: { emoji: '📊', text: 'Suivi en temps réel de la production' } }),
      createBlock('feature', { content: { emoji: '🛡️', text: 'Garantie 25 ans constructeur' } }),
      createBlock('feature', { content: { emoji: '🤝', text: 'Accompagnement personnalisé' } }),
      createBlock('divider'),
      createBlock('text', { content: { text: "Nos experts vous accompagnent à chaque étape. De l'étude de faisabilité à la mise en service." } }),
      createBlock('image', { content: { url: '', caption: 'Nos réalisations', height: 'medium' } }),
      createBlock('cta', { content: { text: '🚀 Démarrer maintenant', style: 'primary' } }),
    ]
  },
  {
    id: 'empty',
    name: '📄 Page vierge',
    desc: 'Partez de zéro',
    blocks: []
  }
];

// ═══════════════════════════════════════════════════════════════
// SIZE → CSS MAPPING
// ═══════════════════════════════════════════════════════════════

const SIZE_WIDTH_CLASS = {
  small: 'w-[50%]',
  medium: 'w-[75%]',
  large: 'w-[90%]',
  full: 'w-full',
};

const SIZE_IMG_HEIGHT = {
  small: 'h-10',
  medium: 'h-16',
  large: 'h-24',
  full: 'h-32',
};

const SIZE_TEXT_CLASS = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  full: 'text-lg',
};

// ═══════════════════════════════════════════════════════════════
// SORTABLE BLOCK ITEM
// ═══════════════════════════════════════════════════════════════

const SortableBlock = ({ block, isSelected, onSelect, onDelete }) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const blockType = BLOCK_TYPES[block.type];
  const LucideIcon = blockType?.lucide || FileText;

  const widthClass = SIZE_WIDTH_CLASS[block.size] || 'w-full';

  return (
    <div className={`flex justify-center transition-all ${widthClass} mx-auto`}>
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border-2 transition-all cursor-pointer w-full ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
      }`}
      onClick={() => onSelect(block.id)}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${blockType?.color || 'bg-gray-100'}`}>
          <LucideIcon className="h-3 w-3" />
          {blockType?.label}
        </span>
        <span className="text-[10px] text-gray-400 font-mono uppercase">{block.size}</span>
        <div className="flex-1" />
        <button
          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-3 py-2">
        <BlockContentPreview block={block} />
      </div>
    </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// BLOCK CONTENT PREVIEW
// ═══════════════════════════════════════════════════════════════

const BlockContentPreview = ({ block }) => {
  const c = block.content || {};
  const imgH = SIZE_IMG_HEIGHT[block.size] || 'h-16';
  const textCls = SIZE_TEXT_CLASS[block.size] || 'text-sm';

  switch (block.type) {
    case 'hero-image':
      return c.url ? (
        <img src={c.url} alt="" className={`w-full ${imgH} object-cover rounded-lg transition-all`} onError={(e) => { e.target.style.display='none'; }} />
      ) : (
        <div className={`w-full ${imgH} rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center transition-all`}>
          <ImageIcon className="h-5 w-5 text-gray-400" />
        </div>
      );
    case 'title':
      return <p className={`font-bold ${textCls} text-gray-800 truncate transition-all`}>{c.text || 'Titre...'}</p>;
    case 'tagline':
      return <p className={`${textCls} text-gray-500 italic truncate transition-all`}>{c.text || 'Accroche...'}</p>;
    case 'feature':
      return (
        <div className="flex items-center gap-2">
          <span className={textCls}>{c.emoji || '⚡'}</span>
          <p className={`${textCls} text-gray-600 truncate flex-1 transition-all`}>{c.text || 'Avantage...'}</p>
        </div>
      );
    case 'text':
      return <p className={`${textCls} text-gray-500 line-clamp-3 transition-all`}>{c.text || 'Texte...'}</p>;
    case 'image':
      return c.url ? (
        <img src={c.url} alt="" className={`w-full ${imgH} object-cover rounded transition-all`} onError={(e) => { e.target.style.display='none'; }} />
      ) : (
        <div className={`w-full ${imgH} rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center transition-all`}>
          <ImageIcon className="h-4 w-4 text-gray-400" />
        </div>
      );
    case 'divider':
      return <hr className="border-gray-300 my-1" />;
    case 'cta':
      return (
        <div className={`w-full py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-center`}>
          <span className={`${textCls} text-white font-semibold`}>{c.text || 'Bouton CTA'}</span>
        </div>
      );
    default:
      return <p className="text-xs text-gray-400">Bloc inconnu</p>;
  }
};

// ═══════════════════════════════════════════════════════════════
// BLOCK EDITOR PANEL
// ═══════════════════════════════════════════════════════════════

const BlockEditorPanel = ({ block, onUpdate, onDelete }) => {
  if (!block) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
      <MousePointerClick className="h-10 w-10 mb-3 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">Cliquez sur un bloc</p>
      <p className="text-xs text-gray-400 mt-1">pour modifier ses propriétés</p>
    </div>
  );

  const blockType = BLOCK_TYPES[block.type];
  const c = block.content || {};

  const updateContent = (field, value) => {
    onUpdate(block.id, { content: { ...c, [field]: value } });
  };

  const updateSize = (size) => {
    onUpdate(block.id, { size });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${blockType?.color}`}>
          {blockType?.icon} {blockType?.label}
        </span>
        <button
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          onClick={() => onDelete(block.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Taille */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Taille du bloc</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZE_OPTIONS.map(s => (
            <button
              key={s.value}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                block.size === s.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => updateSize(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Champs image */}
      {(block.type === 'hero-image' || block.type === 'image') && (
        <>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">URL de l'image</Label>
            <Input
              value={c.url || ''}
              onChange={e => updateContent('url', e.target.value)}
              placeholder="https://..."
              className="rounded-lg text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Hauteur</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {['small', 'medium', 'large'].map(h => (
                <button
                  key={h}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                    c.height === h ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => updateContent('height', h)}
                >
                  {h === 'small' ? 'Petit' : h === 'medium' ? 'Moyen' : 'Grand'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Affichage</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'cover', label: '🖼️ Remplir' },
                { value: 'contain', label: '📐 Image entière' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (c.fit || 'cover') === opt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => updateContent('fit', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {block.type === 'image' && (
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Légende</Label>
              <Input
                value={c.caption || ''}
                onChange={e => updateContent('caption', e.target.value)}
                placeholder="Description de l'image..."
                className="rounded-lg text-sm"
              />
            </div>
          )}
        </>
      )}

      {/* Champs texte */}
      {(block.type === 'title' || block.type === 'tagline') && (
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Texte</Label>
          <Input
            value={c.text || ''}
            onChange={e => updateContent('text', e.target.value)}
            placeholder={block.type === 'title' ? 'Titre du projet...' : 'Accroche courte...'}
            className="rounded-lg text-sm"
          />
        </div>
      )}

      {/* Champs feature */}
      {block.type === 'feature' && (
        <>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Emoji</Label>
            <Input
              value={c.emoji || ''}
              onChange={e => updateContent('emoji', e.target.value)}
              placeholder="⚡"
              className="rounded-lg text-sm w-20"
              maxLength={4}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Texte de l'avantage</Label>
            <Textarea
              value={c.text || ''}
              onChange={e => updateContent('text', e.target.value)}
              placeholder="Décrivez l'avantage..."
              className="rounded-lg text-sm resize-none"
              rows={2}
            />
          </div>
        </>
      )}

      {/* Champs texte libre */}
      {block.type === 'text' && (
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Contenu</Label>
          <Textarea
            value={c.text || ''}
            onChange={e => updateContent('text', e.target.value)}
            placeholder="Votre texte ici..."
            className="rounded-lg text-sm resize-y min-h-[80px]"
            rows={4}
          />
        </div>
      )}

      {/* Champs CTA */}
      {block.type === 'cta' && (
        <>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Texte du bouton</Label>
            <Input
              value={c.text || ''}
              onChange={e => updateContent('text', e.target.value)}
              placeholder="🚀 Lancer ce projet"
              className="rounded-lg text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Style</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'primary', label: 'Principal', cls: 'bg-emerald-500 text-white' },
                { value: 'secondary', label: 'Secondaire', cls: 'bg-gray-200 text-gray-700' },
              ].map(s => (
                <button
                  key={s.value}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    c.style === s.value ? s.cls + ' ring-2 ring-offset-1 ring-indigo-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  onClick={() => updateContent('style', s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Champs divider */}
      {block.type === 'divider' && (
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Style</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { value: 'line', label: '── Ligne' },
              { value: 'dots', label: '••• Dots' },
              { value: 'space', label: '↕ Espace' },
            ].map(s => (
              <button
                key={s.value}
                className={`py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  c.style === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => updateContent('style', s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MOBILE PREVIEW
// ═══════════════════════════════════════════════════════════════

const MobilePreview = ({ blocks, project, displayData }) => {
  return (
    <div className="w-[300px] h-[560px] rounded-[2rem] border-[6px] border-gray-800 bg-gray-50 overflow-hidden relative shadow-2xl mx-auto">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-b-2xl z-20" />
      <div className="h-full overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <LayoutTemplate className="h-8 w-8 mb-2 text-gray-300" />
            <p className="text-[11px] text-center">Ajoutez des blocs<br/>pour construire la page</p>
          </div>
        ) : (
          <div>
            {blocks.map((block, i) => (
              <MobileBlockRenderer key={block.id} block={block} project={project} isFirst={i === 0} />
            ))}
            <div className="h-16" />
          </div>
        )}
      </div>
    </div>
  );
};

const MobileBlockRenderer = ({ block, project, isFirst }) => {
  const c = block.content || {};

  switch (block.type) {
    case 'hero-image':
      return (
        <div className={`relative ${c.height === 'small' ? 'h-24' : c.height === 'large' ? 'h-52' : 'h-36'} bg-gradient-to-br from-gray-200 to-gray-300`}>
          {c.url ? (
            <img src={c.url} alt="" className={`w-full h-full ${c.fit === 'contain' ? 'object-contain' : 'object-cover'}`} onError={(e) => { e.target.style.display='none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
          <div className="absolute top-6 left-3 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
            <ArrowLeft className="h-3.5 w-3.5 text-gray-700" />
          </div>
        </div>
      );
    case 'title':
      return (
        <div className={`px-4 ${isFirst ? 'pt-8' : 'pt-2'} pb-1`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{project?.icon}</span>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">{c.text}</h3>
          </div>
        </div>
      );
    case 'tagline':
      return <div className="px-4 pb-2"><p className="text-[11px] text-gray-500 leading-relaxed">{c.text}</p></div>;
    case 'feature':
      return (
        <div className="px-4 py-1">
          <div className="flex gap-2 p-2.5 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-sm">{c.emoji || '⚡'}</div>
            <p className="text-[11px] text-gray-600 leading-relaxed flex-1 pt-0.5">{c.text}</p>
          </div>
        </div>
      );
    case 'text':
      return <div className="px-4 py-1.5"><p className="text-[11px] text-gray-500 leading-relaxed">{c.text}</p></div>;
    case 'image':
      return (
        <div className="px-4 py-1.5">
          {c.url ? (
            <div>
              <img src={c.url} alt="" className={`w-full ${c.height === 'small' ? 'h-20' : c.height === 'large' ? 'h-40' : 'h-28'} ${c.fit === 'contain' ? 'object-contain' : 'object-cover'} rounded-xl`} onError={(e) => { e.target.style.display='none'; }} />
              {c.caption && <p className="text-[9px] text-gray-400 mt-1 text-center">{c.caption}</p>}
            </div>
          ) : (
            <div className={`w-full ${c.height === 'small' ? 'h-20' : c.height === 'large' ? 'h-40' : 'h-28'} rounded-xl bg-gray-200 flex items-center justify-center`}>
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      );
    case 'divider':
      if (c.style === 'dots') return <div className="text-center py-2 text-gray-300 text-xs tracking-[0.3em]">• • •</div>;
      if (c.style === 'space') return <div className="h-4" />;
      return <div className="px-6 py-2"><hr className="border-gray-200" /></div>;
    case 'cta':
      return (
        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2.5">
          <button className={`w-full py-2 rounded-xl font-semibold text-[11px] shadow-sm ${
            c.style === 'secondary'
              ? 'bg-gray-100 text-gray-700 border border-gray-200'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
          }`}>{c.text || '🚀 Lancer ce projet'}</button>
        </div>
      );
    default:
      return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// SIDEBAR PROJECT LIST
// ═══════════════════════════════════════════════════════════════

const ProjectSidebarItem = ({ project, isSelected, onClick }) => {
  const isPublic = project.isPublic || project.is_public;
  return (
    <div
      className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
        isSelected ? 'bg-indigo-50 border-2 border-indigo-400 shadow-sm' : 'bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'
      }`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
        {project.coverImage ? <img src={project.coverImage} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{project.icon}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm text-gray-800 truncate block">{project.title}</span>
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {isPublic ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
          {isPublic ? 'Visible' : 'Masqué'}
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CHOOSER
// ═══════════════════════════════════════════════════════════════

const TemplateChooser = ({ onSelect, onClose }) => (
  <div className="absolute inset-0 z-50 bg-white rounded-xl border-2 border-indigo-200 shadow-xl overflow-y-auto">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-indigo-500" /> Choisir un template
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>
      <div className="space-y-3">
        {PAGE_TEMPLATES.map(t => (
          <button
            key={t.id}
            className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
            onClick={() => { onSelect(t); onClose(); }}
          >
            <p className="font-semibold text-sm">{t.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            <p className="text-[10px] text-gray-400 mt-1">{t.blocks.length} blocs</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE : PAGE BUILDER
// ═══════════════════════════════════════════════════════════════

const ProjectDisplayManagementPage = () => {
  const { projectsData = {}, setProjectsData } = useAppContext();

  const [selectedType, setSelectedType] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [displayData, setDisplayData] = useState({ clientTitle: '', coverImage: '', isPublic: true, ctaText: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const projectOptions = useMemo(() =>
    Object.values(projectsData).map(p => ({ value: p.type, label: p.title, icon: p.icon, ...p })),
    [projectsData]
  );

  useEffect(() => {
    if (projectOptions.length > 0 && !selectedType) setSelectedType(projectOptions[0].value);
  }, [projectOptions, selectedType]);

  // Charger le projet
  useEffect(() => {
    if (selectedType && projectsData[selectedType]) {
      const p = projectsData[selectedType];
      setDisplayData({
        clientTitle: p.clientTitle || p.client_title || '',
        coverImage: p.coverImage || p.image_url || '',
        isPublic: p.isPublic !== undefined ? p.isPublic : (p.is_public !== undefined ? p.is_public : true),
        ctaText: p.ctaText || p.cta_text || '',
      });
      const saved = p.contentBlocks || p.content_blocks;
      if (saved && saved.length > 0) {
        setBlocks(saved.map(b => ({ ...b, id: b.id || 'block-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) })));
      } else {
        setBlocks(legacyToBlocks(p));
      }
      setSelectedBlockId(null);
      setShowPreview(false);
      setHasChanges(false);
    }
  }, [selectedType, projectsData]);

  const legacyToBlocks = (project) => {
    const result = [];
    const img = project.coverImage || project.image_url;
    if (img) result.push(createBlock('hero-image', { content: { url: img, height: 'medium' } }));
    const title = project.clientTitle || project.client_title || project.title;
    if (title) result.push(createBlock('title', { content: { text: title } }));
    const desc = project.clientDescription || project.client_description || '';
    if (desc) {
      const lines = desc.split('\n').filter(l => l.trim());
      const emojiRx = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
      let buf = [];
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const m = t.match(emojiRx);
        if (m) {
          if (buf.length > 0) { result.push(createBlock('text', { content: { text: buf.join('\n') } })); buf = []; }
          result.push(createBlock('feature', { content: { emoji: m[0], text: t.slice(m[0].length).trim() } }));
        } else { buf.push(t); }
      }
      if (buf.length > 0) result.push(createBlock('text', { content: { text: buf.join('\n') } }));
    }
    const cta = project.ctaText || project.cta_text;
    if (cta) result.push(createBlock('cta', { content: { text: cta, style: 'primary' } }));
    return result;
  };

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setBlocks(prev => {
        const oldIdx = prev.findIndex(b => b.id === active.id);
        const newIdx = prev.findIndex(b => b.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
      setHasChanges(true);
    }
  }, []);

  const addBlock = useCallback((type) => {
    const nb = createBlock(type);
    setBlocks(prev => [...prev, nb]);
    setSelectedBlockId(nb.id);
    setHasChanges(true);
    setShowAddBlock(false);
  }, []);

  const updateBlock = useCallback((id, updates) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, ...updates, content: updates.content ? { ...b.content, ...updates.content } : b.content } : b
    ));
    setHasChanges(true);
  }, []);

  const deleteBlock = useCallback((id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
    setHasChanges(true);
  }, [selectedBlockId]);

  const applyTemplate = useCallback((template) => {
    const newBlocks = template.blocks.map(b => ({
      ...b, id: 'block-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), content: { ...b.content }
    }));
    setBlocks(newBlocks);
    setSelectedBlockId(null);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!selectedType) return;
    setIsSaving(true);
    let legacyDesc = '';
    let legacyCover = displayData.coverImage;
    let legacyCta = displayData.ctaText;
    for (const b of blocks) {
      if (b.type === 'hero-image' && b.content?.url) legacyCover = b.content.url;
      else if (b.type === 'tagline') legacyDesc += (b.content?.text || '') + '\n';
      else if (b.type === 'feature') legacyDesc += (b.content?.emoji || '⚡') + ' ' + (b.content?.text || '') + '\n';
      else if (b.type === 'text') legacyDesc += (b.content?.text || '') + '\n';
      else if (b.type === 'cta') legacyCta = b.content?.text || legacyCta;
    }
    const updated = {
      ...projectsData[selectedType],
      clientTitle: displayData.clientTitle,
      coverImage: legacyCover,
      clientDescription: legacyDesc.trim(),
      ctaText: legacyCta,
      isPublic: displayData.isPublic,
      contentBlocks: blocks,
    };
    try {
      await setProjectsData({ ...projectsData, [selectedType]: updated });
      setHasChanges(false);
      toast({ title: '✅ Page sauvegardée !', description: 'La page ' + projectsData[selectedType].title + ' a été mise à jour.', className: 'bg-green-500 text-white' });
    } catch (error) {
      toast({ title: '❌ Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProject = selectedType && projectsData[selectedType];
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ModulesNavBar activeModule="catalogue" />
      <div className="flex flex-1 overflow-hidden">

        {/* ═══ Col 1 — Liste projets ═══ */}
        <div className="w-[220px] flex-shrink-0 bg-gray-50/80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">🛍️ Catalogue</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">{projectOptions.length} projets</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {projectOptions.map(p => (
              <ProjectSidebarItem key={p.value} project={p} isSelected={selectedType === p.value} onClick={() => setSelectedType(p.value)} />
            ))}
          </div>
        </div>

        {/* ═══ Col 2 — Page Builder ═══ */}
        {selectedProject ? (
          <>
            <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50/50">
                <span className="text-lg">{selectedProject.icon}</span>
                <Input
                  value={displayData.clientTitle}
                  onChange={e => { setDisplayData(d => ({ ...d, clientTitle: e.target.value })); setHasChanges(true); }}
                  placeholder={selectedProject.title}
                  className="h-7 text-sm font-semibold border-0 bg-transparent px-1 focus:bg-white focus:border-gray-200 rounded-lg flex-1 max-w-[200px]"
                />
                <div className="flex-1" />
                <div className="flex items-center gap-1.5">
                  {displayData.isPublic ? <Eye className="h-3.5 w-3.5 text-green-600" /> : <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                  <Switch checked={displayData.isPublic} onCheckedChange={(v) => { setDisplayData(d => ({ ...d, isPublic: v })); setHasChanges(true); }} className="scale-75" />
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={() => setShowTemplates(true)}>
                  <Wand2 className="h-3 w-3" /> Template
                </Button>
                <Button
                  onClick={handleSave} disabled={!hasChanges || isSaving} size="sm"
                  className={`h-7 text-xs gap-1 rounded-lg ${hasChanges ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  {isSaving ? '⏳' : hasChanges ? <><Save className="h-3 w-3" /> Sauver</> : <><Check className="h-3 w-3" /> OK</>}
                </Button>
              </div>

              {/* Blocs */}
              <div className="flex-1 overflow-y-auto p-4 relative">
                {showTemplates && <TemplateChooser onSelect={applyTemplate} onClose={() => setShowTemplates(false)} />}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {blocks.map(block => (
                        <SortableBlock key={block.id} block={block} isSelected={selectedBlockId === block.id} onSelect={setSelectedBlockId} onDelete={deleteBlock} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {blocks.length === 0 && !showTemplates && (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <LayoutTemplate className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Page vide</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Commencez par un template ou ajoutez des blocs</p>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTemplates(true)}>
                      <Wand2 className="h-3.5 w-3.5" /> Choisir un template
                    </Button>
                  </div>
                )}

                {/* Ajouter un bloc */}
                <div className="mt-4 relative">
                  <button
                    onClick={() => setShowAddBlock(!showAddBlock)}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" /> Ajouter un bloc
                  </button>
                  {showAddBlock && (
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl p-3 z-40">
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(BLOCK_TYPES).map(([type, info]) => (
                          <button
                            key={type}
                            className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                            onClick={() => addBlock(type)}
                          >
                            <span className="text-lg">{info.icon}</span>
                            <span className="text-[10px] font-medium text-gray-600">{info.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Col 3 — Éditeur bloc + Preview ═══ */}
            <div className="w-[340px] flex-shrink-0 flex flex-col bg-gray-50/50">
              {selectedBlock && !showPreview ? (
                /* ── Mode édition : éditeur pleine hauteur ── */
                <div className="flex-1 flex flex-col">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex-shrink-0 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-indigo-500" />
                      Propriétés du bloc
                    </h3>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Preview
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <BlockEditorPanel block={selectedBlock} onUpdate={updateBlock} onDelete={deleteBlock} />
                  </div>
                </div>
              ) : (
                /* ── Mode preview : aperçu mobile pleine hauteur ── */
                <div className="flex-1 flex flex-col">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex-shrink-0 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-indigo-500" /> Aperçu mobile
                    </h3>
                    {selectedBlock && (
                      <button
                        onClick={() => setShowPreview(false)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Palette className="h-3.5 w-3.5" />
                        Éditer
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex items-start justify-center py-4 overflow-y-auto bg-gradient-to-b from-gray-100 to-gray-200">
                    <div className="transform scale-[0.65] origin-top">
                      <MobilePreview blocks={blocks} project={selectedProject} displayData={displayData} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Sparkles className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Sélectionnez un projet</p>
            <p className="text-sm mt-1">pour construire sa page client</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDisplayManagementPage;

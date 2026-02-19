'use client';

import React from 'react';
import { LTX2SceneType } from '@/lib/ltx2/client';

interface SceneType {
  id: LTX2SceneType;
  label: string;
  description: string;
  previewUrl: string;
  isPro: boolean;
}

const SCENE_TYPES: SceneType[] = [
  {
    id: 'talking_head',
    label: 'Talking Head',
    description: 'Traditional presenter style, optimized for direct communication.',
    previewUrl: '/previews/talking_head.jpg',
    isPro: false,
  },
  {
    id: 'dramatic',
    label: 'Dramatic Monologue',
    description: 'Cinematic lighting and moody atmosphere for emotional delivery.',
    previewUrl: '/previews/dramatic.jpg',
    isPro: true,
  },
  {
    id: 'dialogue',
    label: 'Dialogue Scene',
    description: 'Two characters interacting in a cinematic setting.',
    previewUrl: '/previews/dialogue.jpg',
    isPro: true,
  },
  {
    id: 'action',
    label: 'Action Sequence',
    description: 'Dynamic camera movement and high-energy motion.',
    previewUrl: '/previews/action.jpg',
    isPro: true,
  },
  {
    id: 'ambient',
    label: 'Ambient B-Roll',
    description: 'Establishing shots and atmospheric backgrounds without dialogue.',
    previewUrl: '/previews/ambient.jpg',
    isPro: true,
  },
  {
    id: 'product',
    label: 'Product Showcase',
    description: '360° views and heroic angles to highlight physical products.',
    previewUrl: '/previews/product.jpg',
    isPro: true,
  },
];

interface SceneTypePickerProps {
  selectedId: LTX2SceneType;
  onSelect: (id: LTX2SceneType) => void;
  tier: string; // SubscriptionTier - 'free' locks pro features, any other tier unlocks
}

export const SceneTypePicker: React.FC<SceneTypePickerProps> = ({
  selectedId,
  onSelect,
  tier,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-2">🎬 Select Scene Type</h3>
      <div className="grid grid-cols-2 gap-3">
        {SCENE_TYPES.map((scene) => {
          const isLocked = scene.isPro && tier === 'free';
          const isSelected = selectedId === scene.id;

          return (
            <button
              key={scene.id}
              onClick={() => !isLocked && onSelect(scene.id)}
              className={`relative group flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left overflow-hidden ${
                isSelected
                  ? 'border-purple-500 bg-purple-900/40 ring-1 ring-purple-500'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              } ${isLocked ? 'cursor-not-allowed grayscale-[0.8]' : 'cursor-pointer'}`}
            >
              {/* Preview Placeholder */}
              <div className="w-full h-20 bg-slate-800 rounded-md mb-2 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="text-2xl">{getSceneEmoji(scene.id)}</span>
              </div>

              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-bold text-sm text-white">{scene.label}</span>
                {scene.isPro && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tier === 'pro' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500 text-white'
                  }`}>
                    PRO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 line-clamp-2 leading-tight">
                {scene.description}
              </p>

              {isLocked && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="bg-purple-600 text-white px-2 py-1 rounded text-[10px] font-bold rotate-[-12deg] shadow-lg">
                    UPGRADE
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function getSceneEmoji(id: LTX2SceneType): string {
  switch (id) {
    case 'talking_head': return '👤';
    case 'dramatic': return '🎭';
    case 'dialogue': return '💬';
    case 'action': return '⚡';
    case 'ambient': return '🌌';
    case 'product': return '📦';
    default: return '🎬';
  }
}

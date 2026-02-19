'use client';

import React, { useState } from 'react';
import { LTX2SceneType } from '@/lib/ltx2/client';

interface ScriptAssistantProps {
  sceneType: LTX2SceneType;
  onScriptGenerated: (script: string) => void;
  currentScript: string;
}

/** AI script generation is not live yet. UI shows coming soon and does not return mock data. */
const SCRIPT_ASSISTANT_LIVE = false;

export const ScriptAssistant: React.FC<ScriptAssistantProps> = ({
  sceneType,
  onScriptGenerated,
  currentScript,
}) => {
  const [topic, setTopic] = useState('');

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          🤖 AI Script Assistant
        </h3>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full uppercase font-bold">
          {sceneType.replace('_', ' ')} Mode
        </span>
      </div>

      {SCRIPT_ASSISTANT_LIVE ? (
        <>
          <div className="space-y-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`Enter a topic (e.g., "${sceneType === 'product' ? 'New Sneaker' : 'Space Travel'}")`}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              ✨ Generate {sceneType === 'ambient' ? 'Soundscape' : 'Script'}
            </button>
          </div>
          {currentScript && (
            <div className="relative group">
              <textarea
                value={currentScript}
                onChange={(e) => onScriptGenerated(e.target.value)}
                className="w-full h-24 bg-black/20 border border-white/5 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 resize-none"
                placeholder="Your script will appear here..."
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-gray-500">
                {currentScript.length} chars
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-white font-medium mb-1">Coming soon</p>
          <p className="text-sm text-gray-400">
            AI-generated script suggestions based on your topic and scene type will appear here once the feature is live.
          </p>
          {currentScript && (
            <div className="mt-3 text-left">
              <textarea
                value={currentScript}
                onChange={(e) => onScriptGenerated(e.target.value)}
                className="w-full h-24 bg-black/20 border border-white/5 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 resize-none"
                placeholder="Your script will appear here..."
              />
              <div className="text-right text-[10px] text-gray-500 mt-1">
                {currentScript.length} chars
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';

// Hedra expression styles
export type ExpressionStyle = 
  | 'confident' | 'excited' | 'serious' | 'friendly' 
  | 'mysterious' | 'professional' | 'energetic' | 'calm' | 'storyteller';

// Hedra speaking styles
export type SpeakingStyle = 
  | 'presenter' | 'storyteller' | 'news_anchor' | 'tutorial'
  | 'conversational' | 'dramatic' | 'sales_pitch';

// Character position in frame
export type CharacterPosition = 'center' | 'left' | 'right';

export interface CinematicSettings {
  // Mode
  mode: 'standard' | 'cinematic';
  
  // Hedra Expression & Speaking Styles
  expressionStyle: ExpressionStyle;
  speakingStyle: SpeakingStyle;
  
  // Character Position
  characterPosition: CharacterPosition;
  
  // Video
  resolution: '540p' | '720p';
  aspectRatio: '16:9' | '9:16' | '1:1';
  
  // Generation
  enhancePrompt: boolean;
  batchSize: number;
  seed?: number;
  
  // Audio
  musicTrack?: string;
  musicVolume: number;
  voiceVolume: number;
  
  // Tao-style Director notes (Advanced) — appended to Hedra prompt
  directorNotes?: string;
  
  // Legacy fields (for compatibility)
  duration: number;
  sceneType?: string;
  cameraMotion?: string;
  cameraSpeed?: number;
  fps?: number;
  guidanceScale?: number;
  isDraft?: boolean;
  imageUrls: string[];
  transitionStyle?: string;
  imageDuration?: number;
}

interface CinematicControlsProps {
  settings: CinematicSettings;
  onChange: (settings: CinematicSettings) => void;
  onAddImage?: (url: string) => void;
  onRemoveImage?: (index: number) => void;
}

const EXPRESSION_STYLES: { id: ExpressionStyle; label: string; icon: string; desc: string }[] = [
  { id: 'confident', label: 'Confident', icon: '💪', desc: 'Authoritative & assertive' },
  { id: 'excited', label: 'Excited', icon: '🎉', desc: 'Enthusiastic & energetic' },
  { id: 'serious', label: 'Serious', icon: '🎯', desc: 'Thoughtful & focused' },
  { id: 'friendly', label: 'Friendly', icon: '😊', desc: 'Warm & approachable' },
  { id: 'mysterious', label: 'Mysterious', icon: '🔮', desc: 'Intriguing & captivating' },
  { id: 'professional', label: 'Professional', icon: '👔', desc: 'Business-like & polished' },
  { id: 'energetic', label: 'Energetic', icon: '⚡', desc: 'High energy & dynamic' },
  { id: 'calm', label: 'Calm', icon: '🧘', desc: 'Serene & peaceful' },
  { id: 'storyteller', label: 'Storyteller', icon: '📖', desc: 'Engaging narrative style' },
];

const SPEAKING_STYLES: { id: SpeakingStyle; label: string; icon: string; desc: string }[] = [
  { id: 'presenter', label: 'Presenter', icon: '🎤', desc: 'Professional presentation' },
  { id: 'storyteller', label: 'Storyteller', icon: '📚', desc: 'Captivating narratives' },
  { id: 'news_anchor', label: 'News Anchor', icon: '📺', desc: 'Broadcast professional' },
  { id: 'tutorial', label: 'Tutorial', icon: '📝', desc: 'Patient teacher' },
  { id: 'conversational', label: 'Conversational', icon: '💬', desc: 'Natural friendly chat' },
  { id: 'dramatic', label: 'Dramatic', icon: '🎭', desc: 'Theatrical & emotional' },
  { id: 'sales_pitch', label: 'Sales Pitch', icon: '💰', desc: 'Persuasive & enthusiastic' },
];

const CHARACTER_POSITIONS: { id: CharacterPosition; label: string; icon: string; desc: string }[] = [
  { id: 'center', label: 'Center', icon: '⬜', desc: 'Character centered' },
  { id: 'left', label: 'Left', icon: '◀️', desc: 'Good for text overlays' },
  { id: 'right', label: 'Right', icon: '▶️', desc: 'Good for graphics' },
];

const MUSIC_TRACKS = [
  { id: 'none', label: 'No Music', icon: '🔇' },
  { id: 'upbeat', label: 'Upbeat', icon: '🎵' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎼' },
  { id: 'ambient', label: 'Ambient', icon: '🌊' },
  { id: 'dramatic', label: 'Dramatic', icon: '🥁' },
  { id: 'corporate', label: 'Corporate', icon: '💼' },
  { id: 'energetic', label: 'Energetic', icon: '⚡' },
  { id: 'lofi', label: 'Lo-Fi', icon: '☕' },
];

export default function CinematicControls({ settings, onChange }: CinematicControlsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('expression');
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if Hedra is configured
    fetch('/api/spacebaddie/cinematic?action=capabilities')
      .then(res => res.json())
      .then(data => setIsConfigured(data.configured))
      .catch(() => setIsConfigured(false));
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const updateSetting = <K extends keyof CinematicSettings>(key: K, value: CinematicSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  // Section header component (optional roleLabel for Film Crew: "Director", "DP", "Sound", "Editor")
  const SectionHeader = ({ id, title, icon, roleLabel }: { id: string; title: string; icon: string; roleLabel?: string }) => (
    <button
      onClick={() => toggleSection(id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: expandedSection === id ? 'rgba(255,107,157,0.1)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>
          {roleLabel ? `${roleLabel}: ${title}` : title}
        </span>
      </div>
      <span style={{ 
        transform: expandedSection === id ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
      }}>
        ▼
      </span>
    </button>
  );

  // Option button component
  const OptionButton = ({ 
    selected, 
    onClick, 
    icon, 
    label, 
    desc 
  }: { 
    selected: boolean; 
    onClick: () => void; 
    icon: string; 
    label: string; 
    desc?: string;
  }) => (
    <button
      onClick={onClick}
      style={{
        padding: desc ? '10px 12px' : '8px 12px',
        borderRadius: '10px',
        border: selected ? '2px solid #FF6B9D' : '1px solid rgba(255,255,255,0.15)',
        background: selected ? 'rgba(255,107,157,0.15)' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <div>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: selected ? '#fff' : '#ccc',
          }}>
            {label}
          </span>
          {desc && (
            <p style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{desc}</p>
          )}
        </div>
      </div>
    </button>
  );

  if (isConfigured === false && settings.mode === 'cinematic') {
    return (
      <div style={{
        padding: '20px',
        background: 'rgba(255,100,100,0.1)',
        border: '1px solid rgba(255,100,100,0.3)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#FF6B6B', fontWeight: 600, marginBottom: '8px' }}>
          Cinematic Mode Not Configured
        </p>
        <p style={{ color: '#888', fontSize: '13px' }}>
          HEDRA_API_KEY required for cinematic video generation.
          <br />
          <a 
            href="https://www.hedra.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#FF6B9D', textDecoration: 'underline' }}
          >
            Get your API key from Hedra →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        padding: '8px',
        background: 'rgba(0,0,0,0.3)',
        gap: '8px',
      }}>
        <button
          onClick={() => updateSetting('mode', 'standard')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            background: settings.mode === 'standard' 
              ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' 
              : 'transparent',
            color: settings.mode === 'standard' ? '#fff' : '#888',
          }}
        >
          🎙️ Standard (HeyGen/Hedra)
        </button>
        <button
          onClick={() => updateSetting('mode', 'cinematic')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            background: settings.mode === 'cinematic' 
              ? 'linear-gradient(135deg, #C77DFF 0%, #3B82F6 100%)' 
              : 'transparent',
            color: settings.mode === 'cinematic' ? '#fff' : '#888',
          }}
        >
          🎬 Cinematic (Hedra)
        </button>
      </div>

      {/* Cinematic-only sections */}
      {settings.mode === 'cinematic' && (
        <>
          {/* Director: Director notes (Tao-style cinematic keywords) */}
          <SectionHeader id="director_notes" title="Director notes" icon="🎬" roleLabel="Director" />
          {expandedSection === 'director_notes' && (
            <div style={{ padding: '16px' }}>
              <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>
                Cinematic keywords (e.g. single key light, film noir, shallow depth of field)
              </label>
              <textarea
                value={settings.directorNotes ?? ''}
                onChange={(e) => updateSetting('directorNotes', e.target.value)}
                placeholder="e.g. soft backlight, shallow DOF, warm tones"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* Director: Expression Style */}
          <SectionHeader id="expression" title="Expression style" icon="😊" roleLabel="Director" />
          {expandedSection === 'expression' && (
            <div style={{ 
              padding: '16px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px',
            }}>
              {EXPRESSION_STYLES.map((expr) => (
                <OptionButton
                  key={expr.id}
                  selected={settings.expressionStyle === expr.id}
                  onClick={() => updateSetting('expressionStyle', expr.id)}
                  icon={expr.icon}
                  label={expr.label}
                  desc={expr.desc}
                />
              ))}
            </div>
          )}

          {/* Director: Speaking Style */}
          <SectionHeader id="speaking" title="Speaking style" icon="🗣️" roleLabel="Director" />
          {expandedSection === 'speaking' && (
            <div style={{ 
              padding: '16px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '8px',
            }}>
              {SPEAKING_STYLES.map((style) => (
                <OptionButton
                  key={style.id}
                  selected={settings.speakingStyle === style.id}
                  onClick={() => updateSetting('speakingStyle', style.id)}
                  icon={style.icon}
                  label={style.label}
                  desc={style.desc}
                />
              ))}
            </div>
          )}

          {/* DP: Character Position */}
          <SectionHeader id="position" title="Character position" icon="📍" roleLabel="DP" />
          {expandedSection === 'position' && (
            <div style={{ padding: '16px' }}>
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                marginBottom: '16px',
              }}>
                {CHARACTER_POSITIONS.map((pos) => (
                  <OptionButton
                    key={pos.id}
                    selected={settings.characterPosition === pos.id}
                    onClick={() => updateSetting('characterPosition', pos.id)}
                    icon={pos.icon}
                    label={pos.label}
                    desc={pos.desc}
                  />
                ))}
              </div>
              
              {/* Visual Position Preview */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: settings.characterPosition === 'left' ? 'flex-start' 
                  : settings.characterPosition === 'right' ? 'flex-end' 
                  : 'center',
              }}>
                <div style={{
                  width: '60px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #FF6B9D 0%, #8A2BE2 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  👤
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sound: Audio Layout (both modes) */}
      <SectionHeader id="audio" title="Music & volume" icon="🎵" roleLabel="Sound" />
      {expandedSection === 'audio' && (
        <div style={{ padding: '16px' }}>
          {/* Music Track Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>
              Background Music
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: '8px',
            }}>
              {MUSIC_TRACKS.map((track) => (
                <OptionButton
                  key={track.id}
                  selected={settings.musicTrack === track.id}
                  onClick={() => updateSetting('musicTrack', track.id === 'none' ? undefined : track.id)}
                  icon={track.icon}
                  label={track.label}
                />
              ))}
            </div>
          </div>
          
          {/* Volume Controls */}
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: '8px',
              }}>
                <span>🎙️ Voice Volume</span>
                <span style={{ color: '#22c55e' }}>{Math.round(settings.voiceVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.voiceVolume}
                onChange={(e) => updateSetting('voiceVolume', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#22c55e' }}
              />
            </div>
            
            {settings.musicTrack && (
              <div>
                <label style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '12px', 
                  color: '#888', 
                  marginBottom: '8px',
                }}>
                  <span>🎵 Music Volume</span>
                  <span style={{ color: '#C77DFF' }}>{Math.round(settings.musicVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#C77DFF' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor: Video Settings */}
      <SectionHeader id="video" title="Duration & quality" icon="📐" roleLabel="Editor" />
      {expandedSection === 'video' && (
        <div style={{ padding: '16px' }}>
          {/* Resolution */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>
              Resolution
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: '540p', label: '540p', desc: 'Faster' },
                { id: '720p', label: '720p', desc: 'HD Quality' },
              ].map((res) => (
                <OptionButton
                  key={res.id}
                  selected={settings.resolution === res.id}
                  onClick={() => updateSetting('resolution', res.id as '540p' | '720p')}
                  icon="📺"
                  label={res.label}
                  desc={res.desc}
                />
              ))}
            </div>
          </div>
          
          {/* Aspect Ratio */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>
              Aspect Ratio
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: '9:16', label: '9:16', desc: 'TikTok/Reels' },
                { id: '16:9', label: '16:9', desc: 'YouTube/Landscape' },
                { id: '1:1', label: '1:1', desc: 'Square' },
              ].map((ar) => (
                <OptionButton
                  key={ar.id}
                  selected={settings.aspectRatio === ar.id}
                  onClick={() => updateSetting('aspectRatio', ar.id as '16:9' | '9:16' | '1:1')}
                  icon="📐"
                  label={ar.label}
                  desc={ar.desc}
                />
              ))}
            </div>
          </div>
          
          {/* AI Enhancement */}
          {settings.mode === 'cinematic' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px', 
                  color: '#888', 
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={settings.enhancePrompt}
                    onChange={(e) => updateSetting('enhancePrompt', e.target.checked)}
                    style={{ accentColor: '#FF6B9D' }}
                  />
                  <span>AI Enhance (let Hedra improve your style prompt)</span>
                </label>
              </div>
              
              {/* Batch Size */}
              <div>
                <label style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '12px', 
                  color: '#888', 
                  marginBottom: '8px',
                }}>
                  <span>Generate Variations</span>
                  <span style={{ color: '#FF6B9D' }}>{settings.batchSize} video{settings.batchSize > 1 ? 's' : ''}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={settings.batchSize}
                  onChange={(e) => updateSetting('batchSize', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#FF6B9D' }}
                />
                <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                  Generate multiple variations to pick the best one
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Provider Info */}
      <div style={{
        padding: '16px',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#888' }}>
              {settings.mode === 'cinematic' ? 'Powered by Hedra Character-1' : 'Video Generation'}
            </p>
            <p style={{ fontSize: '10px', color: '#666' }}>
              {settings.mode === 'cinematic' 
                ? 'Expressive talking avatar with natural emotions' 
                : 'Standard talking video'}
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #C77DFF 0%, #3B82F6 100%)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {settings.mode === 'cinematic' ? 'Hedra' : 'HeyGen'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export default settings factory
export const getDefaultCinematicSettings = (): CinematicSettings => ({
  mode: 'standard',
  expressionStyle: 'friendly',
  speakingStyle: 'conversational',
  characterPosition: 'center',
  resolution: '720p',
  aspectRatio: '9:16',
  enhancePrompt: true,
  batchSize: 1,
  musicVolume: 0.3,
  voiceVolume: 1.0,
  directorNotes: undefined,
  imageUrls: [],
  // Legacy fields for compatibility
  duration: 30,
  sceneType: 'talking_head',
  cameraMotion: 'static',
  cameraSpeed: 1.0,
  fps: 24,
  guidanceScale: 7.5,
  isDraft: false,
  transitionStyle: 'fade',
  imageDuration: 3,
});

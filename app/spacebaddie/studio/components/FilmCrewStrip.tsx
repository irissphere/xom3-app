'use client';

/**
 * Multi-line AI Film Crew — named agents (Director, DP, Script, Sound, Editor)
 * so users see that a team of specialized AI agents is working on their video.
 */

export interface FilmCrewMember {
  role: string;
  name: string;
  shortRole: string; // e.g. "DP" for Director of Photography
  description: string;
  icon: string;
}

export const FILM_CREW: FilmCrewMember[] = [
  { role: 'Director', name: 'Alex', shortRole: 'Director', description: 'Sets the look and style', icon: '🎬' },
  { role: 'Director of Photography', name: 'Sam', shortRole: 'DP', description: 'Framing, lighting & camera', icon: '📷' },
  { role: 'Script', name: 'Jordan', shortRole: 'Script', description: 'Voice, script & TTS', icon: '📝' },
  { role: 'Sound', name: 'Riley', shortRole: 'Sound', description: 'Music & mix', icon: '🎵' },
  { role: 'Editor', name: 'Casey', shortRole: 'Editor', description: 'Duration & assembly', icon: '✂️' },
];

interface FilmCrewStripProps {
  compact?: boolean;
  showTagline?: boolean;
}

export default function FilmCrewStrip({ compact = false, showTagline = true }: FilmCrewStripProps) {
  return (
    <div style={{
      marginBottom: compact ? '12px' : '20px',
      padding: compact ? '10px 14px' : '16px 20px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
    }}>
      {showTagline && (
        <p style={{
          fontSize: '12px',
          color: '#888',
          marginBottom: compact ? '8px' : '12px',
          fontWeight: 600,
        }}>
          Your multi-line AI team — our best agents, working together
        </p>
      )}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? '8px' : '12px',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {FILM_CREW.map((member) => (
          <div
            key={member.shortRole}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: compact ? '6px' : '8px',
              padding: compact ? '6px 10px' : '8px 14px',
              background: 'rgba(199,125,255,0.08)',
              border: '1px solid rgba(199,125,255,0.2)',
              borderRadius: '8px',
              color: '#e0e0e0',
            }}
            title={member.description}
          >
            <span style={{ fontSize: compact ? '14px' : '16px' }}>{member.icon}</span>
            <span style={{ fontWeight: 600, fontSize: compact ? '12px' : '13px' }}>
              {member.name} ({member.shortRole})
            </span>
            {!compact && (
              <span style={{ fontSize: '11px', color: '#888' }}>{member.description}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

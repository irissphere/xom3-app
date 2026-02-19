'use client';

import React, { useState } from 'react';

export const EducationPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const sections = [
    {
      title: "📉 What is Confidence %?",
      content: "Confidence is calculated based on 'confluence'—how many different mathematical indicators agree on the direction. 70%+ means strong agreement. However, no indicator is 100% accurate. Markets can be unpredictable during news events."
    },
    {
      title: "⏱️ Choosing Timeframes",
      content: "For PocketOption, the chart timeframe should usually match your trade duration. If you're looking at a 5m chart, set your trade expiry to 5 minutes. 1m is fast and volatile; 15m or 30m are more stable for beginners."
    },
    {
      title: "🛡️ Risk Management (Rule #1)",
      content: "Never risk more than 2% to 5% of your total account on a single trade. If you have $100, your trade should be $2 to $5 max. This ensures one bad streak doesn't wipe out your balance."
    },
    {
      title: "🛑 When NOT to Trade",
      content: "Avoid trading 30 minutes before or after major news (like inflation reports or central bank speeches). Also, don't trade when signals are 'Neutral' or when there's low confluence (less than 3 indicators)."
    },
    {
      title: "📈 CALL vs PUT",
      content: "A 'CALL' (Green) means we expect the price to be higher than your entry point when the time expires. A 'PUT' (Red) means we expect it to be lower."
    }
  ];

  return (
    <div style={{ background: 'rgba(30, 30, 45, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🎓</span>
          <h3 style={{ fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px', margin: 0 }}>Trading Education</h3>
        </div>
        <span style={{ color: '#888', transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
          {sections.map((section, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h4 style={{ fontWeight: 'bold', color: '#ec4899', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>{section.title}</h4>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                {section.content}
              </p>
            </div>
          ))}
          <div style={{ padding: '16px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <p style={{ fontSize: '10px', color: 'rgba(253, 224, 71, 0.8)', fontStyle: 'italic', fontWeight: 500, margin: 0 }}>
              Pro Tip: Wait for the price to 'pull back' slightly towards the support or resistance level before entering a CALL or PUT for a better entry price.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

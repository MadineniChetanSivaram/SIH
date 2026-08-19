/**
 * Haptic Pulse & Tactile Feedback Overlay
 * Displays optical pulse ripples matching the current vibration pattern.
 */

import React, { useEffect, useState } from 'react';
import { hapticsService, HapticType } from '../services/hapticsService';

export const HapticVisualizer: React.FC = () => {
  const [pulse, setPulse] = useState<{ active: boolean; type: HapticType } | null>(null);

  useEffect(() => {
    const unsub = hapticsService.onHapticEvent((type) => {
      setPulse({ active: true, type });
      const timer = setTimeout(() => {
        setPulse(null);
      }, 500);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  if (!pulse) return null;

  const colorClass = 
    pulse.type === 'critical' ? 'border-rose-500 bg-rose-500/10' :
    pulse.type === 'warning' ? 'border-amber-500 bg-amber-500/10' :
    'border-cyan-400 bg-cyan-400/10';

  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-50 border-4 animate-ping duration-300 ${colorClass}`}
      aria-hidden="true"
    />
  );
};

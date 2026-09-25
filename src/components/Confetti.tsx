import React, { useEffect, useState } from 'react';

export const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; y: number; size: number; color: string; rotation: number; speed: number }>>([]);

  useEffect(() => {
    const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const newPieces = Array.from({ length: 75 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: Math.floor(Math.random() * 10) + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      speed: Math.random() * 2 + 1.5,
    }));
    setPieces(newPieces);

    const interval = setInterval(() => {
      setPieces(prev =>
        prev.map(p => ({
          ...p,
          y: p.y > 110 ? -10 : p.y + p.speed,
          rotation: p.rotation + 5,
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            boxShadow: `0 0 8px ${p.color}`
          }}
        />
      ))}
    </div>
  );
};

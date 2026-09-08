import React, { useEffect, useState } from 'react';

export const CursorSpotlight: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      {/* Background Interactive Radial Spotlight Follower */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 hidden md:block"
        style={{
          background: `radial-gradient(650px circle at ${position.x}px ${position.y}px, rgba(56, 189, 248, 0.12), rgba(236, 72, 153, 0.08) 35%, rgba(168, 85, 247, 0.04) 60%, transparent 80%)`,
        }}
      />

      {/* Floating Glowing Cursor Ring */}
      <div
        className={`pointer-events-none fixed z-50 rounded-full border border-cyan-400/50 transition-transform duration-100 ease-out hidden md:block ${
          isHovered ? 'scale-150 border-pink-400 bg-cyan-400/15 shadow-[0_0_25px_rgba(56,189,248,0.6)]' : 'scale-100 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '28px',
          height: '28px',
          transform: `translate(-50%, -50%) scale(${isHovered ? 1.4 : 1})`,
        }}
      />
    </>
  );
};

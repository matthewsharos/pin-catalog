'use client';

import { useEffect, useRef } from 'react';

export default function SmokeEffect({ color, position, onComplete }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 50;

    // Convert color names to RGB
    const colorMap = {
      green: '76, 187, 23',
      brown: '165, 42, 42',
      blue: '59, 130, 246'
    };
    const rgbColor = colorMap[color] || '255, 255, 255';

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 2 + 1,
        alpha: 1,
        life: 1
      });
    }
    particlesRef.current = particles;

    let startTime = Date.now();
    const duration = 1000; // Animation duration in ms

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      let allDead = true;

      particles.forEach(particle => {
        if (particle.life > 0) {
          allDead = false;
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.02;
          particle.alpha = particle.life;
          particle.size *= 0.99;

          ctx.beginPath();
          ctx.fillStyle = `rgba(${rgbColor}, ${particle.alpha})`;
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (allDead) {
        cancelAnimationFrame(animationFrameRef.current);
        onComplete?.();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [color, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={100}
      height={100}
      className="absolute pointer-events-none"
      style={{
        left: position.x - 50,
        top: position.y - 50,
        zIndex: 50
      }}
    />
  );
}

import type React from 'react';
import { useRef, useEffect } from 'react';
import type { ObstacleToolDef } from '../../config/editorTools';
import { renderHazard } from '../../graphics/environmentRenderer';

interface ObstacleToolPreviewCanvasProps {
  tool: ObstacleToolDef;
}

export const ObstacleToolPreviewCanvas: React.FC<ObstacleToolPreviewCanvasProps> = ({ tool }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let clock = Math.random() * 5;

    const targetW = tool.defaultWidth;
    const targetH = tool.defaultHeight;

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      clock += dt;

      const rect = canvas.getBoundingClientRect();
      const cssW = rect.width > 0 ? rect.width : 110;
      const cssH = rect.height > 0 ? rect.height : 52;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetPixelW = Math.floor(cssW * dpr);
      const targetPixelH = Math.floor(cssH * dpr);

      if (canvas.width !== targetPixelW || canvas.height !== targetPixelH) {
        canvas.width = targetPixelW;
        canvas.height = targetPixelH;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Subtle atmospheric backdrop
      const bgGrad = ctx.createRadialGradient(cssW / 2, cssH / 2, 4, cssW / 2, cssH / 2, cssW / 1.5);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#090e17');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cssW, cssH);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 10; x < cssW; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssH);
        ctx.stroke();
      }

      // Calculate scale to fit hazard nicely with padding
      const maxW = cssW - 18;
      const maxH = cssH - 12;
      const scale = Math.min(1.0, maxW / targetW, maxH / targetH);

      const scaledW = targetW * scale;
      const scaledH = targetH * scale;
      const renderX = (cssW - scaledW) / 2;
      const renderY = (cssH - scaledH) / 2;

      ctx.save();
      ctx.translate(renderX, renderY);
      ctx.scale(scale, scale);

      renderHazard(
        ctx,
        {
          id: `preview-${tool.hazardType}`,
          type: tool.hazardType,
          x: 0,
          y: 0,
          width: targetW,
          height: targetH
        },
        clock
      );

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [tool]);

  return <canvas ref={canvasRef} className="obstacle-preview-canvas" />;
};

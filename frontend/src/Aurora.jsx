import { useEffect, useRef } from 'react';
import './Aurora.css';

const Aurora = ({
    colorStops = ["#3A29FF", "#FF94B4", "#FF3232"],
    blend = 0.5,
    amplitude = 1.0,
    speed = 0.5
}) => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
            canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
        };
        resize();
        window.addEventListener('resize', resize);

        const t0 = performance.now();

        const draw = (now) => {
            const t = (now - t0) * 0.001 * speed;
            const w = canvas.width;
            const h = canvas.height;

            // Dark base
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, w, h);

            // Draw multiple aurora bands
            const bands = [
                { yBase: 0.3, xFreq: 0.8, yFreq: 1.2, thickness: 0.25, opacity: 0.35, color: colorStops[0], phase: 0 },
                { yBase: 0.4, xFreq: 1.1, yFreq: 0.9, thickness: 0.3, opacity: 0.3, color: colorStops[1], phase: 2 },
                { yBase: 0.5, xFreq: 0.6, yFreq: 1.5, thickness: 0.2, opacity: 0.25, color: colorStops[2] || colorStops[0], phase: 4 },
                { yBase: 0.35, xFreq: 1.4, yFreq: 0.7, thickness: 0.22, opacity: 0.2, color: colorStops[0], phase: 1.5 },
                { yBase: 0.45, xFreq: 0.9, yFreq: 1.3, thickness: 0.28, opacity: 0.15, color: colorStops[1], phase: 3.5 },
            ];

            for (const band of bands) {
                const yCenter = h * band.yBase + Math.sin(t * band.yFreq + band.phase) * h * 0.08 * amplitude;
                const thickness = h * band.thickness;

                // Create gradient for this band
                const grad = ctx.createLinearGradient(0, yCenter - thickness, 0, yCenter + thickness);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.3, hexToRgba(band.color, band.opacity * blend));
                grad.addColorStop(0.5, hexToRgba(band.color, band.opacity * blend * 1.5));
                grad.addColorStop(0.7, hexToRgba(band.color, band.opacity * blend));
                grad.addColorStop(1, 'transparent');

                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = grad;

                // Wavy path
                ctx.beginPath();
                ctx.moveTo(-10, yCenter + thickness);
                for (let x = 0; x <= w + 10; x += 4) {
                    const wave = Math.sin(x * 0.003 * band.xFreq + t * band.xFreq + band.phase) * thickness * 0.4 * amplitude
                        + Math.sin(x * 0.006 * band.xFreq + t * 0.7 + band.phase * 2) * thickness * 0.2 * amplitude;
                    ctx.lineTo(x, yCenter + wave - thickness);
                }
                for (let x = w + 10; x >= -10; x -= 4) {
                    const wave = Math.sin(x * 0.003 * band.xFreq + t * band.xFreq + band.phase) * thickness * 0.4 * amplitude
                        + Math.sin(x * 0.006 * band.xFreq + t * 0.7 + band.phase * 2) * thickness * 0.2 * amplitude;
                    ctx.lineTo(x, yCenter + wave + thickness);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Add a subtle radial glow at center
            const radialGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.5);
            radialGrad.addColorStop(0, hexToRgba(colorStops[0], 0.08));
            radialGrad.addColorStop(0.5, hexToRgba(colorStops[1], 0.04));
            radialGrad.addColorStop(1, 'transparent');
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = radialGrad;
            ctx.fillRect(0, 0, w, h);

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [colorStops, blend, amplitude, speed]);

    return <canvas ref={canvasRef} className="aurora-canvas" />;
};

function hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(100,100,255,${alpha})`;
    return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
}

export default Aurora;

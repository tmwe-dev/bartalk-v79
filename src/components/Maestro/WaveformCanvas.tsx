/**
 * BarTalk v8 — Waveform Canvas Component
 * Canvas-based visualization for comparing reference and student audio waveforms.
 */

import { useRef, useEffect, useState } from 'react';

interface WaveformCanvasProps {
  referenceData: number[];  // normalized 0-1 amplitude array
  studentData: number[];    // normalized 0-1 amplitude array
  score: number;            // 0-100, determines student line color
  isRecording?: boolean;    // if true, show live animation
  liveData?: Uint8Array;    // from AnalyserNode for real-time viz
  height?: number;
  width?: number;
}

/**
 * Get color based on pronunciation score.
 */
function getScoreColor(score: number): string {
  if (score < 40) return '#ef4444'; // red
  if (score < 70) return '#f59e0b'; // yellow/orange
  return '#22c55e'; // green
}

/**
 * Draw a waveform on canvas using vertical bars.
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: number[],
  color: string,
  centerY: number,
  height: number,
  barWidth: number,
  gapWidth: number,
  opacity: number,
) {
  if (data.length === 0) return;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  const totalWidth = barWidth + gapWidth;
  const startX = 10;

  for (let i = 0; i < data.length; i++) {
    const amplitude = Math.min(data[i], 1);
    const barHeight = amplitude * (height / 2);

    const x = startX + i * totalWidth;
    const topY = centerY - barHeight;

    // Draw bar (symmetric around center)
    ctx.fillRect(x, topY, barWidth, barHeight * 2);
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw subtle grid lines.
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
) {
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.1)';
  ctx.lineWidth = 1;

  // Horizontal lines
  const gridLineCount = 4;
  for (let i = 0; i <= gridLineCount; i++) {
    const y = (canvasHeight / gridLineCount) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Center line
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight / 2);
  ctx.lineTo(canvasWidth, canvasHeight / 2);
  ctx.stroke();
}

/**
 * Draw live waveform from analyser node (real-time).
 */
function drawLiveWaveform(
  ctx: CanvasRenderingContext2D,
  liveData: Uint8Array,
  centerY: number,
  height: number,
  canvasWidth: number,
) {
  if (!liveData || liveData.length === 0) return;

  ctx.strokeStyle = '#ef4444'; // red for live
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;

  const startX = 10;
  const drawWidth = canvasWidth - 20;
  const step = Math.max(1, Math.floor(liveData.length / (drawWidth / 4)));

  ctx.beginPath();
  let isFirst = true;

  for (let i = 0; i < liveData.length; i += step) {
    const normalized = liveData[i] / 256;
    const barHeight = normalized * (height / 2);
    const x = startX + ((i / liveData.length) * drawWidth);
    const y = centerY - barHeight;

    if (isFirst) {
      ctx.moveTo(x, y);
      isFirst = false;
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function WaveformCanvas({
  referenceData,
  studentData,
  score,
  isRecording,
  liveData,
  height = 120,
  width,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(width || 0);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setContainerWidth(rect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initial size
    const rect = containerRef.current.getBoundingClientRect();
    setContainerWidth(rect.width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Draw waveforms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Clear canvas — use CSS variable-based background
    const computedStyle = getComputedStyle(canvas);
    const bgColor = computedStyle.getPropertyValue('--waveform-bg').trim() || '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, containerWidth, height);

    // Draw grid
    drawGrid(ctx, containerWidth, height);

    const centerY = height / 2;
    const barWidth = 3;
    const gapWidth = 2;

    // Draw reference waveform (semi-transparent blue/gray)
    drawWaveform(
      ctx,
      referenceData,
      '#9ca3af', // gray
      centerY,
      height,
      barWidth,
      gapWidth,
      0.3,
    );

    // Draw student waveform (colored based on score)
    const studentColor = getScoreColor(score);
    drawWaveform(
      ctx,
      studentData,
      studentColor,
      centerY,
      height,
      barWidth,
      gapWidth,
      0.7,
    );

    // Draw live waveform if recording
    if (isRecording && liveData) {
      drawLiveWaveform(ctx, liveData, centerY, height, containerWidth);
    }
  }, [referenceData, studentData, score, height, containerWidth, isRecording, liveData]);

  // Live animation loop
  useEffect(() => {
    if (!isRecording || !liveData) return;

    const animate = () => {
      // Trigger redraw
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.dispatchEvent(new CustomEvent('redraw'));
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, liveData]);

  return (
    <div
      ref={containerRef}
      className="waveform-canvas"
    >
      <canvas
        ref={canvasRef}
        className="waveform-canvas__el"
        style={{ display: 'block', width: '100%' }}
      />
    </div>
  );
}

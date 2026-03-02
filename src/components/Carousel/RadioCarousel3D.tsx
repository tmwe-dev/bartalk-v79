import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import type { Message } from '../../types/conversation';
import { AGENTS } from '../../lib/agents';

// --- Costanti ---
const MAX_CARDS = 8;
const RADIUS = 9;
const CARD_Y = 0.6;
const CARD_WIDTH = 3.8;
const CARD_HEIGHT = 5.2;
const FOV_DESKTOP = 60;
const FOV_MOBILE = 55;
const CAMERA_POS = new THREE.Vector3(0, 1, 15);

// Colori agente
const AGENT_COLORS: Record<string, { top: string; bottom: string; badge: string }> = {
  albert: { top: 'rgba(34,197,94,0.35)', bottom: 'rgba(22,163,74,0.08)', badge: '#22c55e' },
  archimede: { top: 'rgba(168,85,247,0.35)', bottom: 'rgba(147,51,234,0.08)', badge: '#a855f7' },
  pitagora: { top: 'rgba(6,182,212,0.35)', bottom: 'rgba(8,145,178,0.08)', badge: '#06b6d4' },
  newton: { top: 'rgba(245,158,11,0.35)', bottom: 'rgba(217,119,6,0.08)', badge: '#f59e0b' },
  human: { top: 'rgba(59,130,246,0.35)', bottom: 'rgba(37,99,235,0.08)', badge: '#3b82f6' },
  system: { top: 'rgba(100,100,100,0.35)', bottom: 'rgba(60,60,60,0.08)', badge: '#666' },
};

function getAgentColor(senderName: string) {
  const agent = AGENTS.find(a => a.name.toLowerCase() === senderName.toLowerCase());
  if (agent) return AGENT_COLORS[agent.id] || AGENT_COLORS.system;
  if (senderName === 'Tu') return AGENT_COLORS.human;
  return AGENT_COLORS.system;
}

// --- Card texture via Canvas ---
function createCardTexture(msg: Message, dpr: number): THREE.CanvasTexture {
  const w = 800;
  const h = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const colors = getAgentColor(msg.senderName);

  // Background scuro con bordo arrotondato
  ctx.fillStyle = 'rgba(12,12,18,0.95)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 24);
  ctx.fill();

  // Gradiente colorato sopra
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, colors.top);
  grad.addColorStop(0.5, colors.bottom);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 24);
  ctx.fill();

  // Bordo sottile
  ctx.strokeStyle = colors.badge + '40';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, 24);
  ctx.stroke();

  // Linea colorata in alto
  ctx.fillStyle = colors.badge;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 5, [24, 24, 0, 0]);
  ctx.fill();

  // Badge provider
  ctx.fillStyle = colors.badge;
  ctx.beginPath();
  ctx.roundRect(30, 28, 160, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const agent = AGENTS.find(a => a.name === msg.senderName);
  ctx.fillText(agent?.provider?.toUpperCase() || msg.senderType.toUpperCase(), 110, 52);

  // Emoji + nome agente
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const emoji = agent?.emoji || '💬';
  ctx.fillText(`${emoji} ${msg.senderName}`, 30, 110);

  // Separatore
  ctx.strokeStyle = colors.badge + '30';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 130);
  ctx.lineTo(w - 30, 130);
  ctx.stroke();

  // Testo messaggio (word wrap)
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '22px system-ui, sans-serif';
  const maxWidth = w - 60;
  const lineHeight = 30;
  let y = 165;
  const words = msg.content.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, 30, y);
      line = word;
      y += lineHeight;
      if (y > h - 80) {
        ctx.fillText(line + '...', 30, y);
        line = '';
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, 30, y);

  // Footer: timestamp
  if (msg.createdAt) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const time = new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(time, w - 30, h - 30);
  }

  // Token info
  if (msg.tokensIn || msg.tokensOut) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${msg.tokensIn || 0}→${msg.tokensOut || 0} tok`, 30, h - 30);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// --- Props ---
interface RadioCarousel3DProps {
  messages: Message[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function RadioCarousel3D({ messages, currentIndex, onIndexChange }: RadioCarousel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const targetAngleRef = useRef(0);
  const currentAngleRef = useRef(0);
  const animFrameRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  // Inizializza Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const fov = isMobile ? FOV_MOBILE : FOV_DESKTOP;
    const { width, height } = container.getBoundingClientRect();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);
    camera.position.copy(CAMERA_POS);
    camera.lookAt(0, CARD_Y, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    setIsReady(true);

    const onResize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Smooth rotation
      const diff = targetAngleRef.current - currentAngleRef.current;
      if (Math.abs(diff) > 0.001) {
        currentAngleRef.current += diff * 0.08;
      }

      // Posiziona cards in cerchio — FACCIA VERSO ESTERNO (camera)
      const meshes = meshesRef.current;
      const count = Math.max(meshes.length, 1);
      const angleStep = (2 * Math.PI) / count;

      meshes.forEach((mesh, i) => {
        const angle = (i * angleStep) + currentAngleRef.current;
        const x = Math.sin(angle) * RADIUS;
        const z = Math.cos(angle) * RADIUS;
        mesh.position.set(x, CARD_Y, z);

        // Ruota la card per guardare VERSO FUORI (lontano dal centro)
        // Il punto "outward" è il doppio della posizione rispetto al centro
        mesh.lookAt(x * 2, CARD_Y, z * 2);

        // Opacità basata su distanza dalla posizione frontale (z positivo = vicino alla camera)
        const normalizedZ = (z + RADIUS) / (2 * RADIUS); // 0 = dietro, 1 = davanti
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(0.15, 1.0, normalizedZ);
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Aggiorna cards quando cambiano i messaggi
  useEffect(() => {
    if (!isReady || !sceneRef.current) return;
    const scene = sceneRef.current;

    // Rimuovi vecchie mesh
    meshesRef.current.forEach(m => {
      scene.remove(m);
      (m.material as THREE.MeshBasicMaterial).map?.dispose();
      m.geometry.dispose();
    });
    meshesRef.current = [];

    const agentMessages = messages.filter(m => m.senderType === 'assistant' || m.senderType === 'human');
    const visibleMessages = agentMessages.slice(-MAX_CARDS);
    const dpr = Math.min(window.devicePixelRatio, 2);

    visibleMessages.forEach(msg => {
      const texture = createCardTexture(msg, dpr);
      const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.FrontSide, // Solo lato frontale — no testo specchiato
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });
  }, [messages, isReady]);

  // Angolo target = porta card[currentIndex] in posizione frontale
  useEffect(() => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;
    const angleStep = (2 * Math.PI) / meshes.length;
    // Angolo 0 = card davanti alla camera (z = RADIUS)
    targetAngleRef.current = -currentIndex * angleStep;
  }, [currentIndex]);

  // Navigazione
  const goNext = useCallback(() => {
    const agentMessages = messages.filter(m => m.senderType === 'assistant' || m.senderType === 'human');
    const max = Math.min(agentMessages.length, MAX_CARDS) - 1;
    onIndexChange(Math.min(currentIndex + 1, max));
  }, [currentIndex, messages, onIndexChange]);

  const goPrev = useCallback(() => {
    onIndexChange(Math.max(currentIndex - 1, 0));
  }, [currentIndex, onIndexChange]);

  // Wheel + touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartX = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) goNext();
      else goPrev();
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goPrev();
        else goNext();
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart);
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [goNext, goPrev]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const zone = x / rect.width;
    if (zone < 0.3) goPrev();
    else if (zone > 0.7) goNext();
  }, [goNext, goPrev]);

  return (
    <div className="carousel-3d-wrapper">
      <div
        ref={containerRef}
        className="carousel-3d-canvas"
        onClick={handleClick}
      />
      <div className="carousel-3d-nav">
        <button onClick={goPrev} className="carousel-nav-btn" title="Precedente">◀</button>
        <span className="carousel-nav-info">
          {currentIndex + 1} / {Math.min(messages.filter(m => m.senderType === 'assistant' || m.senderType === 'human').length, MAX_CARDS)}
        </span>
        <button onClick={goNext} className="carousel-nav-btn" title="Successivo">▶</button>
      </div>
    </div>
  );
}

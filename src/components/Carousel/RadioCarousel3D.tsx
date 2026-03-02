import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import type { Message } from '../../types/conversation';
import { AGENTS } from '../../lib/agents';

// --- Costanti ---
const MAX_CARDS = 8;
const RADIUS = 7.8;
const CARD_Y = 0.82;
const CARD_WIDTH = 4.5;
const CARD_HEIGHT = 6.2;
const FOV_DESKTOP = 67;
const FOV_MOBILE = 62;
const CAMERA_POS = new THREE.Vector3(0, 0.3, 13.5);

// Colori agente → gradiente
const AGENT_COLORS: Record<string, { top: string; bottom: string; badge: string }> = {
  albert: { top: 'rgba(34,197,94,0.25)', bottom: 'rgba(22,163,74,0.05)', badge: '#22c55e' },
  archimede: { top: 'rgba(168,85,247,0.25)', bottom: 'rgba(147,51,234,0.05)', badge: '#a855f7' },
  pitagora: { top: 'rgba(6,182,212,0.25)', bottom: 'rgba(8,145,178,0.05)', badge: '#06b6d4' },
  newton: { top: 'rgba(245,158,11,0.25)', bottom: 'rgba(217,119,6,0.05)', badge: '#f59e0b' },
  human: { top: 'rgba(59,130,246,0.25)', bottom: 'rgba(37,99,235,0.05)', badge: '#3b82f6' },
  system: { top: 'rgba(100,100,100,0.25)', bottom: 'rgba(60,60,60,0.05)', badge: '#666' },
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

  // Background gradiente
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, colors.top);
  grad.addColorStop(1, colors.bottom);
  ctx.fillStyle = 'rgba(15,15,20,0.92)';
  ctx.roundRect(0, 0, w, h, 24);
  ctx.fill();
  ctx.fillStyle = grad;
  ctx.roundRect(0, 0, w, h, 24);
  ctx.fill();

  // Bordo superiore colorato
  ctx.fillStyle = colors.badge;
  ctx.roundRect(0, 0, w, 6, [24, 24, 0, 0]);
  ctx.fill();

  // Badge agente
  ctx.fillStyle = colors.badge;
  ctx.roundRect(30, 30, 180, 40, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const agent = AGENTS.find(a => a.name === msg.senderName);
  ctx.fillText(agent?.provider?.toUpperCase() || msg.senderType.toUpperCase(), 120, 57);

  // Nome agente
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(msg.senderName, 30, 120);

  // Testo messaggio (word wrap)
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '22px system-ui, sans-serif';
  const maxWidth = w - 60;
  const lineHeight = 30;
  let y = 170;
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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);
    camera.position.copy(CAMERA_POS);
    camera.lookAt(0, CARD_Y, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luce ambientale
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Punto luce dall'alto
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 50);
    pointLight.position.set(0, 10, 10);
    scene.add(pointLight);

    setIsReady(true);

    // Resize handler
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

      // Smooth rotation verso target
      const diff = targetAngleRef.current - currentAngleRef.current;
      if (Math.abs(diff) > 0.001) {
        currentAngleRef.current += diff * 0.08;
      }

      // Posiziona cards
      const meshes = meshesRef.current;
      const angleStep = (2 * Math.PI) / Math.max(meshes.length, 1);
      meshes.forEach((mesh, i) => {
        const angle = -(i * angleStep) + Math.PI + currentAngleRef.current;
        mesh.position.x = Math.cos(angle) * RADIUS;
        mesh.position.z = Math.sin(angle) * RADIUS;
        mesh.position.y = CARD_Y;
        mesh.lookAt(0, CARD_Y, 0);

        // Opacità: card frontale più luminosa
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const distFromFront = Math.abs(Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI)));
        mat.opacity = THREE.MathUtils.lerp(0.4, 1.0, 1 - distFromFront / Math.PI);
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

    // Filtra messaggi agente (no system)
    const agentMessages = messages.filter(m => m.senderType === 'assistant' || m.senderType === 'human');
    const visibleMessages = agentMessages.slice(-MAX_CARDS);
    const dpr = Math.min(window.devicePixelRatio, 2);

    visibleMessages.forEach(msg => {
      const texture = createCardTexture(msg, dpr);
      const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });
  }, [messages, isReady]);

  // Aggiorna angolo target quando cambia currentIndex
  useEffect(() => {
    const meshes = meshesRef.current;
    if (meshes.length === 0) return;
    const angleStep = (2 * Math.PI) / meshes.length;
    targetAngleRef.current = currentIndex * angleStep;
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

  // Click zones per navigazione
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const zone = x / rect.width;
    if (zone < 0.25) goPrev();
    else if (zone > 0.75) goNext();
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

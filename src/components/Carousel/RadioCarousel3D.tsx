import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Message } from '../../types/conversation';
import { AGENTS } from '../../lib/agents';

// --- Costanti originali v7.x ---
const MAX_SLOTS = 8;
const RADIUS = 7.8;
const MESH_Y = 0.82;
const CARD_WIDTH_BASE = 4.83;
const CARD_HEIGHT_BASE = 7.04;

// Colori agente (stile v7.x)
const GRADIENT_CONFIG: Record<string, {
  from: string; to: string; border: string; title: string; badge: string;
}> = {
  albert: {
    from: 'rgba(34, 197, 94, 0.1)', to: 'rgba(22, 163, 74, 0.05)',
    border: 'rgba(34, 197, 94, 0.2)', title: '#166534', badge: '#16a34a'
  },
  archimede: {
    from: 'rgba(168, 85, 247, 0.1)', to: 'rgba(147, 51, 234, 0.05)',
    border: 'rgba(168, 85, 247, 0.2)', title: '#6b21a8', badge: '#9333ea'
  },
  pitagora: {
    from: 'rgba(6, 182, 212, 0.1)', to: 'rgba(8, 145, 178, 0.05)',
    border: 'rgba(6, 182, 212, 0.2)', title: '#155e75', badge: '#0891b2'
  },
  newton: {
    from: 'rgba(245, 158, 11, 0.1)', to: 'rgba(217, 119, 6, 0.05)',
    border: 'rgba(245, 158, 11, 0.2)', title: '#92400e', badge: '#d97706'
  },
  human: {
    from: 'rgba(59, 130, 246, 0.1)', to: 'rgba(37, 99, 235, 0.05)',
    border: 'rgba(59, 130, 246, 0.2)', title: '#1e40af', badge: '#2563eb'
  },
  system: {
    from: 'rgba(100, 100, 100, 0.1)', to: 'rgba(60, 60, 60, 0.05)',
    border: 'rgba(100, 100, 100, 0.2)', title: '#444', badge: '#666'
  },
};

function getColors(msg: Message) {
  const agent = AGENTS.find(a => a.name.toLowerCase() === msg.senderName.toLowerCase());
  if (agent) return GRADIENT_CONFIG[agent.id] || GRADIENT_CONFIG.system;
  if (msg.senderName === 'Tu') return GRADIENT_CONFIG.human;
  return GRADIENT_CONFIG.system;
}

// --- Texture HD via Canvas (design originale v7.x) ---
function createTextTexture(msg: Message, renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const DPR = window.devicePixelRatio || 2;
  const W = 800;
  const H = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);

  const colors = getColors(msg);

  // Background gradiente diagonale (stile v7.x)
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, colors.from);
  gradient.addColorStop(1, colors.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Bordo colorato
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

  // Specchia orizzontalmente (effetto v7.x)
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-W, 0);

  // Badge tipo agente
  const agent = AGENTS.find(a => a.name === msg.senderName);
  const badgeText = (agent?.provider || msg.senderType).toUpperCase();
  const badgePadding = 12;
  const badgeHeight = 32;
  ctx.font = 'bold 18px sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + badgePadding * 2;

  ctx.fillStyle = colors.badge;
  ctx.fillRect(20, 20, badgeWidth, badgeHeight);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, 20 + badgeWidth / 2, 20 + badgeHeight / 2 + 6);

  // Emoji + Nome sender
  ctx.fillStyle = colors.title;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  const emoji = agent?.emoji || '💬';
  ctx.fillText(`${emoji} ${msg.senderName}`, W / 2, 85);

  // Corpo messaggio
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'left';
  const lineHeight = 32;
  const maxWidth = W - 80;
  const words = msg.content.split(' ');
  let x = 40;
  let y = 140;
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
      if (y > H - 80) {
        ctx.fillText(line + '...', x, y);
        line = '';
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, y);

  // Footer: timestamp
  if (msg.createdAt) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'right';
    const time = new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(time, W - 30, H - 30);
  }

  // Token info
  if (msg.tokensIn || msg.tokensOut) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${msg.tokensIn || 0}→${msg.tokensOut || 0} tok`, 30, H - 30);
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  if (renderer) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  } else {
    texture.anisotropy = 4;
  }
  return texture;
}

// --- Props ---
interface RadioCarousel3DProps {
  messages: Message[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  zoom?: number;
  verticalOffset?: number;
}

export function RadioCarousel3D({ messages, currentIndex, onIndexChange, zoom = 1.0, verticalOffset = 0 }: RadioCarousel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const renderedIdsRef = useRef<Set<string>>(new Set());
  const hasInitRef = useRef(false);
  const animFrameRef = useRef(0);
  const isFirstRotationRef = useRef(true);
  const [isReady, setIsReady] = useState(false);

  // Inizializza Three.js (setup identico a v7.x)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const fov = isMobile ? 62 : 67;
    const { width, height } = container.getBoundingClientRect();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.set(0, 0.3, 13.5); // Posizione camera originale v7.x
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting originale v7.x
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    setIsReady(true);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
    };
    window.addEventListener('resize', onResize);

    // ResizeObserver per sidebar toggle
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Inizializza 8 slot invisibili (geometria fissa come v7.x)
  useEffect(() => {
    if (!isReady || !groupRef.current || hasInitRef.current) return;

    const group = groupRef.current;
    const angleStep = (Math.PI * 2) / MAX_SLOTS;
    const scaleFactor = Math.min(window.innerWidth / 1200, 2.0);

    for (let i = 0; i < MAX_SLOTS; i++) {
      const geometry = new THREE.PlaneGeometry(
        CARD_WIDTH_BASE * scaleFactor,
        CARD_HEIGHT_BASE * scaleFactor
      );
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0, // Invisibile inizialmente
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Posizionamento antiorario (identico v7.x)
      const angle = -(i * angleStep) + Math.PI;
      mesh.position.set(
        Math.cos(angle) * RADIUS,
        MESH_Y,
        Math.sin(angle) * RADIUS
      );
      mesh.lookAt(new THREE.Vector3(0, 0, 0));

      group.add(mesh);
      meshesRef.current.push(mesh);
    }

    hasInitRef.current = true;
    renderedIdsRef.current.clear();
  }, [isReady]);

  // Zoom FOV (v7.x style - ultra-light, no geometry recalc)
  useEffect(() => {
    if (!cameraRef.current) return;
    const baseFOV = 50;
    const newFOV = baseFOV / (zoom || 1.0);
    cameraRef.current.fov = newFOV;
    cameraRef.current.updateProjectionMatrix();
  }, [zoom]);

  // Vertical camera offset (v7.x style - GSAP animated)
  useEffect(() => {
    if (!cameraRef.current) return;
    const cameraYOffset = -(verticalOffset || 0) * 0.01;
    const baseY = 0.3;
    const newY = baseY + cameraYOffset;
    gsap.to(cameraRef.current.position, {
      y: newY,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, [verticalOffset]);

  // Popola slot con messaggi
  useEffect(() => {
    if (!isReady || !groupRef.current || meshesRef.current.length === 0) return;

    const allMessages = messages.filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError);
    const visibleMessages = allMessages.slice(-MAX_SLOTS);

    visibleMessages.forEach((msg, i) => {
      const msgKey = `${msg.id || ''}_${msg.content.slice(0, 20)}`;
      if (renderedIdsRef.current.has(msgKey)) return;
      if (i >= meshesRef.current.length) return;

      const mesh = meshesRef.current[i];
      const material = mesh.material as THREE.MeshBasicMaterial;

      // Rilascia vecchia texture
      if (material.map) material.map.dispose();

      const newTexture = createTextTexture(msg, rendererRef.current || undefined);
      material.map = newTexture;
      material.opacity = 1;
      material.needsUpdate = true;

      renderedIdsRef.current.add(msgKey);
    });

    // Nascondi slot inutilizzati
    for (let i = visibleMessages.length; i < meshesRef.current.length; i++) {
      const mat = meshesRef.current[i].material as THREE.MeshBasicMaterial;
      if (mat.opacity > 0 && !mat.map) {
        mat.opacity = 0;
      }
    }
  }, [messages, isReady]);

  // Rotazione GSAP al messaggio attivo (identica a v7.x)
  // Primo posizionamento: istantaneo. Successivi: animati.
  useEffect(() => {
    if (!groupRef.current) return;

    const allMessages = messages.filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError);
    const visibleCount = Math.min(allMessages.length, MAX_SLOTS);
    if (visibleCount === 0) return;

    const targetAngle = -(currentIndex / MAX_SLOTS) * Math.PI * 2 + Math.PI / 2;

    if (isFirstRotationRef.current) {
      // Prima rotazione: posiziona istantaneamente (no animation)
      groupRef.current.rotation.y = targetAngle;
      isFirstRotationRef.current = false;
    } else {
      gsap.to(groupRef.current.rotation, {
        y: targetAngle,
        duration: 1.2,
        ease: 'power2.inOut'
      });
    }
  }, [currentIndex, messages]);

  // Navigazione
  const goNext = useCallback(() => {
    const all = messages.filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError);
    const max = Math.min(all.length, MAX_SLOTS) - 1;
    onIndexChange(Math.min(currentIndex + 1, max));
  }, [currentIndex, messages, onIndexChange]);

  const goPrev = useCallback(() => {
    onIndexChange(Math.max(currentIndex - 1, 0));
  }, [currentIndex, onIndexChange]);

  // Wheel + touch navigation
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

  // Click navigation (left/right zones)
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const zone = x / rect.width;
    if (zone < 0.25) goPrev();
    else if (zone > 0.75) goNext();
  }, [goNext, goPrev]);

  const visibleCount = Math.min(
    messages.filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError).length,
    MAX_SLOTS
  );

  return (
    <div className="carousel-3d-wrapper">
      {/* Avatar Navigation Column (desktop only, stile v7.x) */}
      {visibleCount > 1 && (
        <div className="carousel-avatars">
          {messages
            .filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError)
            .slice(-MAX_SLOTS)
            .map((msg, i) => {
              const agent = AGENTS.find(a => a.name === msg.senderName);
              const isActive = i === currentIndex;
              const avatarSrc = agent
                ? `/assets/${agent.id}-${isActive ? 'talk' : 'static'}.${isActive ? 'gif' : 'png'}`
                : undefined;

              return (
                <button
                  key={msg.id || i}
                  onClick={() => onIndexChange(i)}
                  className={`carousel-avatar-btn ${isActive ? 'active' : ''}`}
                  title={msg.senderName}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={msg.senderName}
                      className={`carousel-avatar-img ${!isActive ? 'inactive' : ''}`}
                    />
                  ) : (
                    <span className="carousel-avatar-emoji">
                      {agent?.emoji || (msg.senderName === 'Tu' ? '👤' : '💬')}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {/* Canvas 3D */}
      <div
        ref={containerRef}
        className="carousel-3d-canvas"
        onClick={handleClick}
      />

      {/* Navigation bar */}
      <div className="carousel-3d-nav">
        <button onClick={goPrev} className="carousel-nav-btn" title="Precedente">◀</button>
        <span className="carousel-nav-info">
          {currentIndex + 1} / {visibleCount}
        </span>
        <button onClick={goNext} className="carousel-nav-btn" title="Successivo">▶</button>
      </div>
    </div>
  );
}

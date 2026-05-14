/**
 * RadioChat v8 — MenuCarousel3D
 * Carousel 3D per la pagina menu: ogni card è una sezione dell'app.
 * Basato su RadioCarousel3D ma con rendering dedicato per menu items.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { MenuItem } from '../../types/menu';

// --- Costanti geometria (stesse di RadioCarousel3D v7.x) ---
const RADIUS = 7.8;
const MESH_Y = 0.82;
const CARD_WIDTH_BASE = 4.83;
const CARD_HEIGHT_BASE = 7.04;

// --- Texture HD via Canvas — solo icona + titolo flottanti (nessun sfondo card) ---
function createMenuCardTexture(item: MenuItem, renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const DPR = window.devicePixelRatio || 2;
  const W = 800;
  const H = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);

  // Canvas completamente trasparente — nessun background, nessun bordo

  // Glow morbido dietro l'emoji (effetto "galleggiante")
  const glowGrad = ctx.createRadialGradient(W / 2, 380, 0, W / 2, 380, 300);
  glowGrad.addColorStop(0, item.gradient.border.replace('0.4', '0.18'));
  glowGrad.addColorStop(0.5, item.gradient.border.replace('0.4', '0.06'));
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 50, W, 700);

  // Emoji grande — centrata, flottante
  ctx.font = '240px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon, W / 2, 380);

  // Titolo — bold, colore accent, sotto l'emoji
  ctx.fillStyle = item.accentColor;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(item.title, W / 2, 560);

  // Descrizione breve — colore bianco attenuato
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'center';
  const maxWidth = W - 100;
  const words = item.description.split(' ');
  let line = '';
  let y = 660;
  const lineHeight = 42;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), W / 2, y);
      line = words[i] + ' ';
      y += lineHeight;
      if (y > H - 100) break;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), W / 2, y);

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
interface MenuCarousel3DProps {
  items: MenuItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSelect: (itemId: string) => void;
}

export function MenuCarousel3D({ items, currentIndex, onIndexChange, onSelect }: MenuCarousel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const hasInitRef = useRef(false);
  const texturesBuiltRef = useRef(false);
  const animFrameRef = useRef(0);
  const isFirstRotationRef = useRef(true);
  const [isReady, setIsReady] = useState(false);

  const MAX_SLOTS = items.length;

  // Inizializza Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const fov = isMobile ? 62 : 67;
    const { width, height } = container.getBoundingClientRect();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.set(0, 0.3, 13.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    queueMicrotask(() => setIsReady(true));

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

  // Inizializza slot geometria
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
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Posiziona card in cerchio — card 0 all'angolo PI/2 (asse +Z, davanti alla camera)
      const angle = -(i * angleStep) + Math.PI / 2;
      mesh.position.set(
        Math.cos(angle) * RADIUS,
        MESH_Y,
        Math.sin(angle) * RADIUS
      );
      // lookAt(centro) → faccia frontale verso il centro.
      // Poi ruota 180° su Y → faccia frontale verso l'ESTERNO (verso la camera)
      mesh.lookAt(new THREE.Vector3(0, MESH_Y, 0));
      mesh.rotateY(Math.PI);

      group.add(mesh);
      meshesRef.current.push(mesh);
    }

    hasInitRef.current = true;
  }, [isReady, MAX_SLOTS]);

  // Popola card con texture menu
  useEffect(() => {
    if (!isReady || meshesRef.current.length === 0 || texturesBuiltRef.current) return;

    items.forEach((item, i) => {
      if (i >= meshesRef.current.length) return;
      const mesh = meshesRef.current[i];
      const material = mesh.material as THREE.MeshBasicMaterial;

      if (material.map) material.map.dispose();

      const newTexture = createMenuCardTexture(item, rendererRef.current || undefined);
      material.map = newTexture;
      material.needsUpdate = true;
    });

    // Applica opacità + scala progressiva subito dopo il caricamento texture
    // (l'useEffect di opacità non ri-scatta perché currentIndex non è cambiato)
    meshesRef.current.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const dist = Math.min(
        Math.abs(i - currentIndex),
        MAX_SLOTS - Math.abs(i - currentIndex)
      );
      let targetOpacity: number;
      let targetScale: number;
      if (dist === 0)      { targetOpacity = 1.0;  targetScale = 1.0;  }
      else if (dist === 1) { targetOpacity = 0.55; targetScale = 0.85; }
      else if (dist === 2) { targetOpacity = 0.2;  targetScale = 0.7;  }
      else                 { targetOpacity = 0.05; targetScale = 0.6;  }

      mat.opacity = targetOpacity;
      mat.needsUpdate = true;
      mesh.scale.set(targetScale, targetScale, 1);
    });

    // Imposta rotazione iniziale del gruppo QUI (dove tutto è pronto).
    // L'useEffect di rotazione al mount esce early (gruppo/mesh non pronti),
    // quindi isFirstRotationRef resta true e il primo click "snappa" invece di animare.
    if (groupRef.current && isFirstRotationRef.current) {
      const targetAngle = -(currentIndex / MAX_SLOTS) * Math.PI * 2;
      groupRef.current.rotation.y = targetAngle;
      isFirstRotationRef.current = false;
    }

    texturesBuiltRef.current = true;
  }, [items, isReady]);

  // Rotazione GSAP + opacità progressiva
  useEffect(() => {
    if (!groupRef.current || meshesRef.current.length === 0) return;

    // Card 0 è già a +Z (frontale), quindi per index 0 non serve rotazione.
    // Per index N, ruota di N slot in senso orario.
    const targetAngle = -(currentIndex / MAX_SLOTS) * Math.PI * 2;

    if (isFirstRotationRef.current) {
      groupRef.current.rotation.y = targetAngle;
      isFirstRotationRef.current = false;
    } else {
      gsap.to(groupRef.current.rotation, {
        y: targetAngle,
        duration: 1.2,
        ease: 'power2.inOut'
      });
    }

    // Opacità + scala progressiva — sincronizzate con la rotazione
    meshesRef.current.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (!mat.map) return;

      const dist = Math.min(
        Math.abs(i - currentIndex),
        MAX_SLOTS - Math.abs(i - currentIndex)
      );

      let targetOpacity: number;
      let targetScale: number;
      if (dist === 0)      { targetOpacity = 1.0;  targetScale = 1.0;  }
      else if (dist === 1) { targetOpacity = 0.55; targetScale = 0.85; }
      else if (dist === 2) { targetOpacity = 0.2;  targetScale = 0.7;  }
      else                 { targetOpacity = 0.05; targetScale = 0.6;  }

      // Durata e easing sincronizzati con la rotazione del gruppo (1.2s power2.inOut)
      gsap.to(mat, {
        opacity: targetOpacity,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: () => { mat.needsUpdate = true; },
      });
      gsap.to(mesh.scale, {
        x: targetScale,
        y: targetScale,
        duration: 1.2,
        ease: 'power2.inOut',
      });
    });
  }, [currentIndex, MAX_SLOTS]);

  // Navigation helpers
  const goNext = useCallback(() => {
    onIndexChange(Math.min(currentIndex + 1, MAX_SLOTS - 1));
  }, [currentIndex, MAX_SLOTS, onIndexChange]);

  const goPrev = useCallback(() => {
    onIndexChange(Math.max(currentIndex - 1, 0));
  }, [currentIndex, onIndexChange]);

  // Wheel + touch navigation — SOLO orizzontale, verticale BLOCCATO
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let lastWheelTime = 0;
    const WHEEL_DEBOUNCE = 300;

    const onWheel = (e: WheelEvent) => {
      // Blocca SEMPRE scroll verticale (2 dita su/giù) nel carousel
      e.preventDefault();

      // Reagisci SOLO a scroll orizzontale (deltaX)
      if (Math.abs(e.deltaX) < 5) return; // ignora deltaY completamente
      const now = Date.now();
      if (now - lastWheelTime < WHEEL_DEBOUNCE) return;
      lastWheelTime = now;

      if (e.deltaX > 0) goNext();
      else goPrev();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Blocca scroll verticale dentro il carousel
      const diffY = Math.abs(e.touches[0].clientY - touchStartY);
      const diffX = Math.abs(e.touches[0].clientX - touchStartX);
      if (diffX > diffY && diffX > 10) {
        // Swipe orizzontale: blocca default scroll
        e.preventDefault();
        isSwiping = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      const SWIPE_THRESHOLD = 40;

      // SOLO swipe orizzontale — ignora verticale completamente
      if (absDiffX > SWIPE_THRESHOLD && absDiffX > absDiffY * 1.5) {
        if (diffX > 0) goPrev();
        else goNext();
      } else if (absDiffX < 10 && absDiffY < 10 && !isSwiping) {
        // Tap (no swipe) — entra nella sezione attiva
        onSelect(items[currentIndex].id);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [goNext, goPrev, onSelect, items, currentIndex]);

  // Click: center zone = select, left/right zones = navigate
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const zone = x / rect.width;
    if (zone < 0.25) goPrev();
    else if (zone > 0.75) goNext();
    else onSelect(items[currentIndex].id); // Centro = entra
  }, [goNext, goPrev, onSelect, items, currentIndex]);

  return (
    <div className="menu-carousel-wrapper">
      {/* Canvas 3D */}
      <div
        ref={containerRef}
        className="menu-carousel-canvas"
        onClick={handleClick}
      />

      {/* Dot indicator */}
      <div className="menu-dot-indicator">
        <button onClick={goPrev} className="menu-nav-btn" title="Precedente">◀</button>
        <div className="menu-dots">
          {items.map((item, i) => (
            <button
              key={item.id}
              className={`menu-dot ${i === currentIndex ? 'active' : ''}`}
              onClick={() => onIndexChange(i)}
              style={{ backgroundColor: i === currentIndex ? item.accentColor : undefined }}
              title={item.title}
            />
          ))}
        </div>
        <button onClick={goNext} className="menu-nav-btn" title="Successivo">▶</button>
      </div>
    </div>
  );
}

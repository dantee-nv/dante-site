import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import usePageTitle from "../hooks/usePageTitle";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

function AccordionItem({ id, title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion-item" id={id}>
      <button
        className="accordion-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        type="button"
      >
        <span className="accordion-title">{title}</span>
        <motion.span
          className="accordion-icon"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden="true"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="accordion-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="accordion-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompanyHeader({ company, companyUrl, role, meta }) {
  return (
    <div className="company-header">
      <div className="company-line">
        <div className="company-left">
          <span className="company-link-group">
            <a
              className="company-name"
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {company}
            </a>

            <a
              className="company-link-icon"
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${company}`}
              title={`Open ${company}`}
            >
              ↗
            </a>
          </span>

          <span className="company-sep">•</span>

          <span className="company-role">{role}</span>
        </div>
      </div>

      {meta ? <div className="company-meta">{meta}</div> : null}
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// stable crack paths, generated once per child block
function buildCrackPattern(label, count = 3) {
  const seed = hashString(label || "block");
  const rand = mulberry32(seed);
  const paths = [];

  for (let i = 0; i < count; i++) {
    const pts = [];

    const side = rand();
    let sx;
    let sy;

    if (side < 0.25) {
      sx = rand();
      sy = 0;
    } else if (side < 0.5) {
      sx = 1;
      sy = rand();
    } else if (side < 0.75) {
      sx = rand();
      sy = 1;
    } else {
      sx = 0;
      sy = rand();
    }

    const ex = 0.15 + rand() * 0.7;
    const ey = 0.15 + rand() * 0.7;

    const segments = 7 + Math.floor(rand() * 4);
    pts.push([sx, sy]);

    for (let s = 1; s < segments; s++) {
      const tt = s / segments;
      const px = sx + (ex - sx) * tt;
      const py = sy + (ey - sy) * tt;

      const j = 0.10;
      const jx = (rand() - 0.5) * j;
      const jy = (rand() - 0.5) * j;

      pts.push([
        Math.max(0, Math.min(1, px + jx)),
        Math.max(0, Math.min(1, py + jy)),
      ]);
    }

    pts.push([ex, ey]);
    paths.push(pts);
  }

  return paths;
}

function drawCracksStable(ctx, block, damage) {
  if (!block.crackPaths || damage <= 0) return;

  const inset = 6;
  const x0 = block.x + inset;
  const y0 = block.y + inset;
  const w = block.w - inset * 2;
  const h = block.h - inset * 2;

  const total = block.crackPaths.length;
  const scaled = Math.max(0, Math.min(total, damage * total));
  const revealCount = Math.max(0, Math.ceil(scaled));
  const partial = scaled - Math.floor(scaled);

  ctx.save();
  ctx.lineWidth = 1.6;

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.globalAlpha = 0.18 + 0.34 * damage;

  for (let i = 0; i < revealCount; i++) {
    const pts = block.crackPaths[i];

    const maxIdx =
      i === revealCount - 1
        ? Math.max(1, Math.floor((pts.length - 1) * Math.max(0.2, partial)))
        : pts.length - 1;

    ctx.beginPath();
    ctx.moveTo(x0 + pts[0][0] * w, y0 + pts[0][1] * h);

    for (let p = 1; p <= maxIdx; p++) {
      ctx.lineTo(x0 + pts[p][0] * w, y0 + pts[p][1] * h);
    }
    ctx.stroke();
  }

  ctx.globalAlpha *= 0.65;
  ctx.strokeStyle = "rgba(0,0,0,0.60)";
  ctx.translate(0.9, 0.9);

  for (let i = 0; i < revealCount; i++) {
    const pts = block.crackPaths[i];

    const maxIdx =
      i === revealCount - 1
        ? Math.max(1, Math.floor((pts.length - 1) * Math.max(0.2, partial)))
        : pts.length - 1;

    ctx.beginPath();
    ctx.moveTo(x0 + pts[0][0] * w, y0 + pts[0][1] * h);

    for (let p = 1; p <= maxIdx; p++) {
      ctx.lineTo(x0 + pts[p][0] * w, y0 + pts[p][1] * h);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function clampSingleLine(ctx, text, maxW) {
  let t = String(text);
  if (ctx.measureText(t).width <= maxW) return t;
  while (t.length > 0 && ctx.measureText(`${t}…`).width > maxW) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

export default function Resume() {
  usePageTitle("Resume");

  const [skillsArcadeOpen, setSkillsArcadeOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [levelTitle, setLevelTitle] = useState("AI and Data Systems");

  const skillsData = useMemo(() => {
    return [
      {
        title: "AI and Data Systems",
        items: [
          "LLM-enabled analytics and workflow integration",
          "Machine learning and predictive modeling",
          "Data pipelines automation and model evaluation",
        ],
      },
      {
        title: "Software Engineering",
        items: [
          "Python-based analytical and visualization tooling",
          "Algorithm development and verification",
          "User-facing tools for engineering and clinical workflows",
        ],
      },
      {
        title: "Physical Systems",
        items: [
          "3D modeling and rapid prototyping for test systems",
          "CAD-based fixture and experimental setup design",
          "Sensor-integrated prototyping for system-level evaluation",
        ],
      },
      {
        title: "Regulated MedTech & Verification",
        items: [
          "Design Verification (DV) strategy and execution",
          "Medical device standards and test traceability (ISO 5840)",
          "Experimental design and statistical rigor",
        ],
      },
    ];
  }, []);

  const arenaWrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  const keysRef = useRef({ left: false, right: false, fire: false });

  const shipRef = useRef({
    x: 0,
    y: 0,
    w: 44,
    h: 18,
    speed: 420,
  });

  const bulletsRef = useRef([]);
  const fireCooldownRef = useRef(0);

  const blocksRef = useRef([]);
  const scoreRef = useRef(0);

  // Phase machine
  const phaseRef = useRef("boss"); // boss | children | transition | complete
  const categoryIndexRef = useRef(0);
  const advanceAtRef = useRef(0);

  // Effects and camera shake
  const effectsRef = useRef([]);
  const shakeRef = useRef({ t: 0, mag: 0 });

  const spawnPop = (block, now) => {
    effectsRef.current.push({
      type: "pop",
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      t: now,
      dur: 180,
    });
  };

  const spawnBurst = (block, now) => {
    const seed = hashString(block.label || "block");
    const rand = mulberry32(seed ^ (now | 0));

    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;

    const parts = [];
    const count = block.isBoss ? 28 : 18;

    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const sp = (block.isBoss ? 240 : 175) * (0.55 + rand() * 0.9);
      parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: block.isBoss ? 3 + rand() * 3 : 2 + rand() * 2,
      });
    }

    effectsRef.current.push({
      type: "burst",
      t: now,
      dur: block.isBoss ? 520 : 380,
      parts,
    });
  };

  const kickShake = (mag, now) => {
    shakeRef.current.t = now;
    shakeRef.current.mag = Math.max(shakeRef.current.mag, mag);
  };

  const createBossBlocks = (cw, categoryIndex) => {
    const marginX = 22;
    const top = 26;

    const w = Math.max(260, cw - marginX * 2);
    const h = 74;

    const x = (cw - w) / 2;
    const y = top;

    const maxHp = 20;

    const title = skillsData[categoryIndex]?.title || "Skills";

    return [
      {
        x,
        y,
        w,
        h,
        label: title,
        hp: maxHp,
        maxHp,
        isBoss: true,
        hitAt: 0,
      },
    ];
  };

  const createChildBlocksForCategory = (cw, ch, categoryIndex, ctx) => {
    const group = skillsData[categoryIndex];
    if (!group) return [];

    const items = group.items || [];
    const n = items.length;
    if (n === 0) return [];

    const paddingX = 22;
    const top = 26;

    const gapX = 12;
    const usableW = cw - paddingX * 2;

    const blockW = Math.max(110, (usableW - gapX * (n - 1)) / n);
    const rowW = blockW * n + gapX * (n - 1);
    const startX = (cw - rowW) / 2;

    const pad = 10;
    const lineH = 14;
    const textMaxW = blockW - pad * 2;

    if (ctx) {
      ctx.font =
        "600 12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    }

    const wrapLines = (text) => {
      if (!ctx) return [String(text)];

      const words = String(text).split(" ");
      const lines = [];
      let line = "";

      for (let i = 0; i < words.length; i++) {
        const next = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(next).width <= textMaxW) {
          line = next;
        } else {
          if (line) lines.push(line);
          line = words[i];
        }
      }
      if (line) lines.push(line);

      for (let i = 0; i < lines.length; i++) {
        while (
          ctx.measureText(lines[i]).width > textMaxW &&
          lines[i].length > 0
        ) {
          lines[i] = lines[i].slice(0, -1);
        }
      }

      return lines;
    };

    const blocks = [];
    let maxH = 34;

    for (let i = 0; i < n; i++) {
      const lines = wrapLines(items[i]);
      const h = pad + lines.length * lineH + pad;
      if (h > maxH) maxH = h;

      blocks.push({
        x: startX + i * (blockW + gapX),
        y: top,
        w: blockW,
        h,
        label: items[i],
        lines,
        hp: 10,
        maxHp: 10,
        isBoss: false,
        crackPaths: buildCrackPattern(items[i], 3),
        hitAt: 0,
      });
    }

    for (const b of blocks) b.h = maxH;

    const maxBottom = ch * 0.62;
    const bottom = top + maxH;
    if (bottom > maxBottom) {
      const shift = bottom - maxBottom;
      for (const b of blocks) b.y = Math.max(18, b.y - shift);
    }

    return blocks;
  };

  const startLevel = (idx, cw, ch) => {
    categoryIndexRef.current = idx;
    phaseRef.current = "boss";
    advanceAtRef.current = 0;

    bulletsRef.current = [];
    fireCooldownRef.current = 0;

    blocksRef.current = createBossBlocks(cw, idx);

    effectsRef.current = [];
    shakeRef.current = { t: 0, mag: 0 };

    setLevelTitle(skillsData[idx]?.title || "Skills");
  };

  const resetGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    shipRef.current.x = cw / 2;
    shipRef.current.y = ch - shipRef.current.h / 2 - 10;

    scoreRef.current = 0;
    setScore(0);

    startLevel(0, cw, ch);
  };

  const setControlState = (control, isPressed) => {
    keysRef.current[control] = isPressed;
  };

  const handlePress = (control, e) => {
    e.preventDefault();
    setControlState(control, true);
  };

  const handleRelease = (control, e) => {
    e.preventDefault();
    setControlState(control, false);
  };

  // Esc-to-close
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setSkillsArcadeOpen(false);
    }
    if (skillsArcadeOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [skillsArcadeOpen]);

  // Body scroll lock
  useEffect(() => {
    if (!skillsArcadeOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [skillsArcadeOpen]);

  // Keyboard controls (only when open)
  useEffect(() => {
    if (!skillsArcadeOpen) return;

    function down(e) {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keysRef.current.left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") keysRef.current.right = true;

      if (k === " " || k === "Spacebar") {
        keysRef.current.fire = true;
        e.preventDefault();
      }
    }

    function up(e) {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keysRef.current.left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") keysRef.current.right = false;

      if (k === " " || k === "Spacebar") {
        keysRef.current.fire = false;
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: false });

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keysRef.current.left = false;
      keysRef.current.right = false;
      keysRef.current.fire = false;
    };
  }, [skillsArcadeOpen]);

  // Size canvas to container and reset
  useEffect(() => {
    if (!skillsArcadeOpen) return;

    const wrap = arenaWrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const setSize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      canvas.style.width = `${Math.floor(rect.width)}px`;
      canvas.style.height = `${Math.floor(rect.height)}px`;
    };

    setSize();
    requestAnimationFrame(() => {
      setSize();
      resetGame();
    });

    const ro = new ResizeObserver(() => {
      setSize();
      resetGame();
    });
    ro.observe(wrap);

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsArcadeOpen]);

  useEffect(() => {
    if (!skillsArcadeOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();

    const hitBlock = (bullet, block) => {
      return (
        bullet.x >= block.x &&
        bullet.x <= block.x + block.w &&
        bullet.y >= block.y &&
        bullet.y <= block.y + block.h
      );
    };

    const draw = (t) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;

      const now = performance.now();

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      // screen shake
      const st = shakeRef.current.t;
      if (st) {
        const age = now - st;
        const dur = 140;
        if (age < dur) {
          const p = 1 - age / dur;
          const m = shakeRef.current.mag * p;
          const sx = (Math.random() - 0.5) * m;
          const sy = (Math.random() - 0.5) * m;
          ctx.translate(sx, sy);
        } else {
          shakeRef.current.t = 0;
          shakeRef.current.mag = 0;
        }
      }

      // auto advance between levels
      if (phaseRef.current === "transition" && advanceAtRef.current > 0) {
        if (now >= advanceAtRef.current) {
          const nextIdx = categoryIndexRef.current + 1;
          if (nextIdx < skillsData.length) {
            startLevel(nextIdx, cw, ch);
          } else {
            phaseRef.current = "complete";
            blocksRef.current = [];
            bulletsRef.current = [];
            fireCooldownRef.current = 0;
          }
        }
      }

      const ship = shipRef.current;
      const k = keysRef.current;

      if (phaseRef.current !== "complete") {
        if (k.left) ship.x -= ship.speed * dt;
        if (k.right) ship.x += ship.speed * dt;

        const minX = ship.w / 2 + 10;
        const maxX = cw - ship.w / 2 - 10;
        ship.x = Math.max(minX, Math.min(maxX, ship.x));

        // fire
        fireCooldownRef.current = Math.max(0, fireCooldownRef.current - dt);
        if (k.fire && fireCooldownRef.current === 0) {
          if (bulletsRef.current.length < 10) {
            bulletsRef.current.push({
              x: ship.x,
              y: ship.y - 14,
              vy: -720,
              r: 3,
            });
          }
          fireCooldownRef.current = 0.12;
        }
      }

      // bullets update
      const bullets = bulletsRef.current;
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].vy * dt;
        if (bullets[i].y < -40) bullets.splice(i, 1);
      }

      // collisions
      const blocks = blocksRef.current;
      let scoredThisFrame = 0;

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        let didHit = false;

        for (let wi = blocks.length - 1; wi >= 0; wi--) {
          const block = blocks[wi];
          if (!hitBlock(b, block)) continue;

          didHit = true;
          block.hp -= 1;
          block.hitAt = now;

          if (block.hp <= 0) {
            const dead = block;
            const wasBoss = !!dead.isBoss;

            // death effects
            effectsRef.current.push({
              type: "pop",
              x: dead.x,
              y: dead.y,
              w: dead.w,
              h: dead.h,
              t: now,
              dur: 180,
            });
            spawnBurst(dead, now);
            kickShake(wasBoss ? 10 : 5, now);

            blocks.splice(wi, 1);
            scoredThisFrame += wasBoss ? 150 : 25;

            if (wasBoss && phaseRef.current === "boss") {
              const idx = categoryIndexRef.current;
              blocksRef.current = createChildBlocksForCategory(cw, ch, idx, ctx);
              phaseRef.current = "children";
            }
          } else {
            scoredThisFrame += block.isBoss ? 10 : 5;
          }

          break;
        }

        if (didHit) bullets.splice(bi, 1);
      }

      if (scoredThisFrame > 0) {
        scoreRef.current += scoredThisFrame;
        setScore(scoreRef.current);
      }

      // draw blocks
      for (const block of blocksRef.current) {
        const radius = block.isBoss ? 16 : 14;

        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.strokeStyle = "rgba(255,255,255,0.24)";
        ctx.lineWidth = 1;

        roundRect(ctx, block.x, block.y, block.w, block.h, radius);
        ctx.fill();
        ctx.stroke();

        // hit flash
        const hitAge = block.hitAt ? now - block.hitAt : 9999;
        if (hitAge < 90) {
          const p = 1 - hitAge / 90;
          ctx.save();
          ctx.globalAlpha = 0.18 * p;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          roundRect(
            ctx,
            block.x + 2,
            block.y + 2,
            block.w - 4,
            block.h - 4,
            Math.max(0, radius - 2)
          );
          ctx.fill();
          ctx.restore();
        }

        const pad = 10;

        if (block.isBoss) {
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.font =
            "700 15px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";

          const titleMaxW = block.w - pad * 2;
          const title = clampSingleLine(ctx, block.label, titleMaxW);
          ctx.fillText(title, block.x + pad, block.y + 28);

          const barH = 8;
          const barX = block.x + pad;
          const barY = block.y + block.h - pad - barH;
          const barW = block.w - pad * 2;

          ctx.fillStyle = "rgba(255,255,255,0.10)";
          roundRect(ctx, barX, barY, barW, barH, 6);
          ctx.fill();

          const pct = Math.max(0, Math.min(1, block.hp / block.maxHp));
          ctx.fillStyle = "rgba(255,255,255,0.32)";
          roundRect(ctx, barX, barY, barW * pct, barH, 6);
          ctx.fill();

          ctx.fillStyle = "rgba(255,255,255,0.70)";
          ctx.font =
            "600 12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
          ctx.fillText(
            `HP ${block.hp}/${block.maxHp}`,
            block.x + pad,
            block.y + 48
          );
        } else {
          const damage = block.maxHp ? 1 - block.hp / block.maxHp : 0;
          drawCracksStable(ctx, block, damage);

          ctx.fillStyle = "rgba(255,255,255,0.90)";
          ctx.font =
            "600 12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";

          const lines =
            block.lines && block.lines.length ? block.lines : [block.label];
          const lineH = 14;
          const textH = lines.length * lineH;

          let ty = block.y + (block.h - textH) / 2 + lineH - 2;
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], block.x + pad, ty + i * lineH);
          }
        }
      }

      // effects update and draw
      const fx = effectsRef.current;
      for (let i = fx.length - 1; i >= 0; i--) {
        const e = fx[i];
        const age = now - e.t;
        const p = Math.max(0, Math.min(1, age / e.dur));

        if (p >= 1) {
          fx.splice(i, 1);
          continue;
        }

        if (e.type === "pop") {
          const scale = 1 + 0.10 * Math.sin(p * Math.PI);
          const alpha = (1 - p) * 0.40;

          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2;
          const w = e.w * scale;
          const h = e.h * scale;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = "rgba(255,255,255,0.90)";
          ctx.lineWidth = 2;

          roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 14);
          ctx.stroke();
          ctx.restore();
        }

        if (e.type === "burst") {
          ctx.save();
          ctx.globalAlpha = (1 - p) * 0.90;
          ctx.fillStyle = "rgba(255,255,255,0.85)";

          for (let k2 = 0; k2 < e.parts.length; k2++) {
            const part = e.parts[k2];
            const tt = age / 1000;
            const gy = 540;

            const px = part.x + part.vx * tt;
            const py = part.y + part.vy * tt + gy * tt * tt * 0.5;

            ctx.beginPath();
            ctx.arc(px, py, part.r * (1 - p * 0.25), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // draw ship and bullets even during transition
      if (phaseRef.current !== "complete") {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - ship.h);
        ctx.lineTo(ship.x - ship.w / 2, ship.y + ship.h / 2);
        ctx.lineTo(ship.x + ship.w / 2, ship.y + ship.h / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(ship.x - ship.w / 4, ship.y + ship.h / 2, ship.w / 2, 3);

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        for (let i = 0; i < bullets.length; i++) {
          ctx.beginPath();
          ctx.arc(bullets[i].x, bullets[i].y, bullets[i].r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Level completion detection
      if (blocksRef.current.length === 0 && phaseRef.current === "children") {
        phaseRef.current = "transition";
        advanceAtRef.current = now + 900;
      }

      // transition message
      if (phaseRef.current === "transition") {
        const nextIdx = categoryIndexRef.current + 1;
        const nextTitle =
          nextIdx < skillsData.length ? skillsData[nextIdx].title : "Complete";

        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font =
          "700 20px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
        const msg = nextIdx < skillsData.length ? "Skill cleared" : "All skills cleared";
        const tw = ctx.measureText(msg).width;
        ctx.fillText(msg, (cw - tw) / 2, ch * 0.52);

        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.font =
          "600 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
        const msg2 =
          nextIdx < skillsData.length ? `Next: ${nextTitle}` : "Hit Reset to replay";
        const tw2 = ctx.measureText(msg2).width;
        ctx.fillText(msg2, (cw - tw2) / 2, ch * 0.52 + 26);
      }

      // complete message
      if (phaseRef.current === "complete") {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font =
          "800 22px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
        const msg = "All skills cleared";
        const tw = ctx.measureText(msg).width;
        ctx.fillText(msg, (cw - tw) / 2, ch * 0.55);

        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.font =
          "600 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
        const msg2 = "Hit Reset to replay";
        const tw2 = ctx.measureText(msg2).width;
        ctx.fillText(msg2, (cw - tw2) / 2, ch * 0.55 + 26);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [skillsArcadeOpen, skillsData]);

  const arcadePortal = skillsArcadeOpen
    ? createPortal(
        <AnimatePresence>
          <motion.div
            className="arcade-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSkillsArcadeOpen(false)}
          >
            <motion.div
              className="arcade-modal"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Skills arcade"
            >
              <div className="arcade-header">
                <div className="arcade-title">Skills Challenge</div>
                <button
                  type="button"
                  className="arcade-close"
                  onClick={() => setSkillsArcadeOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="arcade-body">
                <div className="arcade-hud">
                  <div className="arcade-hint">
                    Skill: {levelTitle} • A/D or ←/→ move • Space shoot
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={resetGame}
                    style={{ color: "rgba(255,255,255,0.95)" }}
                  >
                    Reset
                  </button>
                </div>

                <div className="arcade-arena" ref={arenaWrapRef}>
                  <canvas ref={canvasRef} className="arcade-canvas" />
                </div>

                <div className="arcade-touch-controls">
                  <button
                    type="button"
                    className="arcade-touch-btn"
                    aria-label="Move left"
                    onPointerDown={(e) => handlePress("left", e)}
                    onPointerUp={(e) => handleRelease("left", e)}
                    onPointerCancel={(e) => handleRelease("left", e)}
                    onPointerLeave={(e) => handleRelease("left", e)}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    className="arcade-touch-btn fire"
                    aria-label="Fire"
                    onPointerDown={(e) => handlePress("fire", e)}
                    onPointerUp={(e) => handleRelease("fire", e)}
                    onPointerCancel={(e) => handleRelease("fire", e)}
                    onPointerLeave={(e) => handleRelease("fire", e)}
                  >
                    Fire
                  </button>
                  <button
                    type="button"
                    className="arcade-touch-btn"
                    aria-label="Move right"
                    onPointerDown={(e) => handlePress("right", e)}
                    onPointerUp={(e) => handleRelease("right", e)}
                    onPointerCancel={(e) => handleRelease("right", e)}
                    onPointerLeave={(e) => handleRelease("right", e)}
                  >
                    Right
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <motion.section
      className="page"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
      >
        Resume
      </motion.h2>

      <motion.h3
        className="resume-intro-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
      >
        Summary
      </motion.h3>

      <motion.p
        className="resume-intro"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        I am a biomedical engineer working at the intersection of data systems,
        medical device development and regulated engineering environments. My work
        focuses on building analytical and AI-enabled tools that accelerate verification,
        decision making and regulatory outcomes without sacrificing rigor.
      </motion.p>

      <motion.div
        className="accordion"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.6 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5 }}
        >
          <AccordionItem id="work-experience" title="Work Experience">
            <CompanyHeader
              company="Medtronic"
              companyUrl="https://www.medtronic.com/en-us/l/patients/treatments-therapies/transcatheter-aortic-valve-replacement.html"
              role="R&D Engineer – Testing and Data Analysis"
              meta="Orange County, CA • 2020–Present"
            />
            <ul>
              <li>
                Apply large language models (LLMs) within engineering analysis workflows to
                synthesize DV data, compare historical results and accelerate technical
                reporting under regulatory constraints
              </li>
              <li>
                Design and deploy Python-based data aggregation and automation pipelines to
                process large verification datasets, reducing manual processing and
                accelerating engineering analysis throughput
              </li>
              <li>
                Re-architected a one-year critical-path DV strategy by leveraging legacy data
                and risk-based test rationales, enabling FDA submission two months ahead of
                schedule
              </li>
              <li>
                Lead cross-site, cross-disciplinary engineering teams to plan and execute DV
                studies supporting global market expansion
              </li>
              <li>
                Design and fabricate rapid 3D-printed fixtures and test components in SolidWorks
                to replicate in-vivo boundary conditions, integrating explanted patient device data
                to improve hydrodynamic test realism
              </li>
              <li>
                Author formal technical rationales and test justifications incorporated into regulatory
                submissions to eliminate redundant testing while preserving traceability and risk posture
              </li>
              <li>
                Manage and mentor direct reports while defining technical hiring criteria to scale verification
                and data-focused teams
              </li>
            </ul>

            <CompanyHeader
              company="Corrie Health"
              companyUrl="https://corriehealth.com/"
              role="iOS Software Developer"
              meta="Remote • 2018–2021"
            />
            <ul>
              <li>
                Developed and deployed patient-facing iOS applications for secure collection,
                visualization and longitudinal tracking of physiological data used by clinicians
                for monitoring trends and outcomes
              </li>
              <li>
                Integrated Bluetooth-enabled medical devices to stream real-time physiological
                signals into mobile applications and managed production App Store releases
              </li>
            </ul>

            <CompanyHeader
              company="Medtronic"
              companyUrl="https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/ventricular-assist-devices/heartware-hvad-system.html"
              role="Clinical Engineering Intern – Automation and Algorithm Development"
              meta="Miami Lakes, FL • Summer 2019"
            />
            <ul>
              <li>
                Created an automated testing system implemented on algorithms to examine sensitivity and false positive rates
              </li>
              <li>
                Built a custom analytics system to assess the significance of circadian disruption in predicting adverse outcomes
              </li>
              <li>
                Developed an algorithm to identify cardiac preload to non-invasively manage HVAD controller speed
              </li>
            </ul>

            <CompanyHeader
              company="imec"
              companyUrl="https://www.imec-int.com/en/expertise/health-technologies/vital-sign-monitoring#%20Wearable"
              role="Wearable Technology Integration Intern"
              meta="Leuven, Belgium • Summer 2018"
            />
            <ul>
              <li>
                Designed and developed an iOS application to securely ingest and visualize physiological data from a clinical grade wearable prototype
              </li>
              <li>
                Enabled contextual interpretation of stress trends from physiological stress signals in relation to geolocation and time based patterns
              </li>
              <li>
                Implemented server communication pipelines to deliver real time derived stress metrics within the mobile application
              </li>
              <li>
                Independently owned project execution end to end, defining milestones and checkpoints to meet delivery timelines
              </li>
            </ul>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56, duration: 0.5 }}
        >
          <AccordionItem id="skills" title="Skills">
            <div className="skills-grid">
              <div className="skills-column">
                <h4>AI and Data Systems</h4>
                <ul>
                  <li>LLM-enabled analytics and workflow integration</li>
                  <li>Machine learning and predictive modeling</li>
                  <li>Data pipelines automation and model evaluation</li>
                </ul>

                <h4>Software Engineering</h4>
                <ul>
                  <li>Python-based analytical and visualization tooling</li>
                  <li>Algorithm development and verification</li>
                  <li>User-facing tools for engineering and clinical workflows</li>
                </ul>
              </div>

              <div className="skills-column">
                <h4>Physical Systems</h4>
                <ul>
                  <li>3D modeling and rapid prototyping for test systems</li>
                  <li>CAD-based fixture and experimental setup design</li>
                  <li>Sensor-integrated prototyping for system-level evaluation</li>
                </ul>

                <h4>Regulated MedTech & Verification</h4>
                <ul>
                  <li>Design Verification (DV) strategy and execution</li>
                  <li>Medical device standards and test traceability (ISO 5840)</li>
                  <li>Experimental design and statistical rigor</li>
                </ul>
              </div>
            </div>

            

            <div className="skills-actions">
              <span
                className="company-link-group"
                role="button"
                tabIndex={0}
                onClick={() => setSkillsArcadeOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSkillsArcadeOpen(true);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="company-name">Skills Challenge</span>
                <span className="company-link-icon" aria-hidden="true">
                  ↗
                </span>
              </span>
            </div>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.64, duration: 0.5 }}
        >
          <AccordionItem id="research" title="Research">
            <CompanyHeader
              company="Journal of the American College of Cardiology (JACC)"
              companyUrl="https://www.sciencedirect.com/science/article/pii/S1936879824006472"
              role="Author"
              meta="Published in 2024"
            />
            <ul>
              <li>
                Hydrodynamic Assessment of Explanted Degenerated Transcatheter Aortic Valves: Novel Insights Into Noncalcific and Calcific Mechanisms
              </li>
            </ul>

            <CompanyHeader
              company="Johns Hopkins University"
              companyUrl="https://www.hopkinsmedicine.org/inhealth"
              role="inHealth Precision Medicine – Project Lead"
              meta="Baltimore, MD • 2016–2021"
            />
            <ul>
              <li>
                Built machine learning models, including random forest classifiers, to predict patient outcomes using
                ambulatory and physiological datasets collected in clinical settings
              </li>
              <li>
                Developed iOS and watchOS applications to support remote collection of patient-reported pain metrics
                and physiological signals, enabling analysis of trends and temporal patterns
              </li>
              <li>
                Led hospital-based clinical studies under a funded Research Award, coordinating multidisciplinary
                teams and ensuring adherence to approved clinical protocol
              </li>
            </ul>

            <CompanyHeader
              company="Johns Hopkins University"
              companyUrl="https://www.hopkinsmedicine.org/inhealth"
              role="Master's Thesis Project"
              meta="Baltimore, MD • 2019-2020"
            />
            <ul>
              <li>
                Integrated IMUs and flex sensors to capture wrist and hand kinematics and wirelessly control an actuated
                3D printed hand with embedded tactile sensing using conductive traces and piezoresistive fabric
              </li>
              <li>
                Developed a Python based graphical interface to visualize tactile sensor activation and monitor system performance in real time
              </li>
            </ul>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.5 }}
        >
          <AccordionItem id="education" title="Education">
            <CompanyHeader company="Johns Hopkins University" companyUrl="https://www.bme.jhu.edu" role="Degrees (2020)" meta="" />
            <ul>
              <li>M.S.E. in Biomedical Engineering – Imaging and Medical Devices</li>
              <li>B.S. in Biomedical Engineering – Minor: Computer Integrated Surgery</li>
            </ul>

            <CompanyHeader
              company="Purdue University"
              companyUrl="https://bootcamp-sl.discover.online.purdue.edu/applied-artificial-intelligence-course"
              role="Certification (2026)"
              meta=""
            />
            <ul>
              <li>Applied Generative AI Specialization – Building LLM Applications and Agentic Frameworks</li>
            </ul>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.80, duration: 0.5 }}
        >
          <div className="accordion-item" id="resume">
            <a
              className="accordion-header accordion-download"
              href="/Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="accordion-title">Download PDF</span>
              <span className="accordion-icon" aria-hidden="true">
                ↧
              </span>
            </a>
          </div>
        </motion.div>
      </motion.div>

      {arcadePortal}
    </motion.section>
  );
}

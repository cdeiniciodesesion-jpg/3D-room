import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Box, Disc3, PiggyBank, BookOpen, CheckSquare, Share2, Brain,
  Shirt, CreditCard, X, Sparkles, Play, Trash2, Star, Sprout,
  ClipboardCheck, Trophy, RotateCcw, Zap, Clock, Lock, Check,
} from "lucide-react";

/* ============================================================
   ESTILOS BASE
   ============================================================ */
const INK = "#141110";
const CARD = "#FFFDF7";
const hardShadow = (n = 4) => `${n}px ${n}px 0px ${INK}`;

function shade(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `rgb(${r},${g},${b})`;
}

/* ============================================================
   PERSISTENCIA
   ============================================================ */
const STORAGE_KEYS = [
  "profile:stats", "apuntes:list", "checklist:rows", "repaso:temas",
  "musica:settings", "outfit:selection", "id:card", "examen:historial",
];

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (window.storage) {
          const result = await window.storage.get(key, false);
          if (!cancelled && result && result.value) setValue(JSON.parse(result.value));
        }
      } catch (e) {
        // clave nueva
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        if (window.storage) await window.storage.set(key, JSON.stringify(value), false);
      } catch (e) {
        console.error("Error guardando", key, e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, loaded]);

  return [value, setValue, loaded];
}

async function resetAllProgress() {
  try {
    if (window.storage) {
      for (const k of STORAGE_KEYS) {
        try { await window.storage.delete(k, false); } catch (e) {}
      }
    }
  } finally {
    window.location.reload();
  }
}

/* ============================================================
   DATOS ESTÁTICOS
   ============================================================ */
const ROOMS = [
  { id: "room3d", title: "Salón 3D / Taller", icon: Box, color: "#F0B429", pos: { top: "5%", left: "32%" }, desc: "Pomodoro en grupo y tu taller 3D" },
  { id: "apuntes", title: "Biblioteca de Apuntes", icon: BookOpen, color: "#4C9A5B", pos: { top: "20%", left: "10%" }, desc: "Notas y archivos por materia" },
  { id: "checklist", title: "Zona de Tareas", icon: CheckSquare, color: "#2F7B8C", pos: { top: "42%", left: "10%" }, desc: "Tests, vídeos y checklist" },
  { id: "mapa", title: "Laboratorio de Ideas", icon: Share2, color: "#E5572E", pos: { top: "18%", left: "62%" }, desc: "Mapa de red de materias" },
  { id: "espaciado", title: "Torre de Repaso", icon: Brain, color: "#8B5FBF", pos: { top: "38%", left: "62%" }, desc: "Repetición espaciada tipo Anki" },
  { id: "ahorro", title: "Caja Fuerte", icon: PiggyBank, color: "#E5572E", pos: { top: "62%", left: "20%" }, desc: "Ahorro diario" },
  { id: "musica", title: "Estadio de Vinilos", icon: Disc3, color: "#8B5FBF", pos: { top: "62%", left: "50%" }, desc: "Lo-Fi + sonido ambiente" },
  { id: "outfit", title: "Vestidor", icon: Shirt, color: "#E85D9C", pos: { top: "78%", left: "35%" }, desc: "Ropa para ir a clases" },
  { id: "id", title: "Oficina Carnet ID", icon: CreditCard, color: "#4C9A5B", pos: { top: "82%", left: "65%" }, desc: "Personaliza tu tarjeta" },
  { id: "examenes", title: "Sala de Exámenes", icon: ClipboardCheck, color: "#D64545", pos: { top: "6%", left: "82%" }, desc: "Simulacros con cronómetro" },
  { id: "jardin", title: "Jardín del Progreso", icon: Sprout, color: "#3FA34D", pos: { top: "46%", left: "84%" }, desc: "Crece con tus horas" },
  { id: "logros", title: "Sala de Logros", icon: Trophy, color: "#EAC54F", pos: { top: "80%", left: "86%" }, desc: "Nivel, XP e insignias" },
];

const BADGES = [
  { id: "primer_paso", title: "Primer Paso", desc: "Gana tus primeros 10 XP", icon: Star, check: (s) => s.xp >= 10 },
  { id: "dedicado", title: "Estudiante Dedicado", desc: "Acumula 100 min de estudio", icon: Brain, check: (s) => s.studyMinutes >= 100 },
  { id: "ahorrador", title: "Ahorrador Nato", desc: "Junta $150 en la alcancía", icon: PiggyBank, check: (s) => s.totalSavings >= 150 },
  { id: "repasador", title: "Maestro del Repaso", desc: "Completa 5 repasos", icon: Sparkles, check: (s) => s.repasosCompletados >= 5 },
  { id: "examinado", title: "Examinado", desc: "Termina tu primer simulacro", icon: ClipboardCheck, check: (s) => s.examenesCompletados >= 1 },
  { id: "organizado", title: "Súper Organizado", desc: "Completa 10 tareas", icon: CheckSquare, check: (s) => s.tareasCompletadas >= 10 },
  { id: "jardinero", title: "Jardinero Experto", desc: "Alcanza 300 min de estudio", icon: Sprout, check: (s) => s.studyMinutes >= 300 },
  { id: "veterano", title: "Veterano", desc: "Alcanza el nivel 5", icon: Trophy, check: (s) => Math.floor(s.xp / 100) + 1 >= 5 },
];

const GARDEN_STAGES = [
  { min: 0, label: "Semilla", emoji: "🌰" },
  { min: 30, label: "Brote", emoji: "🌱" },
  { min: 90, label: "Planta joven", emoji: "🌿" },
  { min: 180, label: "Arbusto floreciendo", emoji: "🌳" },
  { min: 300, label: "Árbol joven", emoji: "🌲" },
  { min: 480, label: "Árbol frondoso", emoji: "🌴" },
];

const OUTFITS = [
  { id: "casual", label: "Casual", emoji: "👕", color: "#4C9A5B" },
  { id: "formal", label: "Formal", emoji: "🧥", color: "#2F7B8C" },
  { id: "deportivo", label: "Deportivo", emoji: "🏃", color: "#E5572E" },
  { id: "invierno", label: "Invierno", emoji: "🧣", color: "#8B5FBF" },
];

const ID_COLORS = ["#F0B429", "#4C9A5B", "#2F7B8C", "#E5572E", "#8B5FBF", "#E85D9C"];

/* ============================================================
   VISOR 3D — carga tu modelo .glb desde GitHub
   ============================================================ */
const MODEL_URL =
  "https://raw.githubusercontent.com/cdeiniciodesesion-jpg/3D-room/main/Vendal's%20workshop%20by%20Nick%20Slough%20-%20bMMbKP7AsZM.glb";

function Visor3D({ height = 300 }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("cargando");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1b1712");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4, 3, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1;
    controls.maxDistance = 20;

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(4 / maxDim);
        scene.add(model);
        setStatus("listo");
      },
      undefined,
      (err) => {
        console.error("Error cargando el GLB:", err);
        setStatus("error");
      }
    );

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [height]);

  return (
    <div className="relative rounded-xl overflow-hidden border-2" style={{ borderColor: INK }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      {status === "cargando" && (
        <div className="absolute inset-0 flex items-center justify-center text-amber-300 font-bold text-xs bg-black/40">
          Cargando taller 3D...
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-300 font-bold text-xs bg-black/60 text-center px-4">
          No se pudo cargar el modelo. Verifica que el repositorio de GitHub sea público.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   1. SALÓN 3D — Pomodoro + Taller 3D
   ============================================================ */
function Room3DModule({ addXP, addStat }) {
  const [seconds, setSeconds] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer;
    if (isRunning && seconds > 0) timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning, seconds]);

  useEffect(() => {
    if (isRunning && seconds === 0) {
      setIsRunning(false);
      addStat("studyMinutes", 25);
      addXP(20);
    }
  }, [seconds, isRunning]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <Visor3D height={260} />
      <div className="p-4 rounded-xl text-center bg-emerald-900 text-white border-2" style={{ borderColor: INK }}>
        <p className="uppercase tracking-widest font-bold text-emerald-300" style={{ fontSize: "10px" }}>Pizarra de Estudio</p>
        <p className="text-4xl font-mono font-black my-1">{fmt(seconds)}</p>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="mt-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase text-black bg-amber-400 border-2"
          style={{ borderColor: INK }}
        >
          {isRunning ? "Pausar" : "Iniciar Sesión"}
        </button>
        <p className="mt-2 font-bold text-emerald-300" style={{ fontSize: "9px" }}>+20 XP y +25 min de jardín al completar</p>
      </div>
    </div>
  );
}

/* ============================================================
   2. BIBLIOTECA DE APUNTES
   ============================================================ */
function ApuntesModule() {
  const [apuntes, setApuntes, loaded] = usePersistentState("apuntes:list", [
    { id: 1, titulo: "Resumen Álgebra Lineal", materia: "Matemáticas" },
    { id: 2, titulo: "Estructuras Dinámicas C++", materia: "Programación" },
  ]);
  const [nuevo, setNuevo] = useState("");

  return (
    <div className="space-y-3">
      {!loaded && <p className="text-stone-400 font-bold" style={{ fontSize: "10px" }}>Cargando tus apuntes...</p>}
      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nombre del apunte digital..."
          className="flex-1 px-3 py-1.5 border-2 rounded-lg text-xs outline-none"
          style={{ borderColor: INK }}
        />
        <button
          onClick={() => { if (nuevo.trim()) { setApuntes([...apuntes, { id: Date.now(), titulo: nuevo, materia: "General" }]); setNuevo(""); } }}
          className="px-3 py-1.5 bg-emerald-400 font-bold text-xs border-2 rounded-lg"
          style={{ borderColor: INK }}
        >
          Crear
        </button>
      </div>
      <div className="space-y-2">
        {apuntes.map((a) => (
          <div key={a.id} className="p-3 border-2 rounded-lg flex justify-between items-center bg-white" style={{ borderColor: INK }}>
            <div>
              <p className="font-extrabold text-xs">{a.titulo}</p>
              <span className="bg-stone-200 px-2 py-0.5 rounded font-bold" style={{ fontSize: "10px" }}>{a.materia}</span>
            </div>
            <button onClick={() => setApuntes(apuntes.filter((x) => x.id !== a.id))} className="p-1 text-red-500 hover:scale-110">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   3. ZONA DE TAREAS
   ============================================================ */
function ChecklistModule({ addXP, addStat }) {
  const [rows, setRows, loaded] = usePersistentState("checklist:rows", [
    { id: 1, tema: "Tema 1: Matrices", video: true, test: true, tarea: false },
    { id: 2, tema: "Tema 2: Algoritmos", video: true, test: false, tarea: false },
  ]);
  const [nuevoTema, setNuevoTema] = useState("");

  const toggle = (id, field) => {
    setRows(rows.map((r) => {
      if (r.id !== id) return r;
      const newVal = !r[field];
      addStat("tareasCompletadas", newVal ? 1 : -1);
      if (newVal) addXP(5);
      return { ...r, [field]: newVal };
    }));
  };

  const addRow = () => {
    if (!nuevoTema.trim()) return;
    setRows([...rows, { id: Date.now(), tema: nuevoTema, video: false, test: false, tarea: false }]);
    setNuevoTema("");
  };

  return (
    <div className="space-y-3">
      {!loaded && <p className="text-stone-400 font-bold" style={{ fontSize: "10px" }}>Cargando tus tareas...</p>}
      <div className="flex gap-2">
        <input
          value={nuevoTema}
          onChange={(e) => setNuevoTema(e.target.value)}
          placeholder="Nuevo tema..."
          className="flex-1 px-3 py-1.5 border-2 rounded-lg text-xs outline-none"
          style={{ borderColor: INK }}
        />
        <button onClick={addRow} className="px-3 py-1.5 bg-teal-400 font-black text-xs border-2 rounded-lg" style={{ borderColor: INK }}>
          + Agregar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: INK }}>
              <th className="p-2 font-black">Tema</th>
              <th className="p-2 text-center font-black">Vídeo</th>
              <th className="p-2 text-center font-black">Test</th>
              <th className="p-2 text-center font-black">Tarea</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b" style={{ borderColor: "#E7DCC2" }}>
                <td className="p-2 font-bold">{r.tema}</td>
                {["video", "test", "tarea"].map((col) => (
                  <td key={col} className="p-2 text-center">
                    <input type="checkbox" checked={r[col]} onChange={() => toggle(r.id, col)} className="w-4 h-4 cursor-pointer accent-teal-600" />
                  </td>
                ))}
                <td className="p-2 text-center">
                  <button onClick={() => setRows(rows.filter((x) => x.id !== r.id))} className="text-red-500 hover:scale-110">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-stone-400 font-bold">No hay temas. ¡Agrega uno!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   4. LABORATORIO DE IDEAS — mapa de red de materias
   ============================================================ */
function MapaModule() {
  const [apuntes] = usePersistentState("apuntes:list", []);
  const materias = [...new Set(apuntes.map((a) => a.materia))];
  const nodes = materias.length > 0 ? materias : ["Matemáticas", "Programación", "General"];
  const cx = 150, cy = 130, radius = 100;

  return (
    <div className="flex flex-col items-center space-y-3">
      <svg width="300" height="280" viewBox="0 0 300 280">
        {nodes.map((_, i) => {
          const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          return <line key={`l${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={INK} strokeWidth="2.5" strokeDasharray="3 6" />;
        })}
        <circle cx={cx} cy={cy} r="34" fill="#E5572E" stroke={INK} strokeWidth="3" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fontWeight="900" fill="white">TÚ</text>
        {nodes.map((m, i) => {
          const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          return (
            <g key={m}>
              <circle cx={x} cy={y} r="30" fill="#FFFDF7" stroke={INK} strokeWidth="3" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fontWeight="800" fill={INK}>
                {m.length > 10 ? m.slice(0, 9) + "…" : m}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-center text-stone-500 font-bold px-4">
        Cada materia se conecta contigo — se generan solas desde tus apuntes en la Biblioteca.
      </p>
    </div>
  );
}

/* ============================================================
   5. TORRE DE REPASO — repetición espaciada
   ============================================================ */
function EspaciadoModule({ addXP, addStat }) {
  const [temas, setTemas, loaded] = usePersistentState("repaso:temas", [
    { id: 1, tema: "Derivadas e Integrales", box: 1 },
    { id: 2, tema: "Punteros en C++", box: 2 },
  ]);
  const [nuevo, setNuevo] = useState("");
  const boxLabels = ["", "Hoy", "En 2 días", "En 4 días", "En 1 semana", "¡Dominado!"];

  const repasar = (id) => {
    setTemas(temas.map((t) => {
      if (t.id !== id) return t;
      addStat("repasosCompletados", 1);
      addXP(10);
      return { ...t, box: Math.min(5, t.box + 1) };
    }));
  };

  return (
    <div className="space-y-3">
      {!loaded && <p className="text-stone-400 font-bold" style={{ fontSize: "10px" }}>Cargando torre...</p>}
      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nuevo tema para repasar..."
          className="flex-1 px-3 py-1.5 border-2 rounded-lg text-xs outline-none"
          style={{ borderColor: INK }}
        />
        <button
          onClick={() => { if (nuevo.trim()) { setTemas([...temas, { id: Date.now(), tema: nuevo, box: 1 }]); setNuevo(""); } }}
          className="px-3 py-1.5 bg-violet-400 font-black text-xs border-2 rounded-lg"
          style={{ borderColor: INK }}
        >
          +
        </button>
      </div>
      <div className="space-y-2">
        {temas.map((t) => (
          <div key={t.id} className="p-3 border-2 rounded-lg bg-violet-50 flex justify-between items-center" style={{ borderColor: INK }}>
            <div>
              <p className="font-extrabold text-xs">{t.tema}</p>
              <span className="font-bold text-violet-600" style={{ fontSize: "10px" }}>{boxLabels[t.box]}</span>
            </div>
            {t.box < 5 ? (
              <button onClick={() => repasar(t.id)} className="px-3 py-1 bg-violet-500 text-white font-bold text-xs rounded-lg border-2" style={{ borderColor: INK }}>
                Repasar
              </button>
            ) : (
              <Star size={20} className="text-amber-400" fill="#F0B429" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   6. CAJA FUERTE — Alcancía
   ============================================================ */
function AlcanciaModule({ stats, addStat, addXP }) {
  const [monto, setMonto] = useState("");
  const [anim, setAnim] = useState(false);

  const depositar = () => {
    const val = parseFloat(monto);
    if (!val || val <= 0) return;
    setAnim(true);
    setTimeout(() => {
      addStat("totalSavings", val);
      addXP(Math.max(1, Math.round(val / 2)));
      setMonto("");
      setAnim(false);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center py-2 space-y-3">
      <div className={`transition-transform duration-300 ${anim ? "scale-125 rotate-12" : "scale-100"}`}>
        <PiggyBank size={64} color="#E5572E" />
      </div>
      <h3 className="text-3xl font-black">${stats.totalSavings.toFixed(2)}</h3>
      <div className="flex gap-2 w-full max-w-xs">
        <input
          type="number"
          placeholder="Monto $..."
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="flex-1 px-3 py-1.5 border-2 rounded-lg text-xs outline-none"
          style={{ borderColor: INK }}
        />
        <button onClick={depositar} className="px-4 py-1.5 bg-amber-400 border-2 font-black text-xs rounded-lg" style={{ borderColor: INK }}>
          Ahorrar
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   AUDIO AMBIENTE (sintetizado)
   ============================================================ */
function makeNoiseBuffer(ctx, type = "white", seconds = 2) {
  const bufferSize = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  } else {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

function startLoop(ctx, { type, freq, baseGain, volume }) {
  const source = ctx.createBufferSource();
  source.buffer = makeNoiseBuffer(ctx, type, 2);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.value = (volume / 100) * baseGain;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  return { source, filter, gain };
}

function stopLoop(node) {
  if (!node || !node.source) return;
  try { node.source.stop(); } catch (e) {}
  node.source.disconnect();
  node.filter.disconnect();
  node.gain.disconnect();
}

/* ============================================================
   7. ESTADIO DE VINILOS
   ============================================================ */
function MusicaModule() {
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = usePersistentState("musica:settings", { rainVol: 40, cafeVol: 25 });
  const audioCtxRef = useRef(null);
  const rainNodeRef = useRef(null);
  const cafeNodeRef = useRef(null);

  const stopAmbient = () => {
    stopLoop(rainNodeRef.current);
    stopLoop(cafeNodeRef.current);
    rainNodeRef.current = null;
    cafeNodeRef.current = null;
  };

  const togglePlay = () => {
    if (!playing) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { setPlaying(true); return; }
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      rainNodeRef.current = startLoop(ctx, { type: "white", freq: 1000, baseGain: 0.22, volume: settings.rainVol });
      cafeNodeRef.current = startLoop(ctx, { type: "brown", freq: 400, baseGain: 0.28, volume: settings.cafeVol });
      setPlaying(true);
    } else {
      stopAmbient();
      setPlaying(false);
    }
  };

  useEffect(() => () => stopAmbient(), []);
  useEffect(() => {
    if (playing && rainNodeRef.current) rainNodeRef.current.gain.gain.value = (settings.rainVol / 100) * 0.22;
  }, [settings.rainVol, playing]);
  useEffect(() => {
    if (playing && cafeNodeRef.current) cafeNodeRef.current.gain.gain.value = (settings.cafeVol / 100) * 0.28;
  }, [settings.cafeVol, playing]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center bg-stone-900 ${playing ? "animate-spin" : ""}`} style={{ borderColor: INK, animationDuration: "3s" }}>
        <Disc3 size={40} color="#8B5FBF" />
      </div>
      <button onClick={togglePlay} className="px-5 py-2 bg-violet-400 font-black text-xs border-2 rounded-lg" style={{ borderColor: INK }}>
        {playing ? "Pausar Ambiente" : "▶ Reproducir Lo-Fi + Ambiente"}
      </button>
      <div className="w-full max-w-xs space-y-2">
        <div>
          <label className="font-bold" style={{ fontSize: "10px" }}>🌧️ Lluvia: {settings.rainVol}%</label>
          <input type="range" min="0" max="100" value={settings.rainVol} onChange={(e) => setSettings({ ...settings, rainVol: Number(e.target.value) })} className="w-full accent-violet-500" />
        </div>
        <div>
          <label className="font-bold" style={{ fontSize: "10px" }}>☕ Cafetería: {settings.cafeVol}%</label>
          <input type="range" min="0" max="100" value={settings.cafeVol} onChange={(e) => setSettings({ ...settings, cafeVol: Number(e.target.value) })} className="w-full accent-violet-500" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   8. VESTIDOR
   ============================================================ */
function OutfitModule() {
  const [selection, setSelection, loaded] = usePersistentState("outfit:selection", "casual");
  return (
    <div className="space-y-3">
      {!loaded && <p className="text-stone-400 font-bold" style={{ fontSize: "10px" }}>Cargando armario...</p>}
      <div className="grid grid-cols-2 gap-3">
        {OUTFITS.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelection(o.id)}
            className="p-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-transform"
            style={{
              borderColor: INK,
              backgroundColor: selection === o.id ? o.color : "#FFFDF7",
              boxShadow: selection === o.id ? hardShadow(3) : "none",
              transform: selection === o.id ? "scale(1.03)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: "32px" }}>{o.emoji}</span>
            <span className={`font-black text-xs ${selection === o.id ? "text-white" : ""}`}>{o.label}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs font-bold text-stone-500">
        Outfit actual: {OUTFITS.find((o) => o.id === selection)?.label}
      </p>
    </div>
  );
}

/* ============================================================
   9. OFICINA CARNET ID
   ============================================================ */
function IdModule() {
  const [card, setCard, loaded] = usePersistentState("id:card", { name: "Estudiante", color: ID_COLORS[0], emoji: "🎓" });
  return (
    <div className="space-y-4">
      {!loaded && <p className="text-stone-400 font-bold" style={{ fontSize: "10px" }}>Cargando carnet...</p>}
      <div className="p-4 rounded-2xl border-2 mx-auto max-w-xs" style={{ borderColor: INK, backgroundColor: card.color, boxShadow: hardShadow(4) }}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center border-2" style={{ borderColor: INK, fontSize: "26px" }}>
            {card.emoji}
          </div>
          <div>
            <p className="text-white font-black text-sm">{card.name || "Estudiante"}</p>
            <p className="text-white font-bold" style={{ fontSize: "10px" }}>Carnet de Estudio · ID</p>
          </div>
        </div>
      </div>
      <input
        value={card.name}
        onChange={(e) => setCard({ ...card, name: e.target.value })}
        placeholder="Tu nombre..."
        className="w-full px-3 py-1.5 border-2 rounded-lg text-xs outline-none"
        style={{ borderColor: INK }}
      />
      <div className="flex gap-2 justify-center flex-wrap">
        {ID_COLORS.map((c) => (
          <button key={c} onClick={() => setCard({ ...card, color: c })} className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: c, borderColor: INK, outline: card.color === c ? `2px solid ${INK}` : "none", outlineOffset: "2px" }} />
        ))}
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {["🎓", "📚", "✏️", "🚀", "⭐", "🦉"].map((e) => (
          <button key={e} onClick={() => setCard({ ...card, emoji: e })} className="w-9 h-9 rounded-lg border-2 flex items-center justify-center" style={{ borderColor: INK, backgroundColor: card.emoji === e ? "#FFF6DA" : "#FFFDF7", fontSize: "18px" }}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   10. SALA DE EXÁMENES
   ============================================================ */
function ExamenModule({ addXP, addStat }) {
  const [historial, setHistorial, loaded] = usePersistentState("examen:historial", []);
  const [seconds, setSeconds] = useState(600);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let timer;
    if (running && seconds > 0) timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    if (running && seconds === 0) {
      setRunning(false);
      setFinished(true);
    }
    return () => clearInterval(timer);
  }, [running, seconds]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const finalizar = () => {
    setRunning(false);
    setFinished(true);
    const registro = { id: Date.now(), fecha: new Date().toLocaleDateString() };
    setHistorial([registro, ...historial].slice(0, 5));
    addStat("examenesCompletados", 1);
    addXP(30);
  };

  const reiniciar = () => { setSeconds(600); setRunning(false); setFinished(false); };

  return (
    <div className="space-y-4">
      {!loaded && <p className="text-stone-400 font-bold" style={{ fontSize: "10px" }}>Cargando historial...</p>}
      <div className="p-4 rounded-xl text-center bg-red-900 text-white border-2" style={{ borderColor: INK }}>
        <p className="uppercase tracking-widest font-bold text-red-300" style={{ fontSize: "10px" }}>Simulacro Cronometrado</p>
        <p className="text-4xl font-mono font-black my-1">{fmt(seconds)}</p>
        {!finished ? (
          <button onClick={() => setRunning(!running)} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase text-black bg-amber-400 border-2" style={{ borderColor: INK }}>
            {running ? "Pausar" : "Iniciar Examen"}
          </button>
        ) : (
          <button onClick={reiniciar} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase text-black bg-amber-400 border-2 flex items-center gap-1 mx-auto" style={{ borderColor: INK }}>
            <RotateCcw size={12} /> Nuevo intento
          </button>
        )}
        {running && (
          <button onClick={finalizar} className="mt-2 ml-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase text-white bg-red-600 border-2" style={{ borderColor: INK }}>
            Entregar
          </button>
        )}
      </div>
      <div>
        <h4 className="font-extrabold text-xs mb-2">Historial reciente:</h4>
        <div className="space-y-1">
          {historial.length === 0 && <p className="text-stone-400 font-bold text-xs">Aún no completas ningún simulacro.</p>}
          {historial.map((h) => (
            <div key={h.id} className="p-2 rounded-lg border-2 bg-white text-xs font-bold flex justify-between" style={{ borderColor: INK }}>
              <span>Simulacro completado</span><span className="text-stone-500">{h.fecha}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   11. JARDÍN DEL PROGRESO
   ============================================================ */
function JardinModule({ stats }) {
  const mins = stats.studyMinutes;
  let stageIdx = 0;
  GARDEN_STAGES.forEach((s, i) => { if (mins >= s.min) stageIdx = i; });
  const stage = GARDEN_STAGES[stageIdx];
  const next = GARDEN_STAGES[stageIdx + 1];

  return (
    <div className="flex flex-col items-center space-y-3 py-2">
      <div style={{ fontSize: "80px" }}>{stage.emoji}</div>
      <h3 className="text-xl font-black">{stage.label}</h3>
      <p className="text-xs font-bold text-stone-500">{mins} minutos de estudio acumulados</p>
      {next ? (
        <div className="w-full max-w-xs">
          <div className="h-3 rounded-full border-2 overflow-hidden bg-stone-100" style={{ borderColor: INK }}>
            <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (mins / next.min) * 100)}%` }} />
          </div>
          <p className="text-center mt-1 font-bold text-stone-500" style={{ fontSize: "10px" }}>
            {next.min - mins} min para: {next.emoji} {next.label}
          </p>
        </div>
      ) : (
        <p className="font-bold text-emerald-600 text-xs">¡Tu jardín está completo! 🎉</p>
      )}
    </div>
  );
}

/* ============================================================
   12. SALA DE LOGROS
   ============================================================ */
function LogrosModule({ stats }) {
  const level = Math.floor(stats.xp / 100) + 1;
  const xpInLevel = stats.xp % 100;
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl text-center bg-amber-900 text-white border-2" style={{ borderColor: INK }}>
        <p className="uppercase tracking-widest font-bold text-amber-300" style={{ fontSize: "10px" }}>Nivel</p>
        <p className="text-4xl font-black my-1">{level}</p>
        <div className="h-2.5 rounded-full border-2 overflow-hidden bg-amber-950 max-w-xs mx-auto" style={{ borderColor: INK }}>
          <div className="h-full bg-amber-400" style={{ width: `${xpInLevel}%` }} />
        </div>
        <p className="mt-1 font-bold text-amber-300" style={{ fontSize: "9px" }}>{xpInLevel}/100 XP · Total: {stats.xp} XP</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BADGES.map((b) => {
          const unlocked = b.check(stats);
          const Icon = b.icon;
          return (
            <div key={b.id} className="p-3 rounded-lg border-2 flex flex-col items-center text-center gap-1" style={{ borderColor: INK, backgroundColor: unlocked ? "#FFF6DA" : "#F2EFE6", opacity: unlocked ? 1 : 0.55 }}>
              {unlocked ? <Icon size={22} color="#F0B429" /> : <Lock size={20} color="#999" />}
              <p className="font-black" style={{ fontSize: "10px" }}>{b.title}</p>
              <p className="text-stone-500 font-bold" style={{ fontSize: "9px" }}>{b.desc}</p>
              {unlocked && <Check size={12} className="text-emerald-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   APP PRINCIPAL — la casa isométrica
   ============================================================ */
export default function App() {
  const [stats, setStats, statsLoaded] = usePersistentState("profile:stats", {
    xp: 0, studyMinutes: 0, totalSavings: 0, repasosCompletados: 0, examenesCompletados: 0, tareasCompletadas: 0,
  });
  const [activeRoom, setActiveRoom] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const addXP = (n) => setStats((s) => ({ ...s, xp: Math.max(0, s.xp + n) }));
  const addStat = (key, n) => setStats((s) => ({ ...s, [key]: Math.max(0, (s[key] || 0) + n) }));

  const level = Math.floor(stats.xp / 100) + 1;
  const xpInLevel = stats.xp % 100;
  const room = ROOMS.find((r) => r.id === activeRoom);

  const renderModule = () => {
    switch (activeRoom) {
      case "room3d": return <Room3DModule addXP={addXP} addStat={addStat} />;
      case "apuntes": return <ApuntesModule />;
      case "checklist": return <ChecklistModule addXP={addXP} addStat={addStat} />;
      case "mapa": return <MapaModule />;
      case "espaciado": return <EspaciadoModule addXP={addXP} addStat={addStat} />;
      case "ahorro": return <AlcanciaModule stats={stats} addStat={addStat} addXP={addXP} />;
      case "musica": return <MusicaModule />;
      case "outfit": return <OutfitModule />;
      case "id": return <IdModule />;
      case "examenes": return <ExamenModule addXP={addXP} addStat={addStat} />;
      case "jardin": return <JardinModule stats={stats} />;
      case "logros": return <LogrosModule stats={stats} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F4EFE1", fontFamily: "system-ui, sans-serif", color: INK }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b-2" style={{ borderColor: INK, backgroundColor: CARD }}>
        <div>
          <p className="font-black text-sm">🏠 Casa de Estudio</p>
          <p className="text-stone-500 font-bold" style={{ fontSize: "10px" }}>{statsLoaded ? `Nivel ${level} · ${stats.xp} XP` : "Cargando..."}</p>
        </div>
        <div className="flex items-center gap-2 w-32">
          <Zap size={16} color="#F0B429" />
          <div className="flex-1 h-2 rounded-full border-2 overflow-hidden bg-stone-100" style={{ borderColor: INK }}>
            <div className="h-full bg-amber-400" style={{ width: `${xpInLevel}%` }} />
          </div>
        </div>
        <button onClick={() => setConfirmReset(true)} className="p-1.5 rounded-lg border-2" style={{ borderColor: INK }} aria-label="Reiniciar progreso">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Mapa isométrico */}
      <div className="relative w-full" style={{ height: "620px" }}>
        {ROOMS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRoom(r.id)}
              className="absolute flex flex-col items-center gap-1 transition-transform hover:scale-105 active:scale-95"
              style={{ top: r.pos.top, left: r.pos.left, transform: "translate(-50%, 0)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center"
                style={{ backgroundColor: r.color, borderColor: INK, boxShadow: hardShadow(4) }}
              >
                <Icon size={28} color="white" />
              </div>
              <span className="font-black text-center leading-tight px-1 py-0.5 rounded bg-white border-2" style={{ fontSize: "9px", borderColor: INK, maxWidth: "90px" }}>
                {r.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modal de habitación */}
      {room && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setActiveRoom(null)}>
          <div
            className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-2 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: CARD, borderColor: INK }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b-2 sticky top-0" style={{ borderColor: INK, backgroundColor: room.color }}>
              <div>
                <p className="font-black text-white text-sm">{room.title}</p>
                <p className="text-white font-bold" style={{ fontSize: "10px" }}>{room.desc}</p>
              </div>
              <button onClick={() => setActiveRoom(null)} className="p-1.5 rounded-lg bg-white border-2" style={{ borderColor: INK }}>
                <X size={16} />
              </button>
            </div>
            <div className="p-4">{renderModule()}</div>
          </div>
        </div>
      )}

      {/* Confirmación de reset */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmReset(false)}>
          <div className="bg-white rounded-2xl border-2 p-5 max-w-xs text-center space-y-3" style={{ borderColor: INK }} onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-sm">¿Reiniciar todo tu progreso?</p>
            <p className="text-stone-500 font-bold text-xs">Esto borra XP, tareas, apuntes, ahorros y todo lo guardado. No se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 py-2 rounded-lg border-2 font-bold text-xs" style={{ borderColor: INK }}>Cancelar</button>
              <button onClick={resetAllProgress} className="flex-1 py-2 rounded-lg border-2 font-bold text-xs bg-red-500 text-white" style={{ borderColor: INK }}>Sí, borrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

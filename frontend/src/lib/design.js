// Design tokens & shared image assets.
// These used to point at static.prod-images.emergentagent.com (Emergent's dev CDN).
// Run scripts/download-emergent-assets.sh once (see ROADMAP.md Phase 0) to pull the
// actual files into src/assets/emergent/, then they're yours forever — no dependency
// on Emergent's infrastructure staying up.
import hero from "../assets/emergent/hero.png";
import student from "../assets/emergent/student.png";
import parent from "../assets/emergent/parent.png";
import teacher from "../assets/emergent/teacher.png";
import cameraBg from "../assets/emergent/camera-bg.png";
import boss from "../assets/emergent/boss.png";
import worldMap from "../assets/emergent/world-map.png";

export const ASSETS = { hero, student, parent, teacher, cameraBg, boss, worldMap };

export const MODES = [
  { id: "reading_dictation", title: "讀默", subtitle: "Memory Mist Battle", color: "from-sky-400 to-blue-600", icon: "📖" },
  { id: "recital_dictation", title: "背默", subtitle: "Expedition Trial", color: "from-violet-400 to-purple-600", icon: "🗡️" },
  { id: "quiz", title: "Quiz", subtitle: "Lightning Challenge", color: "from-amber-400 to-orange-500", icon: "⚡" },
  { id: "exam", title: "Exam", subtitle: "Ultimate Trial", color: "from-rose-400 to-red-600", icon: "🔥" },
  { id: "self_practice", title: "自己溫", subtitle: "Self Practice", color: "from-emerald-400 to-teal-600", icon: "🌱", noDueDate: true },
];

export const TRACK_TYPE_LABELS = {
  reading_dictation: "讀默",
  recital_dictation: "背默",
  quiz: "Quiz",
  exam: "Exam",
  self_practice: "自己溫",
};

export function Particles({ count = 28 }) {
  const parts = Array.from({ length: count }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 8;
    const dur = 8 + Math.random() * 8;
    const size = 4 + Math.random() * 10;
    return (
      <span
        key={i}
        className="particle"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${delay}s`,
          animationDuration: `${dur}s`,
        }}
      />
    );
  });
  return <div className="absolute inset-0 overflow-hidden pointer-events-none">{parts}</div>;
}

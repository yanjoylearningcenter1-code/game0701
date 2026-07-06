import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function decoysFor(answer, count = 3) {
  const pool = "的一是在不了有和人這中大為上個國我以要他時來用們生到作地於出就分對成会可主發年動同工也能下過子說產種面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞";
  const used = new Set([...answer]);
  const out = [];
  for (const ch of pool) {
    if (out.length >= count) break;
    if (!used.has(ch)) {
      out.push(ch);
      used.add(ch);
    }
  }
  return out;
}

/** Pokémon / Word Cookies style — tap tiles to fill slots (no keyboard). */
export default function TileAssemblyGame({
  answer,
  onComplete,
  disabled,
  label,
  accent = "orange",
}) {
  const { t } = useLang();
  const displayLabel = label ?? t("tile_assembly_label");
  const chars = useMemo(() => [...(answer || "")], [answer]);
  const tiles = useMemo(() => {
    const dec = decoysFor(answer, Math.min(4, Math.max(2, Math.ceil(chars.length / 2))));
    return shuffle([...chars, ...dec]).map((ch, i) => ({ id: `${i}-${ch}`, ch }));
  }, [answer, chars]);

  const [filled, setFilled] = useState([]);
  const [usedIds, setUsedIds] = useState(new Set());
  const [wrongId, setWrongId] = useState(null);
  const [burst, setBurst] = useState(false);

  const accentStyles = {
    orange: {
      arena: "from-orange-950/50 to-amber-950/30 border-orange-400/35",
      slot: "border-orange-300/50 bg-orange-400/15",
      slotFill: "from-orange-300 to-amber-500 border-amber-200",
      tile: "from-slate-200 to-slate-400 border-white/40",
      tileUsed: "opacity-30 scale-90",
    },
    cyan: {
      arena: "from-cyan-950/50 to-slate-900/30 border-cyan-400/35",
      slot: "border-cyan-300/50 bg-cyan-400/15",
      slotFill: "from-cyan-300 to-teal-500 border-cyan-200",
      tile: "from-slate-200 to-slate-400 border-white/40",
      tileUsed: "opacity-30 scale-90",
    },
    gold: {
      arena: "from-yellow-950/50 to-amber-950/30 border-yellow-400/40",
      slot: "border-yellow-300/50 bg-yellow-400/15",
      slotFill: "from-yellow-300 to-amber-500 border-yellow-200",
      tile: "from-amber-100 to-amber-300 border-amber-200/60",
      tileUsed: "opacity-30 scale-90",
    },
  };
  const st = accentStyles[accent] || accentStyles.orange;

  const tapTile = (tile) => {
    if (disabled || usedIds.has(tile.id)) return;
    const expected = chars[filled.length];
    if (tile.ch !== expected) {
      sfx.wrong?.();
      setWrongId(tile.id);
      setTimeout(() => setWrongId(null), 350);
      return;
    }
    sfx.correct?.() || sfx.click();
    const next = [...filled, tile.ch];
    setFilled(next);
    setUsedIds((prev) => new Set(prev).add(tile.id));
    if (next.length >= chars.length) {
      setBurst(true);
      setTimeout(() => onComplete?.(next.join("")), 420);
    }
  };

  const undo = () => {
    if (disabled || filled.length === 0) return;
    const last = filled[filled.length - 1];
    setFilled(filled.slice(0, -1));
    setUsedIds((prev) => {
      const next = new Set(prev);
      for (const t of tiles) {
        if (t.ch === last && next.has(t.id)) {
          next.delete(t.id);
          break;
        }
      }
      return next;
    });
    sfx.click();
  };

  return (
    <div data-testid="tile-assembly-game" className="space-y-4">
      <div className="text-center text-[10px] uppercase tracking-widest text-white/50">{displayLabel}</div>

      <div className={`relative rounded-3xl border-2 bg-gradient-to-b p-5 ${st.arena}`}>
        <div className="flex flex-wrap justify-center gap-2 min-h-[72px] items-center">
          {chars.map((_, i) => {
            const ch = filled[i];
            return (
              <motion.div
                key={`slot-${i}`}
                layout
                className={`w-11 h-12 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center font-display text-xl sm:text-2xl font-bold kaiti ${
                  ch
                    ? `bg-gradient-to-b ${st.slotFill} text-slate-900 shadow-[0_4px_0_rgba(0,0,0,0.25)]`
                    : `${st.slot} border-dashed text-white/25`
                }`}
              >
                {ch || (i === filled.length ? "▸" : "")}
              </motion.div>
            );
          })}
        </div>
        <AnimatePresence>
          {burst && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 0 }}
              className="absolute inset-0 pointer-events-none rounded-3xl bg-amber-400/30"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-2 justify-center px-1">
        {tiles.map((tile) => {
          const used = usedIds.has(tile.id);
          const wrong = wrongId === tile.id;
          return (
            <motion.button
              key={tile.id}
              type="button"
              layout
              whileTap={used ? undefined : { scale: 0.88, rotate: -3 }}
              animate={wrong ? { x: [0, -8, 8, 0] } : {}}
              onClick={() => tapTile(tile)}
              disabled={disabled || used}
              className={`w-12 h-13 sm:w-14 sm:h-16 rounded-xl border-2 font-display text-xl sm:text-2xl font-black kaiti flex items-center justify-center shadow-[0_5px_0_rgba(30,41,59,0.55)] bg-gradient-to-b ${st.tile} text-slate-900 ${used ? st.tileUsed : ""} ${wrong ? "ring-2 ring-rose-500" : ""}`}
              data-testid="assembly-tile"
            >
              {tile.ch}
            </motion.button>
          );
        })}
      </div>

      {filled.length > 0 && (
        <button type="button" onClick={undo} className="w-full text-center text-xs text-white/45 underline">
          {t("tile_assembly_undo")}
        </button>
      )}
    </div>
  );
}

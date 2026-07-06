import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { looksGarbled } from "@/lib/ocr";
import { toast } from "sonner";
import api from "@/lib/api";
import { useLang } from "@/lib/i18n";

const STRUCTURES = [
  { id: "word", labelKey: "preview_structure_word" },
  { id: "sentence", labelKey: "preview_structure_sentence" },
  { id: "paragraph", labelKey: "preview_structure_paragraph" },
];

export default function PreviewPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [garbled, setGarbled] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [languageSplit, setLanguageSplit] = useState(null);
  const [analysisSource, setAnalysisSource] = useState(null);
  const [segmenting, setSegmenting] = useState(false);
  const [segmentCount, setSegmentCount] = useState(null);
  const [contentStructure, setContentStructure] = useState(null);
  const [splitHint, setSplitHint] = useState(false);
  const analyzeTimer = useRef(null);

  const isManualText = sessionStorage.getItem("text_source") === "manual";

  useEffect(() => {
    const stored = sessionStorage.getItem("ocr_text") || "";
    setText(stored);
    setGarbled(isManualText ? false : looksGarbled(stored));
    setTitle(sessionStorage.getItem("material_title") || "Adventure " + new Date().toLocaleDateString());
    setContentStructure(sessionStorage.getItem("content_structure") || null);
    const prevCount = sessionStorage.getItem("segment_count");
    if (prevCount) setSegmentCount(parseInt(prevCount, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length > 40 && !/[\n\r]/.test(trimmed) && !contentStructure && !segmenting) {
      setSplitHint(true);
    } else {
      setSplitHint(false);
    }
  }, [text, contentStructure, segmenting]);

  useEffect(() => {
    if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      setConcepts([]);
      setLanguageSplit(null);
      return;
    }
    analyzeTimer.current = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const trackType = sessionStorage.getItem("mode") || "quiz";
        const { data } = await api.post("/materials/analyze-key-concepts", {
          text: trimmed,
          track_type: trackType,
        });
        setConcepts(data.key_concepts || []);
        setLanguageSplit(data.language_split || null);
        setAnalysisSource(data.source || null);
      } catch {
        setConcepts([]);
      } finally {
        setAnalyzing(false);
      }
    }, 900);
    return () => { if (analyzeTimer.current) clearTimeout(analyzeTimer.current); };
  }, [text]);

  const assignFlow = sessionStorage.getItem("assign_flow");

  const applyStructure = async (structure) => {
    const trimmed = text.trim();
    if (trimmed.length < 4) {
      toast.error(t("preview_need_more"));
      return;
    }
    sfx.click();
    setSegmenting(true);
    setContentStructure(structure);
    try {
      const { data } = await api.post("/materials/segment", { text: trimmed, structure });
      const formatted = data.formatted_text || trimmed;
      setText(formatted);
      setGarbled(false);
      setSegmentCount(data.count || 0);
      sessionStorage.setItem("content_structure", structure);
      sessionStorage.setItem("segment_count", String(data.count || 0));
      toast.success(t("preview_segment_done", { count: data.count || 0 }));
    } catch {
      toast.error(t("preview_split_fail"));
    } finally {
      setSegmenting(false);
    }
  };

  const proceed = () => {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      toast.error(t("preview_need_more"));
      return;
    }
    sfx.click();
    sessionStorage.setItem("ocr_text", trimmed);
    sessionStorage.setItem("material_title", title || "Adventure");
    if (contentStructure) sessionStorage.setItem("content_structure", contentStructure);
    if (concepts.length) {
      sessionStorage.setItem("key_concepts_preview", JSON.stringify(concepts));
    } else {
      sessionStorage.removeItem("key_concepts_preview");
    }
    navigate("/mode");
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white" data-testid="preview-page">
      <Particles count={14} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => navigate(-1)} className="text-sky-200/70 hover:text-white text-sm mb-6" data-testid="back-btn">← {t("back")}</button>
        <h1 className="font-display text-4xl font-bold">
          {assignFlow ? t("preview_title_assign") : t("preview_title")}
        </h1>
        <p className="text-sky-100/70 mt-2">
          {assignFlow ? t("preview_sub_assign") : t("preview_sub")}
        </p>

        {garbled && (
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100" data-testid="ocr-garbled-warning">
            <strong>{t("preview_garbled_title")}</strong> {t("preview_garbled_body")}
          </div>
        )}

        {splitHint && (
          <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3 text-sm text-sky-100 flex flex-wrap items-center gap-2" data-testid="split-suggest-banner">
            <span>{t("preview_split_suggest")}</span>
            <Button size="sm" variant="outline" className="rounded-xl border-sky-300/40" onClick={() => applyStructure("word")} disabled={segmenting}>
              {t("preview_structure_word")}
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-indigo-500/10 border border-indigo-400/25 p-4" data-testid="content-structure-panel">
          <div className="text-sm font-bold text-indigo-100 mb-3">{t("preview_structure_label")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STRUCTURES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={segmenting}
                onClick={() => applyStructure(s.id)}
                className={`rounded-xl p-3 text-left border transition-colors ${
                  contentStructure === s.id
                    ? "bg-indigo-500/30 border-indigo-300/60"
                    : "bg-black/20 border-white/10 hover:border-indigo-300/40"
                }`}
                data-testid={`structure-${s.id}`}
              >
                <div className="font-bold text-sm">{t(s.labelKey)}</div>
              </button>
            ))}
          </div>
          {segmenting && <p className="text-xs text-indigo-200/80 mt-2 animate-pulse">{t("preview_segmenting")}</p>}
          {segmentCount != null && !segmenting && (
            <p className="text-xs text-indigo-200/70 mt-2">{t("preview_segment_done", { count: segmentCount })}</p>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-sky-100/70">{t("preview_title_label")}</label>
            <Input
              data-testid="material-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white rounded-2xl py-6"
            />
          </div>
          <div>
            <label className="text-sm text-sky-100/70">{t("preview_text_label", { count: text.length })}</label>
            <Textarea
              data-testid="ocr-text-area"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!isManualText) setGarbled(looksGarbled(e.target.value));
                setSegmentCount(null);
              }}
              className="mt-2 bg-white/10 border-white/20 text-white rounded-2xl min-h-[260px] font-mono text-sm leading-relaxed"
            />
          </div>
        </div>

        {(analyzing || concepts.length > 0 || languageSplit?.mixed) && (
          <div className="mt-6 rounded-3xl bg-indigo-500/10 border border-indigo-400/30 p-5" data-testid="key-concepts-panel">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-lg font-bold">🔑 {t("preview_key_concepts")}</h2>
              {analyzing && <span className="text-xs text-indigo-200/80 animate-pulse">{t("preview_analyzing")}</span>}
              {!analyzing && analysisSource && (
                <span className="text-xs text-indigo-200/60">{analysisSource === "gemini" ? "AI" : "Quick scan"}</span>
              )}
            </div>
            {languageSplit?.mixed && (
              <p className="text-xs text-sky-200/80 mb-3">
                {t("preview_mixed_lang", { zh: languageSplit.zh_count, en: languageSplit.en_count })}
              </p>
            )}
            {!analyzing && concepts.length === 0 && text.trim().length >= 20 && (
              <p className="text-sm text-white/60">{t("preview_no_concepts")}</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {concepts.slice(0, 12).map((c) => (
                <div key={c.concept_id} className="rounded-2xl bg-black/30 border border-white/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-amber-200 truncate">{c.exact_term}</div>
                      {c.simplified_explanation && (
                        <div className="text-xs text-white/70 mt-1 line-clamp-2">{c.simplified_explanation}</div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs rounded-lg bg-white/10 px-2 py-1">
                      {c.presentation_emoji || "🎮"} {c.language?.toUpperCase() || "?"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          data-testid="continue-mode-btn"
          onClick={proceed}
          className="btn-tactile w-full mt-6 rounded-2xl py-7 text-lg font-display font-bold uppercase tracking-wider bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 shadow-[0_8px_0_rgba(180,83,9,0.8)]"
        >
          {assignFlow ? t("preview_continue_assign") : t("preview_continue")}
        </Button>
      </div>
    </div>
  );
}

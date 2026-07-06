import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ASSETS, Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { toast } from "sonner";
import { OCR_LANGS, recognizeSmart, looksGarbled, fetchOcrQuota } from "@/lib/ocr";
import { cleanOcrText, storeCleanedOcr, storeManualText } from "@/lib/ocrClean";
import { enableKidMode } from "@/lib/kidMode";
import { useLang } from "@/lib/i18n";
import { loadBattleSnapshot, continueBattleFromUpload, clearBattleSnapshot } from "@/lib/battleSnapshot";
import { KidPageShell } from "@/components/KidBottomNav";
import api, { BACKEND_URL } from "@/lib/api";

const UPLOAD_LANG_KEYS = ["auto", "eng", "zh_trad", "zh_simp"];
const DEFAULT_MAX_FILES = 3;
const DOC_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOC_ICONS = { pdf: "📕", docx: "📘", pptx: "📙", doc: "📘", ppt: "📙" };

// On a Capacitor-wrapped native app, use the native Camera plugin (real OS
// camera UI, proper permission prompts) instead of the HTML <input capture>
// fallback, which only opens a bare webview camera sheet. Browser preview
// (npm start / plain web deploy) keeps using the <input> fallback below.
async function captureNativePhoto() {
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });
  const res = await fetch(photo.webPath);
  const blob = await res.blob();
  const ext = photo.format || "jpeg";
  return new File([blob], `capture-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` });
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [docs, setDocs] = useState([]); // [{file, name, kind}] — PDF/Word/PowerPoint, no OCR needed
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [ocrLang, setOcrLang] = useState("auto");
  const [ocrSource, setOcrSource] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [quota, setQuota] = useState(null);
  const [caps, setCaps] = useState(null);
  const [docLimits, setDocLimits] = useState(null);
  const [savedBattle, setSavedBattle] = useState(null);
  const assignFlow = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("assign_flow") : null;

  const maxFiles = docLimits?.max_files || DEFAULT_MAX_FILES;
  const totalItems = files.length + docs.length;
  const isKidHub = !assignFlow;

  useEffect(() => {
    setSavedBattle(loadBattleSnapshot());
    if (isKidHub) enableKidMode();
  }, [isKidHub]);

  const navigateAfterOcr = () => {
    if (assignFlow) {
      navigate("/preview");
      return;
    }
    if (sessionStorage.getItem("quick_battle") === "1") {
      sessionStorage.setItem("mode", sessionStorage.getItem("mode") || "quiz");
      sessionStorage.setItem("material_title", sessionStorage.getItem("material_title") || "Quick Battle");
      navigate("/transform");
      return;
    }
    navigate("/preview");
  };

  const finishWithText = async (rawText) => {
    setPhase(t("upload_phase_clean"));
    setProgress(88);
    const cleanResult = await cleanOcrText(rawText);
    setPhase(t("upload_phase_almost"));
    setProgress(96);
    storeCleanedOcr(rawText, cleanResult);
    sessionStorage.setItem("material_title", sessionStorage.getItem("material_title") || "Adventure " + new Date().toLocaleDateString());
    navigateAfterOcr();
  };

  const continueSavedBattle = () => {
    sfx.click();
    if (!continueBattleFromUpload()) {
      toast.error(t("upload_saved_expired"));
      setSavedBattle(null);
      return;
    }
    navigate("/battle");
  };

  const startFreshInstead = () => {
    sfx.click();
    clearBattleSnapshot();
    setSavedBattle(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const [q, c, dl] = await Promise.all([
          fetchOcrQuota(),
          api.get("/ocr/capabilities"),
          api.get("/documents/limits").catch(() => null),
        ]);
        setQuota(q);
        setCaps(c.data);
        if (dl) setDocLimits(dl.data);
      } catch {
        /* optional UI */
      }
    })();
  }, []);

  const skipToManual = async () => {
    sfx.click();
    const raw = manualText.trim();
    if (raw.length < 4) return;
    setScanning(true);
    setPhase(t("upload_phase_save"));
    setProgress(90);
    sessionStorage.setItem("ocr_count", "0");
    sessionStorage.setItem("ocr_lang", ocrLang);
    sessionStorage.setItem("ocr_source", "manual");
    try {
      // Typed/pasted text isn't OCR output — skip the "clean up scan artifacts"
      // step entirely (it was previously mislabeling correct, hand-typed text
      // as "low confidence" and confusing kids/parents who never touched a
      // camera).
      storeManualText(raw);
      sessionStorage.setItem("material_title", sessionStorage.getItem("material_title") || "Adventure " + new Date().toLocaleDateString());
      navigateAfterOcr();
    } finally {
      setScanning(false);
    }
  };

  const addFiles = (list) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    // `files` state already holds wrapped {file, url, name} objects from
    // previous calls — re-running URL.createObjectURL() on those (instead of
    // only on newly-picked raw File objects) is what caused "Overload
    // resolution failed" the moment a 2nd photo was added.
    const room = Math.max(0, maxFiles - docs.length - files.length);
    if (arr.length && files.length + docs.length + arr.length > maxFiles) {
      toast.warning(`Max ${maxFiles} items per upload (photos + documents combined)`);
    }
    const accepted = arr.slice(0, room);
    if (!accepted.length) return;
    setFiles((prev) => [...prev, ...accepted.map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }))]);
  };

  const docKindOf = (filename) => {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    return DOC_ICONS[ext] ? ext : "pdf";
  };

  const addDocs = (list) => {
    const maxSizeMb = docLimits?.max_file_size_mb || 20;
    const incoming = Array.from(list);
    const tooBig = incoming.filter((f) => f.size / (1024 * 1024) > maxSizeMb);
    if (tooBig.length) {
      toast.error(`${tooBig.length === 1 ? "That file is" : "Some files are"} over the ${maxSizeMb}MB limit and won't be added`);
    }
    const ok = incoming.filter((f) => f.size / (1024 * 1024) <= maxSizeMb);
    const room = Math.max(0, maxFiles - files.length - docs.length);
    if (ok.length > room) {
      toast.warning(`Max ${maxFiles} items per upload (photos + documents combined)`);
    }
    const accepted = ok.slice(0, room);
    if (!accepted.length) return;
    setDocs((prev) => [...prev, ...accepted.map((f) => ({ file: f, name: f.name, kind: docKindOf(f.name) }))]);
  };

  const onPick = (e) => addFiles(e.target.files);
  const onCamera = (e) => addFiles(e.target.files);
  const onDocPick = (e) => { addDocs(e.target.files); e.target.value = ""; };
  const onDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    const imgs = dropped.filter((f) => f.type.startsWith("image/"));
    const rest = dropped.filter((f) => !f.type.startsWith("image/"));
    if (imgs.length) addFiles(imgs);
    if (rest.length) addDocs(rest);
  };
  const removeAt = (i) => setFiles(files.filter((_, idx) => idx !== i));
  const removeDocAt = (i) => setDocs(docs.filter((_, idx) => idx !== i));

  const onTakePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const file = await captureNativePhoto();
      addFiles([file]);
    } catch (e) {
      // User cancelled the native camera sheet — not an error worth surfacing.
      if (String(e?.message || e).toLowerCase().includes("cancel")) return;
      console.error(e);
      toast.error("Couldn't open the camera. Check camera permission in Settings.");
    }
  };

  const startScan = async () => {
    if (files.length === 0 && docs.length === 0) {
      toast.error("Add at least one photo or document first");
      return;
    }
    sfx.magic();
    setScanning(true);
    setPhase(t("upload_phase_prep"));
    setProgress(2);
    try {
      let combined = "";
      let lastSource = "";
      let quotaHit = false;
      let rateLimited = false;
      const totalSteps = files.length + docs.length;

      for (let i = 0; i < docs.length; i++) {
        setPhase(t("upload_phase_doc", { n: i + 1, total: docs.length }));
        setProgress(Math.round((i / totalSteps) * 100));
        const form = new FormData();
        form.append("file", docs[i].file);
        try {
          const r = await api.post("/documents/extract", form, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
          });
          combined += (r.data.text || "") + "\n\n";
          lastSource = r.data.source || lastSource;
          if (r.data.truncated) {
            toast.warning(
              `"${docs[i].name}" has ${r.data.total_pages} pages — only read the first ${r.data.pages_used} ` +
              `(${docLimits?.subscription_tier === "premium" ? "premium" : "free"} cap). Split it up or upgrade for a higher limit.`
            );
          }
        } catch (err) {
          const detail = err.response?.data?.detail;
          toast.error(typeof detail === "string" ? detail : `Couldn't read "${docs[i].name}"`);
        }
      }

      for (let i = 0; i < files.length; i++) {
        setPhase(t("upload_phase_scan", { n: i + 1, total: files.length }));
        const result = await recognizeSmart(files[i].file, ocrLang, (p) => {
          setProgress(Math.round(((docs.length + i + p) / totalSteps) * 100));
        });
        lastSource = result.source;
        if (result.quotaExceeded) quotaHit = true;
        if (result.rateLimited) rateLimited = true;
        combined += (result.text || "") + "\n\n";
      }
      setOcrSource(lastSource);
      const text = combined.trim();
      sessionStorage.setItem("ocr_source", lastSource || "");
      sessionStorage.setItem("ocr_count", String(totalSteps));
      sessionStorage.setItem("ocr_lang", ocrLang);
      sfx.correct();
      if (docs.length > 0 && files.length === 0) {
        toast.success("Document text extracted — cleaning up…");
      } else if (["vision", "gemini", "gemini_byok"].includes(lastSource)) {
        toast.success("AI read your page — cleaning text…");
      } else if (lastSource === "tesseract") {
        if (quotaHit) {
          toast.warning("Daily AI scan limit reached — using basic OCR. Paste text or ask a parent about premium.");
        } else if (rateLimited) {
          toast.warning("AI servers busy — using basic OCR. Try again later or paste text.");
        } else if (caps?.gemini || caps?.vision) {
          toast.info("Basic OCR used — we'll clean it up on the next step.");
        } else {
          toast.info("Basic OCR used — add Vision/Gemini keys in backend for slide photos.");
        }
      }
      try {
        setQuota(await fetchOcrQuota());
      } catch {
        /* ignore */
      }
      await finishWithText(text);
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || e);
      if (msg.includes("NETWORK") || msg.includes("Network") || msg.includes("fetch")) {
        toast.error(`Can't reach backend (${BACKEND_URL}). You can still paste text manually below.`);
      } else {
        toast.error("OCR failed. Try English-only mode, clearer photos, or type text manually.");
      }
    } finally {
      setScanning(false);
    }
  };

  const pageBody = (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white" data-testid="upload-page">
      <img src={ASSETS.cameraBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/95" />
      <Particles count={20} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button data-testid="back-btn" onClick={() => navigate(assignFlow ? (assignFlow === "teacher" ? "/teacher" : "/parent") : -1)} className="text-sky-200/70 hover:text-white text-sm mb-6">← Back</button>

        {savedBattle && !assignFlow && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-3xl border border-amber-400/35 bg-gradient-to-br from-amber-500/15 to-orange-900/20 p-5"
            data-testid="upload-resume-banner"
          >
            <div className="text-3xl mb-2">🔁</div>
            <h2 className="font-display text-lg font-bold">{t("upload_resume_title")}</h2>
            <p className="text-sm text-sky-100/70 mt-1">
              {t("upload_resume_body")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button
                data-testid="upload-continue-btn"
                onClick={continueSavedBattle}
                className="flex-1 rounded-xl py-5 font-display font-bold bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900"
              >
                ▶️ {t("upload_continue")}
              </Button>
              <Button
                data-testid="upload-start-new-btn"
                variant="outline"
                onClick={startFreshInstead}
                className="flex-1 rounded-xl py-5 border-white/25 text-white hover:bg-white/10"
              >
                ✨ {t("upload_start_new")}
              </Button>
            </div>
          </motion.div>
        )}

        <h1 className="font-display text-4xl font-bold">
          {assignFlow === "parent" ? `📋 ${t("upload_assign_parent")}` : assignFlow === "teacher" ? `📋 ${t("upload_assign_teacher")}` : `📸 ${t("upload_magic_camera")}`}
        </h1>
        <p className="text-sky-100/70 mt-2">
          {assignFlow
            ? t("preview_sub_assign")
            : <>{t("upload_sub", { max: maxFiles })}{" "}
          {!assignFlow && docLimits?.subscription_tier !== "premium" && (
            <> <button type="button" className="underline text-amber-200/80 hover:text-amber-100" onClick={() => navigate("/settings")}>{t("upload_premium_link")}</button> {t("upload_premium_suffix")}</>
          )}</>}
        </p>

        <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur border border-white/15 p-3">
          <div className="text-xs uppercase tracking-widest text-sky-100/60 mb-2 px-1">{t("upload_reading_lang")}</div>
          <div className="flex gap-2" role="radiogroup" aria-label="OCR language">
            {UPLOAD_LANG_KEYS.map((key) => {
              const meta = OCR_LANGS[key];
              return (
              <button
                key={key}
                data-testid={`ocr-lang-${key}`}
                onClick={() => { sfx.click(); setOcrLang(key); }}
                aria-checked={ocrLang === key}
                role="radio"
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                  ocrLang === key
                    ? "bg-amber-400 text-slate-900 shadow-[0_3px_0_rgba(180,83,9,0.7)]"
                    : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10"
                }`}
              >{meta.label}</button>
            );})}
          </div>
          <p className="text-[11px] text-sky-100/50 mt-2 px-1">
            {caps?.gemini || caps?.vision ? (
              <>{t("upload_ai_on")}
                {quota?.daily_limit != null && (
                  <> {t("upload_scans_today", { used: quota.daily_remaining ?? 0, limit: quota.daily_limit })}</>
                )}</>
            ) : (
              <>{t("upload_ai_off")}{" "}
                <button type="button" className="underline text-amber-200/80" onClick={() => setShowManual(true)}>
                  {t("upload_manual_toggle")}
                </button>.</>
            )}
          </p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="mt-6 rounded-3xl border-2 border-dashed border-amber-300/40 bg-white/5 backdrop-blur-md p-6 sm:p-8 text-center animate-glow-pulse"
        >
          {files.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-2xl bg-slate-800/40 border border-white/10 overflow-hidden flex items-center justify-center">
                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                  <button
                    data-testid={`remove-file-${i}-btn`}
                    onClick={() => removeAt(i)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-400"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {docs.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-4" data-testid="doc-list">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-800/60 border border-white/15 px-3 py-2 text-sm">
                  <span className="text-lg">{DOC_ICONS[d.kind] || "📄"}</span>
                  <span className="max-w-[160px] truncate">{d.name}</span>
                  <button
                    data-testid={`remove-doc-${i}-btn`}
                    onClick={() => removeDocAt(i)}
                    className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-400 flex items-center justify-center"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {totalItems === 0 && (
            <div className="flex flex-col items-center justify-center py-6 mb-2 text-white/30">
              <span className="text-4xl">＋</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              data-testid="camera-capture-btn"
              onClick={onTakePhoto}
              disabled={totalItems >= maxFiles}
              className="btn-tactile rounded-2xl px-6 py-5 bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 font-display font-bold shadow-[0_6px_0_rgba(30,64,175,0.7)] disabled:opacity-40"
            >
              📷 {t("upload_take_photo")}
            </Button>
            <Button
              data-testid="upload-files-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={totalItems >= maxFiles}
              className="btn-tactile rounded-2xl px-6 py-5 bg-gradient-to-b from-violet-400 to-purple-600 hover:from-violet-300 hover:to-purple-500 font-display font-bold shadow-[0_6px_0_rgba(91,33,182,0.7)] disabled:opacity-40"
            >
              🖼️ {t("upload_images")}
            </Button>
            <Button
              data-testid="upload-docs-btn"
              onClick={() => docInputRef.current?.click()}
              disabled={totalItems >= maxFiles}
              className="btn-tactile rounded-2xl px-6 py-5 bg-gradient-to-b from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500 font-display font-bold shadow-[0_6px_0_rgba(15,118,110,0.7)] disabled:opacity-40"
            >
              📄 {t("upload_document")}
            </Button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple={false} className="hidden" onChange={onCamera} data-testid="camera-input" />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} data-testid="files-input" />
          <input ref={docInputRef} type="file" accept={DOC_ACCEPT} multiple className="hidden" onChange={onDocPick} data-testid="docs-input" />

          <p className="mt-6 text-xs text-sky-100/50">
            {t("upload_drop_hint", {
              count: totalItems,
              max: maxFiles,
              pages: docLimits?.max_pages_per_file ?? 15,
              mb: docLimits?.max_file_size_mb ?? 20,
            })}
          </p>
        </div>

        <Button
          data-testid="scan-btn"
          onClick={startScan}
          disabled={scanning || totalItems === 0}
          className="btn-tactile w-full mt-6 rounded-2xl py-7 text-lg font-display font-bold uppercase tracking-wider bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 shadow-[0_8px_0_rgba(180,83,9,0.8)] disabled:opacity-60"
        >
          {scanning ? t("upload_scanning") : `✨ ${t("upload_start_scan")}`}
        </Button>

        <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
          <button
            type="button"
            data-testid="toggle-manual-text-btn"
            onClick={() => setShowManual((v) => !v)}
            className="text-sm text-sky-200/80 hover:text-white"
          >
            {showManual ? t("upload_manual_hide") : t("upload_manual_toggle")}
          </button>
          {showManual && (
            <div className="mt-3 space-y-3">
              <textarea
                data-testid="manual-text-input"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={t("upload_manual_placeholder")}
                className="w-full min-h-[120px] rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder:text-white/40"
              />
              <Button
                data-testid="manual-continue-btn"
                onClick={skipToManual}
                disabled={manualText.trim().length < 4}
                className="w-full rounded-xl bg-white/15 hover:bg-white/25"
              >
                {t("upload_manual_continue")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur flex items-center justify-center"
          >
            <div className="text-center max-w-md px-6">
              <div className="text-6xl mb-4 animate-rune-spin inline-block">📜</div>
              <p className="font-display text-2xl mb-2" data-testid="scan-phase">{phase || "掃描中…"}</p>
              <p className="text-sky-100/50 text-sm mb-4">{t("upload_overlay_sub")}</p>
              <Progress value={progress} className="h-3" data-testid="scan-progress" />
              <p className="text-sky-100/60 mt-2 text-sm">{progress}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return isKidHub ? <KidPageShell>{pageBody}</KidPageShell> : pageBody;
}

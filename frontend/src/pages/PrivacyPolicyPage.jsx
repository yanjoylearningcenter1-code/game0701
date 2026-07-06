import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUiLang } from "@/lib/i18n";

/** Serves privacy policy markdown from /public/legal/ (EN authoritative, ZH reference). */
export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [err, setErr] = useState(false);
  const lang = getUiLang();
  const file = lang === "zh-HK" ? "privacy-policy-ZH.md" : "privacy-policy-EN.md";

  useEffect(() => {
    fetch(`/legal/${file}`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setText)
      .catch(() => setErr(true));
  }, [file]);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8" data-testid="privacy-policy-page">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-4 text-sky-200" onClick={() => navigate(-1)}>← Back</Button>
        {lang === "zh-HK" && (
          <p className="text-xs text-amber-200/80 mb-4">中文參考版本。如有歧異，以英文版本為準。</p>
        )}
        {err ? (
          <p className="text-amber-200">Privacy policy file not found. Add frontend/public/legal/{file}</p>
        ) : (
          <article className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sky-50/90 leading-relaxed">
            {text || "Loading…"}
          </article>
        )}
      </div>
    </div>
  );
}

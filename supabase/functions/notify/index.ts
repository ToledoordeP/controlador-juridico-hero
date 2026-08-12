// ============================================================
//  Edge Function: notify  (Fluxo Jurídico)
//  Recebe um POST do site e envia e-mail. A CHAVE fica em
//  segredo do Supabase (Deno.env) — NUNCA no frontend.
//
//  Suporta 2 provedores (escolhido por EMAIL_PROVIDER):
//   - "brevo"  → sem DNS, remetente único verificado (300/dia grátis)
//   - "resend" → requer domínio verificado (melhor entrega)
//
//  Secrets (Supabase → Edge Functions → Secrets):
//   EMAIL_PROVIDER = brevo            (ou resend)
//   BREVO_API_KEY  = xkeysib-...      (se brevo)
//   RESEND_API_KEY = re_...           (se resend)
//   FROM_EMAIL     = Fluxo Jurídico <remetente-verificado@exemplo.com>
//   ALLOWED_EMAILS = a,b,c,d          (lista de destinatários autorizados)
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PROVIDER = (Deno.env.get("EMAIL_PROVIDER") ||
  (Deno.env.get("BREVO_API_KEY") ? "brevo" : "resend")).toLowerCase();
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_RAW = Deno.env.get("FROM_EMAIL") || "Fluxo Jurídico <onboarding@resend.dev>";
const ALLOW = (Deno.env.get("ALLOWED_EMAILS") || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// "Nome <email@x.com>" → { name, email }
function parseFrom(raw: string) {
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1] || "Fluxo Jurídico", email: m[2].trim() };
  return { name: "Fluxo Jurídico", email: raw.trim() };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const esc = (s: string) =>
  String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const p = await req.json();

    let recipients: string[] = Array.isArray(p.recipients) ? p.recipients : [];
    recipients = recipients.map((e: string) => String(e).trim().toLowerCase()).filter((e) => e.includes("@"));
    if (ALLOW.length) recipients = recipients.filter((e) => ALLOW.includes(e));
    recipients = [...new Set(recipients)];
    if (!recipients.length) return json({ skipped: "sem destinatários autorizados" });

    const a = p.activity || {};
    const subject = (p.isNew ? "[Nova tarefa] " : "[Tarefa atualizada] ") + (a.titulo || "Tarefa");
    const from = parseFrom(FROM_RAW);

    const row = (k: string, v: string) =>
      v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;white-space:nowrap">${esc(k)}</td>
             <td style="padding:4px 0;color:#0f172a;font-size:13px"><b>${esc(v)}</b></td></tr>` : "";
    const change = p.change
      ? `<p style="margin:0 0 14px;padding:11px 13px;background:#eef2ff;border-left:3px solid #4F6EF7;border-radius:8px;color:#1e293b;font-size:13px;line-height:1.5">
           <b>${p.isNew ? "Nova tarefa atribuída a você." : "O que mudou:"}</b><br>${esc(p.change)}</p>` : "";
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;background:#fff">
      <div style="background:linear-gradient(135deg,#4F6EF7,#7B5EF8);color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
        <div style="font-size:11px;opacity:.85;letter-spacing:1px;font-weight:600">FLUXO JURÍDICO · HERO SEGUROS</div>
        <div style="font-size:19px;font-weight:700;margin-top:3px">${esc(subject)}</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:20px 22px">
        ${change}
        <table style="border-collapse:collapse">
          ${row("Tarefa", a.titulo)} ${row("Descrição", a.desc)} ${row("Responsável", a.responsaveis)}
          ${row("Revisor", a.autorizador)} ${row("Prazo", a.prazo)} ${row("Prioridade", a.prioridade)} ${row("Status", a.status)}
        </table>
        <a href="${esc(p.link || "#")}" style="display:inline-block;margin-top:18px;background:#4F6EF7;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">Abrir o Fluxo Jurídico</a>
        <p style="margin:16px 0 0;color:#94a3b8;font-size:11px">Você recebeu este aviso porque está envolvido nesta tarefa${a.autor ? ` · ação de ${esc(a.autor)}` : ""}.</p>
      </div>
    </div>`;

    if (PROVIDER === "brevo") {
      if (!BREVO_API_KEY) return json({ error: "BREVO_API_KEY não configurada" }, 500);
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify({
          sender: { name: from.name, email: from.email },
          to: recipients.map((e) => ({ email: e })),
          subject, htmlContent: html,
        }),
      });
      const data = await r.json().catch(() => ({}));
      return json({ ok: r.ok, provider: "brevo", sent: recipients.length, data }, r.ok ? 200 : 502);
    }

    // resend
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não configurada" }, 500);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_RAW, to: recipients, subject, html }),
    });
    const data = await r.json().catch(() => ({}));
    return json({ ok: r.ok, provider: "resend", sent: recipients.length, data }, r.ok ? 200 : 502);
  } catch (e) {
    return json({ error: String(e) }, 400);
  }
});

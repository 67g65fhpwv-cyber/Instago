// api/claim.js — fonction serverless Vercel
// Rattache un Pass Illimité payé (session Stripe) au compte Supabase de la personne connectée.
// Un paiement ne peut être rattaché qu'à un seul compte.
//
// Variables d'environnement requises (Vercel > Settings > Environment Variables) :
//   STRIPE_SECRET_KEY            clé Stripe (idéalement restreinte, lecture seule sur Checkout Sessions)
//   SUPABASE_URL                 ex. https://abcdefgh.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    clé secrète Supabase (service_role) — ne JAMAIS la mettre dans index.html

const PASS_MIN_AMOUNT = 2400; // en centimes : prix du Pass Illimité (24,00 €). À modifier si tu changes le prix.

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const sbUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeKey || !sbUrl || !sbKey) {
    return res.status(500).json({ ok: false, error: "config" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const sessionId = String((body && body.session_id) || "");
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
    return res.status(400).json({ ok: false, error: "bad_session" });
  }

  const auth = String((req.headers && req.headers.authorization) || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ ok: false, error: "auth" });
  }

  // En-têtes pour parler à Supabase avec la clé secrète (compatible ancien et nouveau format de clé)
  const sbHeaders = { apikey: sbKey };
  if (sbKey.startsWith("eyJ")) sbHeaders.Authorization = "Bearer " + sbKey;

  try {
    // 1. Qui est connecté ? (Supabase vérifie le jeton)
    const u = await fetch(sbUrl + "/auth/v1/user", {
      headers: { apikey: sbKey, Authorization: "Bearer " + token },
    });
    if (!u.ok) {
      return res.status(401).json({ ok: false, error: "auth" });
    }
    const user = await u.json();
    if (!user || !user.id) {
      return res.status(401).json({ ok: false, error: "auth" });
    }

    // 2. Cette session Stripe est-elle bien un Pass Illimité payé ?
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + sessionId, {
      headers: { Authorization: "Bearer " + stripeKey },
    });
    if (r.status === 404) {
      return res.status(403).json({ ok: false, error: "not_a_paid_pass" });
    }
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: "stripe_" + r.status });
    }
    const s = await r.json();
    const isPass =
      s.mode === "payment" &&
      s.payment_status === "paid" &&
      s.currency === "eur" &&
      s.amount_subtotal >= PASS_MIN_AMOUNT;
    if (!isPass) {
      return res.status(403).json({ ok: false, error: "not_a_paid_pass" });
    }

    // 3. Déjà rattachée ?
    const q = await fetch(
      sbUrl + "/rest/v1/passes?session_id=eq." + sessionId + "&select=user_id",
      { headers: sbHeaders }
    );
    if (!q.ok) {
      return res.status(502).json({ ok: false, error: "db" });
    }
    const rows = await q.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].user_id === user.id
        ? res.status(200).json({ ok: true })
        : res.status(409).json({ ok: false, error: "already_claimed" });
    }

    // 4. On rattache le pass au compte
    const email = user.email || (s.customer_details && s.customer_details.email) || null;
    const ins = await fetch(sbUrl + "/rest/v1/passes", {
      method: "POST",
      headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ session_id: sessionId, user_id: user.id, email }),
    });
    if (ins.ok) {
      return res.status(200).json({ ok: true });
    }
    if (ins.status === 409) {
      return res.status(409).json({ ok: false, error: "already_claimed" });
    }
    return res.status(502).json({ ok: false, error: "db" });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "network" });
  }
};

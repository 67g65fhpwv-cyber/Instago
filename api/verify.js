// api/verify.js — fonction serverless Vercel
// Vérifie auprès de Stripe qu'un Pass Illimité InstaCheck (24 €, paiement unique) a bien été payé.
// Variable d'environnement requise (Vercel > Settings > Environment Variables) : STRIPE_SECRET_KEY
// (idéalement une clé restreinte "rk_live_..." avec lecture seule sur Checkout Sessions)

const PASS_MIN_AMOUNT = 2400; // en centimes : prix du Pass Illimité (24,00 €). À modifier si tu changes le prix.

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ active: false });
  }

  const id = String((req.query && req.query.session_id) || "");
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) {
    return res.status(400).json({ active: false });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(500).json({ active: false, error: "config" });
  }

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + id, {
      headers: { Authorization: "Bearer " + key },
    });

    if (r.status === 404) {
      return res.status(200).json({ active: false });
    }
    if (!r.ok) {
      return res.status(502).json({ active: false, error: "stripe_" + r.status });
    }

    const s = await r.json();
    let active = false;
    let kind = null;

    if (s.mode === "payment" && s.payment_status === "paid") {
      active = true;
      // On distingue le Pass (24 €) de l'analyse à 3 € : un paiement à 3 € ne doit pas débloquer le Pass.
      kind = s.currency === "eur" && s.amount_subtotal >= PASS_MIN_AMOUNT ? "pass" : "single";
    }

    return res.status(200).json({ active, kind });
  } catch (e) {
    return res.status(502).json({ active: false, error: "network" });
  }
};

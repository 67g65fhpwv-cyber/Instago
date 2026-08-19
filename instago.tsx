import { useState, useEffect } from "react";

const WHOP_URL = "https://whop.com/instago/";
const PRICE = "4€";

// Détecte si l'utilisateur revient de Whop après paiement
const urlParams = new URLSearchParams(window.location.search);
const PAID = urlParams.get("unlocked") === "true";

const FAKE_USERS = [
  "enzo_ple", "lea.music", "hugo_fit33", "clara.vbs", "nath_rn",
  "sam.dz_75", "ines_mtl", "alex.prk", "mona_lsb", "yass_kng",
  "lili.rose", "kev_bmx", "maya.art", "theo_drm", "zoe.phtg",
  "lucas_gym", "jade.skn", "noe_bnr", "emma.rvl", "adam_snp",
];

const ANALYSIS_STEPS = [
  "Connexion au profil…", "Analyse de la bio…", "Scan de la photo de profil…",
  "Évaluation du feed…", "Analyse des hashtags…", "Calcul du score d'engagement…",
  "Génération des recommandations…",
];

function generateAnalysis(username) {
  const seed = username.length + username.charCodeAt(0);
  const pick = (arr, offset = 0) => arr[(seed + offset) % arr.length];
  const bioScore = pick([3,4,5,6,7]);
  const feedScore = pick([2,3,4,5,6],1);
  const engagementScore = pick([1,2,3,4,5],2);
  const profilePicScore = pick([4,5,6,7,8],3);
  const globalScore = Math.round(((bioScore+feedScore+engagementScore+profilePicScore)/40)*100);
  return {
    username, globalScore,
    categories: [
      { name:"Bio", score:bioScore, max:10, icon:"✏️",
        problem: pick(["Ta bio ne dit rien sur toi — les gens ne savent pas qui tu es","Tu n'as aucun lien dans ta bio pour rediriger les gens","Ta bio est trop longue, personne ne la lit en entier","Ta bio n'a pas d'émojis — elle ressemble à un CV","Ta bio ne donne pas envie de te follow"]),
        tip: pick(["Mets une phrase courte qui dit qui tu es + un émoji + un lien","Écris en 3 lignes max : ce que tu fais, pourquoi te follow, un lien","Ajoute un émoji au début de chaque ligne pour que ça attire l'œil","Regarde les bios des gros comptes de ta niche et inspire-toi","Ta bio doit répondre à « pourquoi je devrais te follow » en 3 secondes"],4),
      },
      { name:"Photo de profil", score:profilePicScore, max:10, icon:"📸",
        problem: pick(["Ta photo est trop sombre, on ne te voit pas bien","Ta photo n'attire pas l'œil quand elle est toute petite","Le fond de ta photo est trop chargé, ça fait brouillon","Ta photo fait pas pro — elle a l'air prise à l'arrache"],1),
        tip: pick(["Prends une photo avec un fond uni et de la lumière naturelle","Zoome sur ton visage — il faut qu'on te reconnaisse même en petit","Mets une couleur vive en fond pour que ta photo ressorte dans le feed","Regarde droit dans l'appareil et souris — ça inspire confiance"],5),
      },
      { name:"Feed", score:feedScore, max:10, icon:"🎨",
        problem: pick(["Ton feed n'a aucune identité visuelle — on dirait un album photo random","Tu postes trop de selfies et pas assez de contenu varié","La qualité de tes photos change tout le temps — ça fait pas sérieux","Tu ne fais pas de carrousels — c'est le format qui marche le mieux","Tes descriptions sont trop courtes, tu perds de la visibilité"],2),
        tip: pick(["Choisis 2-3 couleurs et utilise-les partout pour que ton feed soit reconnaissable","Alterne entre selfies, plans larges et textes — ça garde l'intérêt","Utilise la même appli de retouche avec les mêmes réglages à chaque fois","Fais au moins 1 carrousel par semaine — c'est ce qu'Instagram met le plus en avant","Écris au moins 3-4 lignes en description avec une question à la fin"],6),
      },
      { name:"Engagement", score:engagementScore, max:10, icon:"🔥",
        problem: pick(["Tu ne réponds pas aux commentaires — les gens arrêtent de commenter","Tu postes aux mauvaises heures — personne ne voit tes posts","Tu n'utilises pas assez les Stories — c'est là que se crée le lien","Tes hashtags sont trop gros (#love, #instagood) — tu es invisible dessus","Tu ne fais pas de Reels — tu rates 80% de la visibilité gratuite"],3),
        tip: pick(["Réponds à TOUS les commentaires dans la première heure après ton post","Poste entre 18h et 21h en semaine — c'est quand ton audience est là","Fais 3 à 5 Stories par jour pour rester en haut du fil de tes abonnés","Utilise des hashtags moyens (10k-500k posts) liés à ta niche","Fais 3 Reels par semaine minimum — même courts, c'est le format roi"],7),
      },
    ],
  };
}

function SocialProofToast({ user, visible }) {
  return (
    <div style={{
      position:"fixed", bottom: visible ? 16 : -80, left:"50%", transform:"translateX(-50%)",
      background:"#1a1a2e", border:"1px solid #27273a", borderRadius:12,
      padding:"10px 18px", display:"flex", alignItems:"center", gap:10,
      zIndex:100, transition:"bottom 0.5s cubic-bezier(.4,0,.2,1)",
      boxShadow:"0 8px 32px rgba(0,0,0,0.5)", maxWidth:"90vw",
    }}>
      <div style={{
        width:32, height:32, borderRadius:16,
        background:"linear-gradient(135deg, #6366f1, #ec4899)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:14, fontWeight:700, color:"#fff", flexShrink:0,
      }}>{user.charAt(0).toUpperCase()}</div>
      <div>
        <p style={{ margin:0, fontSize:13, color:"#fff", fontWeight:600 }}>@{user}</p>
        <p style={{ margin:0, fontSize:11, color:"#71717a" }}>analyse son profil en ce moment</p>
      </div>
      <div style={{ width:8, height:8, borderRadius:4, background:"#22c55e", flexShrink:0, animation:"blink 1.5s ease infinite" }} />
      <style>{`@keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
    </div>
  );
}

function ScoreRing({ score, size=130 }) {
  const radius=(size-12)/2; const circ=2*Math.PI*radius;
  const offset=circ-(score/100)*circ;
  const color=score>=60?"#22c55e":score>=35?"#f59e0b":"#ef4444";
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1e1e2e" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1.5s ease" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size*0.32, fontWeight:800, color:"#fff", lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:size*0.12, color:"#888", fontWeight:500, marginTop:2 }}>/100</span>
      </div>
    </div>
  );
}

function CategoryCard({ cat, blurred }) {
  const pct=(cat.score/cat.max)*100;
  const barColor=pct>=60?"#22c55e":pct>=35?"#f59e0b":"#ef4444";
  return (
    <div style={{
      background:"#141420", borderRadius:14, padding:"18px 20px",
      filter: blurred?"blur(7px)":"none", userSelect: blurred?"none":"auto",
      pointerEvents: blurred?"none":"auto", transition:"filter 0.3s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:15, fontWeight:600, color:"#fff" }}>{cat.icon} {cat.name}</span>
        <span style={{ fontSize:14, fontWeight:700, color:barColor }}>{cat.score}/{cat.max}</span>
      </div>
      <div style={{ height:6, background:"#1e1e2e", borderRadius:3, overflow:"hidden", marginBottom:12 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:3, transition:"width 1s ease" }} />
      </div>
      <p style={{ fontSize:13, color:"#ef4444", margin:"0 0 8px", fontWeight:500, lineHeight:1.5 }}>⚠️ {cat.problem}</p>
      <p style={{ fontSize:13, color:"#a1a1aa", margin:0, lineHeight:1.5 }}>💡 {cat.tip}</p>
    </div>
  );
}

export default function InstaGo() {
  const savedUser = localStorage.getItem("instago_username") || "";
  const [step, setStep] = useState(PAID && savedUser ? "analyzing" : "landing");
  const [username, setUsername] = useState(savedUser);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const [paid, setPaid] = useState(PAID);
  const [toastUser, setToastUser] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (step !== "landing") return;
    let i=0;
    const show = () => { setToastUser(FAKE_USERS[i%FAKE_USERS.length]); setToastVisible(true); setTimeout(()=>setToastVisible(false),3000); i++; };
    show(); const interval=setInterval(show,5500);
    return ()=>clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step==="analyzing" && analysisStep<ANALYSIS_STEPS.length) {
      const t=setTimeout(()=>setAnalysisStep(s=>s+1),600+Math.random()*800); return ()=>clearTimeout(t);
    }
    if (step==="analyzing" && analysisStep>=ANALYSIS_STEPS.length) { setAnalysis(generateAnalysis(username)); setStep("results"); }
  }, [step, analysisStep, username]);

  useEffect(() => {
    if (step==="results" && analysis && scoreAnimated<analysis.globalScore) {
      const t=setTimeout(()=>setScoreAnimated(s=>Math.min(s+2,analysis.globalScore)),20); return ()=>clearTimeout(t);
    }
  }, [step, analysis, scoreAnimated]);

  const startAnalysis = () => { if(username.trim()){ setAnalysisStep(0); setScoreAnimated(0); setStep("analyzing"); } };
  const reset = () => { setStep("landing"); setUsername(""); setAnalysis(null); setScoreAnimated(0); };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a12", color:"#fff", fontFamily:"'Inter', -apple-system, system-ui, sans-serif" }}>

      {step==="landing" && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px", textAlign:"center" }}>
          <SocialProofToast user={toastUser} visible={toastVisible} />
          <div style={{ display:"inline-flex", background:"linear-gradient(135deg, #6366f1, #a855f7, #ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", fontSize:40, fontWeight:900, letterSpacing:-1.5, marginBottom:28 }}>InstaGo</div>
          <h1 style={{ fontSize:26, fontWeight:800, lineHeight:1.25, margin:"0 0 14px", maxWidth:380, letterSpacing:-0.5 }}>
            Ton profil Instagram<br/>
            <span style={{ background:"linear-gradient(135deg, #6366f1, #ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>repousse les gens ?</span>
          </h1>
          <p style={{ color:"#71717a", fontSize:15, margin:"0 0 36px", maxWidth:340, lineHeight:1.55 }}>
            On scan ton profil en 30 secondes et on te dit exactement quoi changer pour exploser sur Insta.
          </p>
          <div style={{ display:"flex", alignItems:"center", background:"#141420", borderRadius:14, padding:5, width:"100%", maxWidth:380, boxSizing:"border-box", border:"1px solid #27273a" }}>
            <span style={{ padding:"0 10px", fontSize:18, color:"#71717a" }}>@</span>
            <input value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g,""))} onKeyDown={e=>{ if(e.key==="Enter") startAnalysis(); }} placeholder="ton_pseudo"
              style={{ flex:1, background:"none", border:"none", outline:"none", color:"#fff", fontSize:16, padding:"14px 0", fontFamily:"inherit" }} />
            <button onClick={startAnalysis} style={{ background:"linear-gradient(135deg, #6366f1, #a855f7, #ec4899)", border:"none", borderRadius:10, color:"#fff", padding:"12px 22px", fontSize:14, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Analyser</button>
          </div>
          <div style={{ display:"flex", gap:20, marginTop:36, color:"#52525b", fontSize:13, flexWrap:"wrap", justifyContent:"center" }}>
            <span>⚡ 30 sec</span><span>🔒 100% privé</span><span>📊 Score détaillé</span>
          </div>
          <div style={{ marginTop:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {[
              { initials:"EZ", grad:"linear-gradient(135deg,#6366f1,#a855f7)" },
              { initials:"LM", grad:"linear-gradient(135deg,#ec4899,#f43f5e)" },
              { initials:"HF", grad:"linear-gradient(135deg,#f59e0b,#ef4444)" },
              { initials:"CV", grad:"linear-gradient(135deg,#10b981,#06b6d4)" },
              { initials:"NR", grad:"linear-gradient(135deg,#3b82f6,#6366f1)" },
            ].map((a,i)=>(
              <div key={i} style={{
                width:36, height:36, borderRadius:18,
                background:a.grad,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700, color:"#fff", letterSpacing:0.3,
                marginLeft:i>0?-8:0, border:"2px solid #0a0a12",
                boxShadow:"0 2px 8px rgba(0,0,0,0.4)",
              }}>{a.initials}</div>
            ))}
            <span style={{ color:"#71717a", fontSize:12, marginLeft:12 }}>+2.4k analyses aujourd'hui</span>
          </div>
        </div>
      )}

      {step==="analyzing" && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
          <div style={{ width:64, height:64, borderRadius:32, background:"linear-gradient(135deg, #6366f1, #ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:28, animation:"pulse 1.5s ease infinite" }}>🔍</div>
          <p style={{ fontSize:15, color:"#a1a1aa", marginBottom:32 }}>Analyse de <strong style={{ color:"#fff" }}>@{username}</strong></p>
          <div style={{ width:"100%", maxWidth:320, display:"flex", flexDirection:"column", gap:10 }}>
            {ANALYSIS_STEPS.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, opacity:i<=analysisStep?1:0.25, transition:"opacity 0.4s" }}>
                <div style={{ width:22, height:22, borderRadius:11, flexShrink:0, background:i<analysisStep?"#22c55e":i===analysisStep?"#6366f1":"#1e1e2e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", transition:"background 0.3s" }}>{i<analysisStep?"✓":""}</div>
                <span style={{ fontSize:14, color:i<analysisStep?"#22c55e":i===analysisStep?"#fff":"#52525b" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:36, height:4, width:200, background:"#1e1e2e", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg, #6366f1, #ec4899)", width:`${(analysisStep/ANALYSIS_STEPS.length)*100}%`, transition:"width 0.5s ease", borderRadius:2 }} />
          </div>
          <style>{`@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }`}</style>
        </div>
      )}

      {step==="results" && analysis && (
        <div style={{ maxWidth:440, margin:"0 auto", padding:"40px 20px 60px" }}>
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ display:"inline-flex", background:"linear-gradient(135deg, #6366f1, #a855f7, #ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", fontSize:24, fontWeight:900 }}>InstaGo</div>
            <p style={{ color:"#71717a", fontSize:14, margin:"8px 0 0" }}>Résultats pour <strong style={{ color:"#fff" }}>@{analysis.username}</strong></p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:32 }}>
            <ScoreRing score={scoreAnimated} />
            <p style={{ marginTop:14, fontSize:15, fontWeight:600, color:"#fff" }}>
              {analysis.globalScore>=60?"Pas mal ! Mais tu peux faire beaucoup mieux 💪":analysis.globalScore>=35?"Ton profil a besoin de changements 😬":"Ton profil fait fuir les gens 💀"}
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:12 }}>
            <CategoryCard cat={analysis.categories[0]} blurred={false} />
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {analysis.categories.slice(1).map((cat,i)=>(<CategoryCard key={i} cat={cat} blurred={true} />))}
            </div>
            <div style={{
              position:"absolute", inset:0, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", zIndex:10,
              background:"linear-gradient(to bottom, rgba(10,10,18,0) 0%, rgba(10,10,18,0.92) 25%)", borderRadius:14,
            }}>
              <div style={{ fontSize:44, marginBottom:14 }}>🔒</div>
              <p style={{ fontSize:17, fontWeight:700, margin:"0 0 6px" }}>3 catégories masquées</p>
              <p style={{ fontSize:13, color:"#71717a", margin:"0 0 22px", textAlign:"center", maxWidth:260, lineHeight:1.5 }}>
                Débloque ton analyse complète + ton plan d'action pour devenir viral
              </p>
              <a href={WHOP_URL} target="_blank" rel="noopener noreferrer" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:"linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
                border:"none", borderRadius:12, color:"#fff", padding:"14px 36px",
                fontSize:16, fontWeight:700, cursor:"pointer", textDecoration:"none",
              }}>Débloquer — {PRICE}</a>
              <p style={{ fontSize:11, color:"#52525b", margin:"10px 0 0" }}>Paiement sécurisé via Whop</p>
            </div>
          </div>
          <div style={{ marginTop:40, background:"#141420", borderRadius:14, padding:20, textAlign:"center", border:"1px solid #27273a" }}>
            <p style={{ fontSize:14, color:"#a1a1aa", margin:"0 0 10px" }}>Analyse un autre profil</p>
            <button onClick={reset} style={{ background:"none", border:"1px solid #27273a", borderRadius:10, color:"#fff", padding:"10px 24px", fontSize:14, fontWeight:600, cursor:"pointer" }}>Nouvelle analyse</button>
          </div>
        </div>
      )}
    </div>
  );
}

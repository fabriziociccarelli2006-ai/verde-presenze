import { useState, useEffect } from “react”;
import { initializeApp } from “firebase/app”;
import { getFirestore, doc, setDoc, getDoc } from “firebase/firestore”;

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
apiKey: “AIzaSyD0RO_rDY2yJ5XeakfoOAUf08zdydE1n68”,
authDomain: “presenze-verde.firebaseapp.com”,
projectId: “presenze-verde”,
storageBucket: “presenze-verde.firebasestorage.app”,
messagingSenderId: “985438306308”,
appId: “1:985438306308:web:09c013882f4a5a673db551”,
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BOSS_PASSWORD = “capo2024”;

const WORKERS = [
“Coran”, “Hassan”, “Gianni”, “Italo”, “Fabrizio”, “Luana”, “Massimiliano”
];

const SITES = [
“Frascati - Centro Fisico Nucleare”,
“Assergi - Centro Fisico Nucleare”,
“Distributori Enel”,
“Comune di Celano”,
“Scuola di Ortucchio”,
“Parco Velino Silente”,
“Giardino Villa del Corvo”,
“Altro…”,
];

const TIME_SLOTS = [];
for (let h = 5; h <= 20; h++) {
TIME_SLOTS.push(`${String(h).padStart(2,"0")}:00`);
TIME_SLOTS.push(`${String(h).padStart(2,"0")}:30`);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calcHours(entry, exit) {
if (!entry || !exit) return 0;
const [eh, em] = entry.split(”:”).map(Number);
const [xh, xm] = exit.split(”:”).map(Number);
return Math.max(0, (xh * 60 + xm - (eh * 60 + em)) / 60);
}
function today() { return new Date().toISOString().slice(0, 10); }
function weekKey(d) {
const dt = new Date(d); const day = dt.getDay() || 7;
const mon = new Date(dt); mon.setDate(dt.getDate() - day + 1);
return mon.toISOString().slice(0, 10);
}
function monthKey(d) { return d.slice(0, 7); }
function formatDate(d) {
return new Date(d + “T12:00:00”).toLocaleDateString(“it-IT”, { weekday:“short”, day:“2-digit”, month:“2-digit” });
}

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
async function loadRecords() {
try {
const ref = doc(db, “greenservice”, “presenze”);
const snap = await getDoc(ref);
return snap.exists() ? snap.data().records : [];
} catch(e) { console.error(“Load error:”, e); return []; }
}
async function saveRecords(records) {
try {
const ref = doc(db, “greenservice”, “presenze”);
await setDoc(ref, { records });
} catch(e) { console.error(“Save error:”, e); }
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportExcel(records, label) {
const rows = [[“Data”,“Operaio”,“Ingresso”,“Uscita”,“Ore”,“Giornate”,“Cantiere”]];
records.forEach(r => {
const h = r.exit ? calcHours(r.entry, r.exit) : 0;
rows.push([r.date, r.worker, r.entry||””, r.exit||””, h.toFixed(1), r.exit?“1”:“0”, r.site||””]);
});
const csv = rows.map(r => r.map(c => `"${c}"`).join(”,”)).join(”\n”);
const blob = new Blob([”\uFEFF”+csv], { type:“text/csv;charset=utf-8;” });
const a = document.createElement(“a”); a.href = URL.createObjectURL(blob);
a.download = `GreenService_${label}.csv`; a.click();
}

function exportPDF(records, label) {
// Group by worker for summary
const summary = {};
WORKERS.forEach(w => { summary[w] = { hours: 0, days: 0 }; });
records.forEach(r => {
if (!summary[r.worker]) summary[r.worker] = { hours: 0, days: 0 };
if (r.exit) {
summary[r.worker].hours += calcHours(r.entry, r.exit);
summary[r.worker].days += 1;
}
});

const detailRows = records.map(r => {
const h = r.exit ? calcHours(r.entry, r.exit) : 0;
return `<tr> <td>${new Date(r.date+"T12:00:00").toLocaleDateString("it-IT")}</td> <td><b>${r.worker}</b></td> <td>${r.entry||"—"}</td> <td>${r.exit||"—"}</td> <td style="color:#2D5A27;font-weight:700">${h>0?h.toFixed(1)+"h":"—"}</td> <td style="text-align:center">${r.exit?"✅":"—"}</td> <td style="font-size:11px;color:#666">${r.site||"—"}</td> </tr>`;
}).join(””);

const summaryRows = Object.entries(summary).map(([name, data]) =>
`<tr><td><b>${name}</b></td><td style="color:#2D5A27;font-weight:700">${data.hours.toFixed(1)}h</td><td style="font-weight:700">${data.days} gg</td></tr>`
).join(””);

const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">

  <title>Green Service — ${label}</title>
  <style>
    body{font-family:Georgia,serif;padding:32px;color:#2A3828;max-width:900px;margin:0 auto}
    h1{color:#2D5A27;font-size:28px;margin-bottom:4px}
    h2{color:#2D5A27;font-size:16px;margin:24px 0 10px}
    .sub{color:#888;font-size:13px;margin-bottom:28px}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#2D5A27;color:white;padding:8px 10px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase}
    td{padding:7px 10px;border-bottom:1px solid #E8DFD0;font-size:13px}
    tr:nth-child(even){background:#faf7f2}
    .footer{margin-top:24px;font-size:11px;color:#aaa;text-align:right}
    .logo{font-size:40px;margin-bottom:8px}
  </style></head><body>
  <div class="logo">🌳</div>
  <h1>Green Service</h1>
  <div class="sub">Riepilogo presenze — ${label} — Stampato il ${new Date().toLocaleDateString("it-IT")}</div>

  <h2>📊 Riepilogo per operaio</h2>
  <table><thead><tr><th>Operaio</th><th>Ore totali</th><th>Giornate</th></tr></thead>
  <tbody>${summaryRows}</tbody></table>

  <h2>📋 Dettaglio presenze</h2>
  <table><thead><tr><th>Data</th><th>Operaio</th><th>Ingresso</th><th>Uscita</th><th>Ore</th><th>Giornata</th><th>Cantiere</th></tr></thead>
  <tbody>${detailRows}</tbody></table>
  <div class="footer">Green Service — documento generato automaticamente</div>
  </body></html>`;

const blob = new Blob([html], { type:“text/html” });
const a = document.createElement(“a”); a.href = URL.createObjectURL(blob);
a.download = `GreenService_${label}.html`; a.click();
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url(‘https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap’);
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
–cream:#F5F0E8;–panna:#FBF8F2;–beige:#E8DFD0;
–green:#2D5A27;–green2:#3D7A35;–green3:#5A9E50;–sage:#8FAF8A;
–text:#2A3828;–muted:#7A8C77;–border:#D4C9B5;–white:#FEFCF8;
–red:#E74C3C;–yellow:#F39C12;
}
body{font-family:‘DM Sans’,sans-serif;background:var(–cream);color:var(–text);min-height:100vh}

/* HEADER */
.header{background:var(–green);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.header-logo{font-family:‘Playfair Display’,serif;font-weight:900;font-size:20px;color:var(–panna);display:flex;align-items:center;gap:10px}
.header-badge{background:rgba(255,255,255,.15);color:var(–panna);font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:1.5px;text-transform:uppercase;border:1px solid rgba(255,255,255,.2)}
.logout-btn{background:transparent;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.7);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:12px;font-family:‘DM Sans’,sans-serif;transition:all .2s}
.logout-btn:hover{background:rgba(255,255,255,.1);color:white}

/* LOGIN */
.login-wrap{min-height:100vh;background:linear-gradient(160deg,#EAE4D8 0%,#F5F0E8 50%,#E8F0E6 100%);display:flex;align-items:center;justify-content:center;padding:20px}
.login-card{background:var(–white);border:1px solid var(–border);border-radius:16px;padding:48px 40px;width:100%;max-width:400px;box-shadow:0 8px 40px rgba(45,90,39,.10);position:relative;overflow:hidden}
.login-card::before{content:’’;position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(–green),var(–green3),var(–sage));border-radius:16px 16px 0 0}
.brand-icon{font-size:56px;text-align:center;margin-bottom:16px;display:block}
.login-title{font-family:‘Playfair Display’,serif;font-weight:900;font-size:32px;text-align:center;color:var(–green);margin-bottom:6px}
.login-sub{text-align:center;color:var(–muted);font-size:14px;margin-bottom:32px}
label{display:block;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(–muted);margin-bottom:6px}
.field{margin-bottom:20px}
input[type=password]{width:100%;background:var(–panna);border:1.5px solid var(–border);color:var(–text);padding:13px 16px;border-radius:8px;font-family:‘DM Sans’,sans-serif;font-size:16px;outline:none;transition:border-color .2s}
input[type=password]:focus{border-color:var(–green)}
.btn-primary{width:100%;background:linear-gradient(135deg,var(–green),var(–green2));color:white;border:none;padding:14px;font-family:‘DM Sans’,sans-serif;font-size:15px;font-weight:600;cursor:pointer;border-radius:8px;transition:all .2s;box-shadow:0 4px 14px rgba(45,90,39,.25)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(45,90,39,.3)}
.error-msg{background:#FDF0EE;border:1.5px solid #E07060;color:#C0392B;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}

/* MAIN PANEL */
.main{padding:20px;max-width:1100px;margin:0 auto}
.page-title{font-family:‘Playfair Display’,serif;font-weight:900;font-size:26px;color:var(–green);margin-bottom:4px}
.page-date{color:var(–muted);font-size:13px;margin-bottom:24px}

/* TABS */
.tabs{display:flex;gap:8px;margin-bottom:24px;border-bottom:2px solid var(–border);padding-bottom:0}
.tab{padding:10px 20px;border:none;background:transparent;font-family:‘DM Sans’,sans-serif;font-size:14px;font-weight:600;color:var(–muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s}
.tab.active{color:var(–green);border-bottom-color:var(–green)}
.tab:hover{color:var(–green)}

/* WORKER CARDS */
.workers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:24px}
.worker-card{background:var(–white);border:1.5px solid var(–border);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(45,90,39,.05)}
.worker-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(45,90,39,.12);border-color:var(–green)}
.worker-card.active-card{border-color:var(–green);background:#F0F7EE}
.worker-name{font-family:‘Playfair Display’,serif;font-weight:700;font-size:17px;color:var(–green);margin-bottom:8px}
.worker-status{display:flex;align-items:center;gap:6px;font-size:12px;color:var(–muted);margin-bottom:10px}
.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot-green{background:#2ECC71;box-shadow:0 0 6px #2ECC71}
.dot-orange{background:var(–yellow)}
.dot-gray{background:#ccc}
.worker-stats{display:flex;gap:12px}
.wstat{text-align:center}
.wstat-num{font-family:‘Playfair Display’,serif;font-size:20px;font-weight:900;color:var(–green);line-height:1}
.wstat-label{font-size:10px;color:var(–muted);text-transform:uppercase;letter-spacing:.5px}

/* SEGNA PRESENZA */
.presence-form{background:var(–white);border:1.5px solid var(–border);border-radius:12px;padding:24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(45,90,39,.06)}
.form-title{font-family:‘Playfair Display’,serif;font-weight:700;font-size:20px;color:var(–green);margin-bottom:20px;display:flex;align-items:center;gap:10px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
select,input[type=text],input[type=date]{width:100%;background:var(–panna);border:1.5px solid var(–border);color:var(–text);padding:10px 14px;border-radius:8px;font-family:‘DM Sans’,sans-serif;font-size:14px;outline:none;transition:border-color .2s;appearance:none}
select:focus,input:focus{border-color:var(–green)}
.btn-green{background:var(–green);color:white;border:none;padding:11px 20px;border-radius:8px;cursor:pointer;font-family:‘DM Sans’,sans-serif;font-size:14px;font-weight:600;transition:all .2s}
.btn-green:hover{background:var(–green2)}
.btn-red{background:#FDF0EE;color:var(–red);border:1px solid #f0c0b0;padding:11px 20px;border-radius:8px;cursor:pointer;font-family:‘DM Sans’,sans-serif;font-size:14px;font-weight:600;transition:all .2s}
.btn-yellow{background:#FEF9EC;color:#B8860B;border:1px solid #f0d890;padding:11px 20px;border-radius:8px;cursor:pointer;font-family:‘DM Sans’,sans-serif;font-size:14px;font-weight:600;transition:all .2s}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}

/* SEGNA TUTTI */
.tutti-card{background:linear-gradient(135deg,var(–green),var(–green2));border-radius:12px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.tutti-text{color:white}
.tutti-title{font-family:‘Playfair Display’,serif;font-size:18px;font-weight:700;margin-bottom:4px}
.tutti-sub{font-size:13px;opacity:.8}
.btn-white{background:white;color:var(–green);border:none;padding:11px 20px;border-radius:8px;cursor:pointer;font-family:‘DM Sans’,sans-serif;font-size:14px;font-weight:700;transition:all .2s;white-space:nowrap}
.btn-white:hover{background:var(–panna)}

/* RIEPILOGO */
.summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.summary-card{background:var(–white);border:1.5px solid var(–border);border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(45,90,39,.05)}
.sum-name{font-size:11px;color:var(–muted);font-weight:600;text-transform:uppercase;margin-bottom:8px}
.sum-hours{font-family:‘Playfair Display’,serif;font-size:32px;font-weight:900;color:var(–green);line-height:1}
.sum-days{font-size:12px;color:var(–muted);margin-top:4px}

/* TABLE */
.table-wrap{background:var(–white);border:1.5px solid var(–border);border-radius:12px;overflow:hidden;overflow-x:auto;box-shadow:0 2px 8px rgba(45,90,39,.05)}
.rtable{width:100%;border-collapse:collapse}
.rtable th{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(–muted);padding:10px;text-align:left;background:var(–panna);border-bottom:1.5px solid var(–border)}
.rtable td{padding:9px 10px;font-size:13px;border-bottom:1px solid var(–beige)}
.rtable tr:last-child td{border-bottom:none}
.rtable tr:hover td{background:#F7F4EE}
.pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.pill-green{background:#EEF6EC;color:var(–green)}
.pill-yellow{background:#FEF9EC;color:#B8860B}
.pill-gray{background:var(–beige);color:var(–muted)}

/* SETTIMANALE */
.week-grid{overflow-x:auto}
.week-table{border-collapse:collapse;width:100%;min-width:600px}
.week-table th{background:var(–green);color:white;padding:10px 8px;font-size:12px;font-weight:600;text-align:center;border:1px solid rgba(255,255,255,.1)}
.week-table td{padding:8px;border:1px solid var(–border);text-align:center;font-size:12px;vertical-align:middle;background:var(–white)}
.week-table .worker-col{text-align:left;font-weight:600;background:var(–panna);padding:8px 12px}
.day-cell-done{background:#EEF6EC!important;color:var(–green);font-weight:600}
.day-cell-partial{background:#FEF9EC!important;color:#B8860B}
.day-cell-absent{color:#ccc}

/* FILTRI */
.filter-row{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:flex-end}
.filter-row .field{margin-bottom:0;flex:1;min-width:140px}
.export-btns{display:flex;gap:8px}

/* SECTION LABEL */
.section-label{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(–muted);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-label::after{content:’’;flex:1;height:1px;background:var(–border)}

.no-records{text-align:center;padding:40px;color:var(–muted);font-size:14px}
.success-msg{background:#EEF6EC;border:1.5px solid var(–green3);color:var(–green);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
.error-msg2{background:#FDF0EE;border:1.5px solid #E07060;color:#C0392B;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}

@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.main{animation:fadeUp .3s ease}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.workers-grid{grid-template-columns:1fr 1fr}.summary-grid{grid-template-columns:1fr 1fr}.main{padding:14px}}
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
const [loggedIn, setLoggedIn] = useState(false);
const [records, setRecords]   = useState([]);
const [loading, setLoading]   = useState(true);

useEffect(() => { loadRecords().then(r => { setRecords(r); setLoading(false); }); }, []);
async function updateRecords(r) { setRecords(r); await saveRecords(r); }

if (loading) return (
<div style={{minHeight:“100vh”,display:“flex”,alignItems:“center”,justifyContent:“center”,background:”#F5F0E8”,color:”#7A8C77”,fontFamily:“DM Sans,sans-serif”,flexDirection:“column”,gap:12}}>
<style>{css}</style><span style={{fontSize:40}}>🌿</span><span>Caricamento…</span>
</div>
);

return (
<div>
<style>{css}</style>
{!loggedIn
? <LoginScreen onLogin={() => setLoggedIn(true)} />
: <BossPanel records={records} updateRecords={updateRecords} onLogout={() => setLoggedIn(false)} />
}
</div>
);
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
const [pass, setPass]   = useState(””);
const [error, setError] = useState(””);

function handle() {
if (pass === BOSS_PASSWORD) { setError(””); onLogin(); }
else setError(“Password non corretta.”);
}

return (
<div className="login-wrap">
<div className="login-card">
<span className="brand-icon">🌳</span>
<div className="login-title">Green Service</div>
<div className="login-sub">Pannello presenze — accesso riservato</div>
{error && <div className="error-msg">⚠️ {error}</div>}
<div className="field">
<label>Password</label>
<input type=“password” placeholder=”••••••••” value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key===“Enter”&&handle()} autoFocus />
</div>
<button className="btn-primary" onClick={handle}>🔑 Accedi</button>
</div>
</div>
);
}

// ─── BOSS PANEL ───────────────────────────────────────────────────────────────
function BossPanel({ records, updateRecords, onLogout }) {
const [tab, setTab]           = useState(“oggi”);
const [msg, setMsg]           = useState({ type:””, text:”” });
const [selectedWorker, setSelectedWorker] = useState(null);
const [entryTime, setEntryTime] = useState(””);
const [exitTime, setExitTime]   = useState(””);
const [site, setSite]           = useState(””);
const [customSite, setCustomSite] = useState(””);
const [presDate, setPresDate]   = useState(today());
const [editingId, setEditingId] = useState(null);
const [editData, setEditData]   = useState({});
const [filterWorker, setFilter] = useState(“all”);
const [filterMonth, setFilterMonth] = useState(monthKey(today()));
const [tuttiOrario, setTuttiOrario] = useState(””);
const [tuttiSite, setTuttiSite]     = useState(””);
const [showTutti, setShowTutti]     = useState(false);
const todayStr = today();

function showMsg(type, text) { setMsg({type, text}); setTimeout(()=>setMsg({type:””,text:””}), 3000); }

// Stato operaio oggi
function getWorkerToday(name) {
return records.find(r => r.worker===name && r.date===todayStr);
}

// Ore e giornate per periodo
function getStats(name, period=“month”) {
const filtered = records.filter(r => {
if (r.worker!==name || !r.exit) return false;
if (period===“month”) return monthKey(r.date)===monthKey(todayStr);
if (period===“week”)  return weekKey(r.date)===weekKey(todayStr);
return true;
});
return {
hours: filtered.reduce((s,r)=>s+calcHours(r.entry,r.exit),0),
days: filtered.length
};
}

// Segna presenza
async function segnIngresso() {
if (!selectedWorker) { showMsg(“error”,“Seleziona un operaio.”); return; }
if (!entryTime) { showMsg(“error”,“Seleziona l’orario.”); return; }
const finalSite = site===“Altro…”?customSite.trim():site;
if (!finalSite) { showMsg(“error”,“Seleziona il cantiere.”); return; }
const existing = records.find(r=>r.worker===selectedWorker&&r.date===presDate);
if (existing?.entry) { showMsg(“error”,`${selectedWorker} ha già l'ingresso segnato per questa data.`); return; }
const newRec = { id:Date.now(), worker:selectedWorker, date:presDate, entry:entryTime, exit:null, site:finalSite };
await updateRecords([…records, newRec]);
showMsg(“success”,`✅ Ingresso ${selectedWorker} segnato alle ${entryTime}`);
setEntryTime(””); setSite(””); setCustomSite(””);
}

async function segnUscita() {
if (!selectedWorker) { showMsg(“error”,“Seleziona un operaio.”); return; }
if (!exitTime) { showMsg(“error”,“Seleziona l’orario.”); return; }
const rec = records.find(r=>r.worker===selectedWorker&&r.date===presDate);
if (!rec) { showMsg(“error”,`${selectedWorker} non ha l'ingresso segnato per questa data.`); return; }
if (rec.exit) { showMsg(“error”,`${selectedWorker} ha già l'uscita segnata.`); return; }
await updateRecords(records.map(r=>r.id===rec.id?{…r,exit:exitTime}:r));
showMsg(“success”,`✅ Uscita ${selectedWorker} segnata alle ${exitTime}`);
setExitTime(””);
}

// Segna tutti
async function segnaTutti() {
if (!tuttiOrario) { showMsg(“error”,“Seleziona l’orario per tutti.”); return; }
const finalSite = tuttiSite===“Altro…”?customSite.trim():tuttiSite;
if (!finalSite) { showMsg(“error”,“Seleziona il cantiere.”); return; }
const newRecs = […records];
WORKERS.forEach(w => {
const existing = newRecs.find(r=>r.worker===w&&r.date===todayStr);
if (!existing) {
newRecs.push({ id:Date.now()+Math.random(), worker:w, date:todayStr, entry:tuttiOrario, exit:null, site:finalSite });
}
});
await updateRecords(newRecs);
showMsg(“success”,`✅ Ingresso segnato per tutti alle ${tuttiOrario}`);
setTuttiOrario(””); setTuttiSite(””); setShowTutti(false);
}

// Elimina
async function deleteRecord(id) {
if (!window.confirm(“Vuoi eliminare questa presenza?”)) return;
await updateRecords(records.filter(r=>r.id!==id));
}

// Edit
function startEdit(r) {
setEditingId(r.id);
setEditData({date:r.date,worker:r.worker,entry:r.entry||””,exit:r.exit||””,site:r.site||””});
}
async function saveEdit(id) {
await updateRecords(records.map(r=>r.id===id?{…r,…editData}:r));
setEditingId(null);
}

// Filtered records for table
const filteredRecords = records
.filter(r => {
if (filterWorker!==“all” && r.worker!==filterWorker) return false;
if (filterMonth && monthKey(r.date)!==filterMonth) return false;
return true;
})
.sort((a,b)=>b.date.localeCompare(a.date));

// Week days for weekly view
const weekStart = new Date(weekKey(todayStr)+“T12:00:00”);
const weekDays = Array.from({length:7}, (_,i) => {
const d = new Date(weekStart); d.setDate(weekStart.getDate()+i);
return d.toISOString().slice(0,10);
});

const exportLabel = filterMonth || “tutto”;

return (
<div>
<div className="header">
<div className="header-logo">🌳 Green Service <span className="header-badge">CAPO</span></div>
<button className="logout-btn" onClick={onLogout}>Esci</button>
</div>
<div className="main">
<div className="page-title">Buongiorno! 👋</div>
<div className="page-date">{new Date().toLocaleDateString(“it-IT”,{weekday:“long”,day:“numeric”,month:“long”,year:“numeric”})}</div>

```
    {/* TABS */}
    <div className="tabs">
      {[["oggi","📋 Oggi"],["segna","✏️ Segna Presenza"],["riepilogo","📊 Riepilogo"],["settimana","📅 Settimana"]].map(([id,label])=>(
        <button key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{label}</button>
      ))}
    </div>

    {msg.text && <div className={msg.type==="error"?"error-msg2":"success-msg"}>{msg.text}</div>}

    {/* TAB OGGI */}
    {tab==="oggi" && (
      <>
        {/* Segna tutti */}
        <div className="tutti-card">
          <div className="tutti-text">
            <div className="tutti-title">⚡ Segna tutti entrati</div>
            <div className="tutti-sub">Usa quando arrivate tutti insieme allo stesso cantiere</div>
          </div>
          <button className="btn-white" onClick={()=>setShowTutti(!showTutti)}>
            {showTutti ? "Annulla" : "Segna tutti →"}
          </button>
        </div>

        {showTutti && (
          <div className="presence-form" style={{marginBottom:20}}>
            <div className="form-grid">
              <div className="field" style={{marginBottom:0}}>
                <label>Orario ingresso</label>
                <select value={tuttiOrario} onChange={e=>setTuttiOrario(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field" style={{marginBottom:0}}>
                <label>Cantiere</label>
                <select value={tuttiSite} onChange={e=>setTuttiSite(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {SITES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {tuttiSite==="Altro..." && (
              <div className="field" style={{marginTop:12,marginBottom:0}}>
                <label>Descrivi il lavoro</label>
                <input type="text" placeholder="Es: Potatura privata..." value={customSite} onChange={e=>setCustomSite(e.target.value)} />
              </div>
            )}
            <div className="btn-row">
              <button className="btn-green" onClick={segnaTutti}>✅ Conferma per tutti</button>
            </div>
          </div>
        )}

        {/* Carte operai */}
        <div className="section-label">Situazione operai oggi</div>
        <div className="workers-grid">
          {WORKERS.map(w => {
            const rec = getWorkerToday(w);
            const stats = getStats(w);
            const status = rec?.exit ? "done" : rec?.entry ? "working" : "absent";
            return (
              <div key={w} className="worker-card" onClick={()=>{setSelectedWorker(w);setTab("segna")}}>
                <div className="worker-name">{w}</div>
                <div className="worker-status">
                  <div className={`status-dot ${status==="done"?"dot-orange":status==="working"?"dot-green":"dot-gray"}`}></div>
                  <span>{status==="done"?`${rec.entry} → ${rec.exit}`:status==="working"?`Entrato ${rec.entry}`:"Non registrato"}</span>
                </div>
                <div className="worker-stats">
                  <div className="wstat">
                    <div className="wstat-num">{stats.hours.toFixed(1)}</div>
                    <div className="wstat-label">ore/mese</div>
                  </div>
                  <div className="wstat">
                    <div className="wstat-num">{stats.days}</div>
                    <div className="wstat-label">gg/mese</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}

    {/* TAB SEGNA */}
    {tab==="segna" && (
      <div className="presence-form">
        <div className="form-title">✏️ Segna Presenza</div>
        <div className="form-grid">
          <div className="field">
            <label>Operaio</label>
            <select value={selectedWorker||""} onChange={e=>setSelectedWorker(e.target.value)}>
              <option value="">— Seleziona operaio —</option>
              {WORKERS.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input type="date" value={presDate} onChange={e=>setPresDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Orario ingresso</label>
            <select value={entryTime} onChange={e=>setEntryTime(e.target.value)}>
              <option value="">— Seleziona —</option>
              {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Orario uscita</label>
            <select value={exitTime} onChange={e=>setExitTime(e.target.value)}>
              <option value="">— Seleziona —</option>
              {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{gridColumn:"1/-1"}}>
            <label>Cantiere</label>
            <select value={site} onChange={e=>setSite(e.target.value)}>
              <option value="">— Seleziona cantiere —</option>
              {SITES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {site==="Altro..." && (
            <div className="field" style={{gridColumn:"1/-1"}}>
              <label>Descrivi il lavoro</label>
              <input type="text" placeholder="Es: Potatura privata Via Roma 12..." value={customSite} onChange={e=>setCustomSite(e.target.value)} />
            </div>
          )}
        </div>
        <div className="btn-row">
          <button className="btn-green" onClick={segnIngresso}>🌅 Segna Ingresso</button>
          <button className="btn-yellow" onClick={segnUscita}>🌇 Segna Uscita</button>
        </div>
      </div>
    )}

    {/* TAB RIEPILOGO */}
    {tab==="riepilogo" && (
      <>
        {/* Filtri */}
        <div className="filter-row">
          <div className="field">
            <label>Mese</label>
            <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
              style={{padding:"10px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--panna)",fontFamily:"DM Sans,sans-serif",fontSize:14,outline:"none"}} />
          </div>
          <div className="field">
            <label>Operaio</label>
            <select value={filterWorker} onChange={e=>setFilter(e.target.value)}>
              <option value="all">Tutti</option>
              {WORKERS.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="export-btns">
            <button onClick={()=>exportExcel(filteredRecords,exportLabel)} style={{background:"#1D6F42",color:"white",border:"none",padding:"10px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>📊 Excel</button>
            <button onClick={()=>exportPDF(filteredRecords,exportLabel)} style={{background:"#C0392B",color:"white",border:"none",padding:"10px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>📄 PDF</button>
          </div>
        </div>

        {/* Riepilogo per operaio */}
        <div className="section-label">Ore e giornate — {filterMonth}</div>
        <div className="summary-grid">
          {(filterWorker==="all"?WORKERS:[filterWorker]).map(w => {
            const recs = records.filter(r=>r.worker===w&&r.exit&&monthKey(r.date)===filterMonth);
            const hours = recs.reduce((s,r)=>s+calcHours(r.entry,r.exit),0);
            const days = recs.length;
            return (
              <div className="summary-card" key={w}>
                <div className="sum-name">{w}</div>
                <div className="sum-hours">{hours.toFixed(1)}<span style={{fontSize:14,color:"var(--muted)",marginLeft:2}}>h</span></div>
                <div className="sum-days">{days} giornate</div>
              </div>
            );
          })}
        </div>

        {/* Tabella dettaglio */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div className="section-label" style={{marginBottom:0,flex:1}}>Dettaglio presenze</div>
          <button onClick={()=>{
            const nr={id:Date.now(),worker:WORKERS[0],date:today(),entry:"",exit:null,site:null};
            updateRecords([...records,nr]);
            startEdit(nr);
            setTab("riepilogo");
          }} style={{background:"var(--green)",color:"white",border:"none",padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,marginLeft:16}}>＋ Aggiungi</button>
        </div>
        <div className="table-wrap">
          {filteredRecords.length===0
            ? <div className="no-records">🌱 Nessuna presenza per questo periodo.</div>
            : <table className="rtable">
                <thead><tr>
                  <th>Data</th><th>Operaio</th><th>Ingresso</th><th>Uscita</th><th>Ore</th><th>Giornata</th><th>Cantiere</th><th>Stato</th><th>Azioni</th>
                </tr></thead>
                <tbody>
                  {filteredRecords.map(r => {
                    const h = r.exit?calcHours(r.entry,r.exit):null;
                    const isEdit = editingId===r.id;
                    return (
                      <tr key={r.id} style={{background:isEdit?"#F0F7EE":""}}>
                        <td>{isEdit
                          ? <input type="date" value={editData.date} onChange={e=>setEditData({...editData,date:e.target.value})} style={{fontSize:12,padding:"3px",border:"1px solid #ccc",borderRadius:3,width:120}} />
                          : <span style={{color:r.date===todayStr?"var(--green)":"var(--text)",fontWeight:r.date===todayStr?600:400}}>{formatDate(r.date)}</span>}
                        </td>
                        <td>{isEdit
                          ? <select value={editData.worker} onChange={e=>setEditData({...editData,worker:e.target.value})} style={{fontSize:12,padding:"3px"}}>{WORKERS.map(w=><option key={w} value={w}>{w}</option>)}</select>
                          : <b>{r.worker}</b>}
                        </td>
                        <td>{isEdit
                          ? <select value={editData.entry} onChange={e=>setEditData({...editData,entry:e.target.value})} style={{fontSize:12,padding:"3px"}}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select>
                          : r.entry||"—"}
                        </td>
                        <td>{isEdit
                          ? <select value={editData.exit} onChange={e=>setEditData({...editData,exit:e.target.value})} style={{fontSize:12,padding:"3px"}}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select>
                          : r.exit||"—"}
                        </td>
                        <td style={{fontFamily:"Playfair Display,serif",fontWeight:700,color:"var(--green)"}}>
                          {isEdit?(editData.entry&&editData.exit?`${calcHours(editData.entry,editData.exit).toFixed(1)}h`:"—"):(h!==null?`${h.toFixed(1)}h`:"—")}
                        </td>
                        <td style={{textAlign:"center"}}>{r.exit?"✅":"—"}</td>
                        <td>{isEdit
                          ? <select value={editData.site} onChange={e=>setEditData({...editData,site:e.target.value})} style={{fontSize:12,padding:"3px",maxWidth:140}}><option value="">—</option>{SITES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                          : <span style={{color:"var(--muted)",fontSize:12}}>{r.site||"—"}</span>}
                        </td>
                        <td>
                          {r.exit?<span className="pill pill-green">✅</span>:r.entry?<span className="pill pill-yellow">🌿</span>:<span className="pill pill-gray">—</span>}
                        </td>
                        <td>
                          {isEdit
                            ? <div style={{display:"flex",gap:4}}>
                                <button onClick={()=>saveEdit(r.id)} style={{background:"var(--green)",color:"white",border:"none",padding:"4px 8px",borderRadius:4,cursor:"pointer",fontSize:12}}>✅</button>
                                <button onClick={()=>setEditingId(null)} style={{background:"var(--beige)",border:"none",padding:"4px 8px",borderRadius:4,cursor:"pointer",fontSize:12}}>✖</button>
                              </div>
                            : <div style={{display:"flex",gap:4}}>
                                <button onClick={()=>startEdit(r)} style={{background:"var(--beige)",border:"none",padding:"4px 8px",borderRadius:4,cursor:"pointer",fontSize:13}}>✏️</button>
                                <button onClick={()=>deleteRecord(r.id)} style={{background:"#FDF0EE",border:"none",padding:"4px 8px",borderRadius:4,cursor:"pointer",fontSize:13}}>🗑️</button>
                              </div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
        </div>
      </>
    )}

    {/* TAB SETTIMANA */}
    {tab==="settimana" && (
      <>
        <div className="section-label">Vista settimanale — settimana corrente</div>
        <div className="week-grid">
          <table className="week-table">
            <thead>
              <tr>
                <th style={{textAlign:"left",padding:"10px 12px"}}>Operaio</th>
                {weekDays.map(d=>(
                  <th key={d}>
                    {new Date(d+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short"})}<br/>
                    <span style={{fontSize:11,opacity:.8}}>{new Date(d+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})}</span>
                  </th>
                ))}
                <th>Tot. h</th>
                <th>Gg</th>
              </tr>
            </thead>
            <tbody>
              {WORKERS.map(w => {
                const weekRecs = records.filter(r=>r.worker===w&&weekDays.includes(r.date));
                const totalH = weekRecs.filter(r=>r.exit).reduce((s,r)=>s+calcHours(r.entry,r.exit),0);
                const totalDays = weekRecs.filter(r=>r.exit).length;
                return (
                  <tr key={w}>
                    <td className="worker-col">{w}</td>
                    {weekDays.map(d => {
                      const rec = records.find(r=>r.worker===w&&r.date===d);
                      const h = rec?.exit?calcHours(rec.entry,rec.exit):null;
                      return (
                        <td key={d} className={rec?.exit?"day-cell-done":rec?.entry?"day-cell-partial":"day-cell-absent"}>
                          {rec?.exit ? `${h?.toFixed(1)}h` : rec?.entry ? "in lav." : "—"}
                        </td>
                      );
                    })}
                    <td style={{fontFamily:"Playfair Display,serif",fontWeight:700,color:"var(--green)"}}>{totalH.toFixed(1)}h</td>
                    <td style={{fontWeight:600}}>{totalDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>
</div>
```

);
}


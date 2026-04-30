import { useState, useEffect } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BOSS_PASSWORD = "capo2024";
const WORKERS = [
  { name: "Coran",         pin: "4827" },
  { name: "Hassan",        pin: "1593" },
  { name: "Gianni",        pin: "7364" },
  { name: "Italo",         pin: "2981" },
  { name: "Fabrizio",      pin: "6152" },
  { name: "Luana",         pin: "3748" },
  { name: "Massimiliano",  pin: "9036" },
];

const TIME_SLOTS = [];
for (let h = 5; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,"0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2,"0")}:30`);
}

function calcHours(entry, exit) {
  if (!entry || !exit) return 0;
  const [eh, em] = entry.split(":").map(Number);
  const [xh, xm] = exit.split(":").map(Number);
  return Math.max(0, (xh * 60 + xm - (eh * 60 + em)) / 60);
}
function today() { return new Date().toISOString().slice(0, 10); }
function weekKey(d) {
  const dt = new Date(d); const day = dt.getDay() || 7;
  const mon = new Date(dt); mon.setDate(dt.getDate() - day + 1);
  return mon.toISOString().slice(0, 10);
}
function monthKey(d) { return d.slice(0, 7); }

async function loadRecords() {
  try { const r = await window.storage.get("verde_presenze"); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveRecords(records) {
  try { await window.storage.set("verde_presenze", JSON.stringify(records)); } catch {}
}

// ─── DECORATIVE LEAVES ────────────────────────────────────────────────────────
const Leaf = ({ style }) => (
  <svg viewBox="0 0 60 80" style={{ position:"absolute", opacity:0.13, ...style }} fill="none">
    <path d="M30 75 C30 75 5 55 5 30 C5 10 20 2 30 2 C40 2 55 10 55 30 C55 55 30 75 30 75Z" fill="#2D5A27"/>
    <line x1="30" y1="75" x2="30" y2="2" stroke="#2D5A27" strokeWidth="1.5"/>
    <line x1="30" y1="30" x2="12" y2="18" stroke="#2D5A27" strokeWidth="1"/>
    <line x1="30" y1="40" x2="48" y2="28" stroke="#2D5A27" strokeWidth="1"/>
    <line x1="30" y1="50" x2="14" y2="40" stroke="#2D5A27" strokeWidth="1"/>
  </svg>
);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

:root {
  --cream:   #F5F0E8;
  --panna:   #FBF8F2;
  --beige:   #E8DFD0;
  --tan:     #C8B99A;
  --green:   #2D5A27;
  --green2:  #3D7A35;
  --green3:  #5A9E50;
  --sage:    #8FAF8A;
  --dark:    #1C2B1A;
  --text:    #2A3828;
  --muted:   #7A8C77;
  --border:  #D4C9B5;
  --white:   #FEFCF8;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--cream);
  color: var(--text);
  min-height: 100vh;
}

/* HEADER */
.header {
  background: var(--green);
  padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
  position: relative; overflow: hidden;
}
.header::after {
  content: '🌿';
  position: absolute; right: 80px; top: 50%; transform: translateY(-50%);
  font-size: 28px; opacity: 0.3;
}
.header-logo {
  font-family: 'Playfair Display', serif;
  font-weight: 900; font-size: 20px;
  color: var(--panna);
  display: flex; align-items: center; gap: 10px;
  letter-spacing: 0.5px;
}
.header-logo .dot { color: var(--sage); }
.header-badge {
  background: rgba(255,255,255,0.15);
  color: var(--panna);
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  padding: 3px 10px; border-radius: 20px;
  letter-spacing: 1.5px; text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.2);
}
.logout-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.7);
  padding: 6px 14px; border-radius: 20px;
  cursor: pointer; font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  transition: all .2s; letter-spacing: 0.5px;
}
.logout-btn:hover { background: rgba(255,255,255,0.1); color: white; }

/* LOGIN */
.login-wrap {
  min-height: 100vh;
  background: linear-gradient(160deg, #EAE4D8 0%, #F5F0E8 50%, #E8F0E6 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; position: relative; overflow: hidden;
}
.login-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 44px 36px;
  width: 100%; max-width: 420px;
  box-shadow: 0 8px 40px rgba(45,90,39,0.10);
  position: relative; overflow: hidden;
}
.login-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 5px;
  background: linear-gradient(90deg, var(--green), var(--green3), var(--sage));
  border-radius: 16px 16px 0 0;
}
.brand-icon {
  font-size: 48px; text-align: center; margin-bottom: 16px;
  display: block;
}
.login-title {
  font-family: 'Playfair Display', serif;
  font-weight: 900; font-size: 30px;
  text-align: center; color: var(--green);
  margin-bottom: 6px; letter-spacing: -0.5px;
}
.login-sub {
  text-align: center; color: var(--muted);
  font-size: 14px; margin-bottom: 30px; line-height: 1.5;
}

.tab-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  margin-bottom: 28px;
}
.tab-btn {
  padding: 10px 8px;
  border: 2px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  cursor: pointer; border-radius: 8px;
  transition: all .2s;
}
.tab-btn.active {
  background: var(--green); border-color: var(--green);
  color: white;
}

label {
  display: block; font-size: 11px; font-weight: 600;
  letter-spacing: 1px; text-transform: uppercase;
  color: var(--muted); margin-bottom: 6px;
}
.field { margin-bottom: 18px; }

select, input[type=text], input[type=password] {
  width: 100%;
  background: var(--panna);
  border: 1.5px solid var(--border);
  color: var(--text);
  padding: 11px 14px;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px; outline: none;
  transition: border-color .2s;
  appearance: none;
}
select:focus, input:focus { border-color: var(--green); }
select option { background: white; }

.btn-primary {
  width: 100%;
  background: linear-gradient(135deg, var(--green), var(--green2));
  color: white; border: none;
  padding: 13px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px; font-weight: 600;
  cursor: pointer; border-radius: 8px;
  transition: all .2s; letter-spacing: 0.5px;
  box-shadow: 0 4px 14px rgba(45,90,39,0.25);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(45,90,39,0.3); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.error-msg {
  background: #FDF0EE; border: 1.5px solid #E07060;
  color: #C0392B; padding: 10px 14px;
  border-radius: 8px; font-size: 13px; margin-bottom: 16px;
}
.success-msg {
  background: #EEF6EC; border: 1.5px solid var(--green3);
  color: var(--green); padding: 10px 14px;
  border-radius: 8px; font-size: 13px; margin-bottom: 16px;
}

/* WORKER PANEL */
.panel { padding: 24px 20px; max-width: 520px; margin: 0 auto; }
.panel-greeting {
  display: flex; align-items: center; gap: 12px; margin-bottom: 6px;
}
.avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, var(--green), var(--green3));
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: white; font-weight: 700;
  font-family: 'Playfair Display', serif;
  flex-shrink: 0;
}
.panel-title {
  font-family: 'Playfair Display', serif;
  font-weight: 700; font-size: 24px; color: var(--green);
}
.panel-date { color: var(--muted); font-size: 13px; margin-bottom: 22px; }

.status-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: 12px; padding: 20px;
  margin-bottom: 18px;
  box-shadow: 0 2px 12px rgba(45,90,39,0.06);
}
.status-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--beige);
}
.status-row:last-child { border-bottom: none; padding-bottom: 0; }
.status-row:first-child { padding-top: 0; }
.status-icon { font-size: 16px; width: 24px; text-align: center; flex-shrink: 0; }
.status-label { font-size: 13px; color: var(--muted); }
.status-value { font-weight: 600; color: var(--text); margin-left: auto; font-size: 14px; }
.status-value.highlight { color: var(--green); }

.hours-row {
  display: flex; gap: 16px; padding-top: 16px;
  border-top: 1px dashed var(--border); margin-top: 4px;
}
.hours-block {}
.hours-label { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; }
.hours-num {
  font-family: 'Playfair Display', serif;
  font-size: 28px; font-weight: 900; color: var(--green); line-height: 1;
}
.hours-unit { font-size: 12px; color: var(--muted); }

.action-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: 12px; padding: 24px;
  box-shadow: 0 2px 12px rgba(45,90,39,0.06);
}
.action-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
}
.action-icon {
  width: 36px; height: 36px; border-radius: 8px;
  background: var(--green); display: flex;
  align-items: center; justify-content: center; font-size: 16px;
}
.action-title {
  font-family: 'Playfair Display', serif;
  font-weight: 700; font-size: 18px; color: var(--green);
}

/* BOSS PANEL */
.boss-panel { padding: 24px 20px; max-width: 960px; margin: 0 auto; }
.boss-title {
  font-family: 'Playfair Display', serif;
  font-weight: 900; font-size: 28px; color: var(--green); margin-bottom: 4px;
}

.filter-row {
  display: flex; gap: 12px; margin-bottom: 28px;
  flex-wrap: wrap; align-items: flex-end;
}
.filter-row .field { margin-bottom: 0; flex: 1; min-width: 140px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
  gap: 14px; margin-bottom: 30px;
}
.stat-card {
  background: var(--white); border: 1.5px solid var(--border);
  border-radius: 12px; padding: 18px;
  box-shadow: 0 2px 8px rgba(45,90,39,0.06);
  position: relative; overflow: hidden;
}
.stat-card::after {
  content: '🌱';
  position: absolute; bottom: 8px; right: 10px;
  font-size: 20px; opacity: 0.2;
}
.stat-name {
  font-size: 12px; color: var(--muted); margin-bottom: 8px;
  font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
}
.stat-hours {
  font-family: 'Playfair Display', serif;
  font-size: 40px; font-weight: 900; color: var(--green); line-height: 1;
}
.stat-unit { font-size: 12px; color: var(--muted); margin-top: 4px; }

.section-label {
  font-size: 11px; font-weight: 600; letter-spacing: 2px;
  text-transform: uppercase; color: var(--muted);
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
.section-label::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

.table-wrap {
  background: var(--white); border: 1.5px solid var(--border);
  border-radius: 12px; overflow: hidden; overflow-x: auto;
  box-shadow: 0 2px 8px rgba(45,90,39,0.06);
}
.records-table { width: 100%; border-collapse: collapse; }
.records-table th {
  font-size: 11px; font-weight: 600; letter-spacing: 1px;
  text-transform: uppercase; color: var(--muted);
  padding: 12px 14px; text-align: left;
  background: var(--panna);
  border-bottom: 1.5px solid var(--border);
}
.records-table td {
  padding: 12px 14px; font-size: 14px;
  border-bottom: 1px solid var(--beige);
}
.records-table tr:last-child td { border-bottom: none; }
.records-table tr:hover td { background: #F7F4EE; }

.pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
}
.pill-green { background: #EEF6EC; color: var(--green); }
.pill-yellow { background: #FEF9EC; color: #B8860B; }
.pill-gray  { background: var(--beige); color: var(--muted); }

.no-records {
  text-align: center; padding: 48px; color: var(--muted);
  font-size: 14px;
}
.no-records .emoji { font-size: 32px; display: block; margin-bottom: 8px; }

.done-state {
  text-align: center; padding: 24px 0;
}
.done-state .big-check { font-size: 48px; margin-bottom: 12px; }
.done-state h3 {
  font-family: 'Playfair Display', serif;
  font-size: 22px; color: var(--green); margin-bottom: 6px;
}
.done-state p { color: var(--muted); font-size: 14px; line-height: 1.6; }
.done-state strong { color: var(--green2); }

@keyframes fadeUp {
  from { opacity:0; transform: translateY(12px); }
  to   { opacity:1; transform: translateY(0); }
}
.panel, .boss-panel { animation: fadeUp .35s ease; }

@media (max-width: 500px) {
  .login-card { padding: 32px 20px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .boss-panel, .panel { padding: 16px; }
}
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("login");
  const [currentWorker, setCurrentWorker] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords().then(r => { setRecords(r); setLoading(false); }); }, []);

  async function updateRecords(newRecs) { setRecords(newRecs); await saveRecords(newRecs); }

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F5F0E8", color:"#7A8C77", fontFamily:"DM Sans, sans-serif", flexDirection:"column", gap:12 }}>
      <style>{css}</style>
      <span style={{ fontSize:36 }}>🌿</span>
      <span>Caricamento...</span>
    </div>
  );

  return (
    <div>
      <style>{css}</style>
      {view === "login" && <LoginScreen onWorkerLogin={w => { setCurrentWorker(w); setView("worker"); }} onBossLogin={() => setView("boss")} />}
      {view === "worker" && <WorkerPanel worker={currentWorker} records={records} updateRecords={updateRecords} onLogout={() => { setCurrentWorker(null); setView("login"); }} />}
      {view === "boss" && <BossPanel records={records} onLogout={() => setView("login")} />}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onWorkerLogin, onBossLogin }) {
  const [tab, setTab] = useState("worker");
  const [sel, setSel] = useState("");
  const [pin, setPin] = useState("");
  const [bossPass, setBossPass] = useState("");
  const [error, setError] = useState("");

  function handleWorker() {
    const w = WORKERS.find(x => x.name === sel);
    if (!w) { setError("Seleziona il tuo nome."); return; }
    if (pin !== w.pin) { setError("PIN non corretto. Riprova."); return; }
    setError(""); onWorkerLogin(w);
  }
  function handleBoss() {
    if (bossPass !== BOSS_PASSWORD) { setError("Password non corretta."); return; }
    setError(""); onBossLogin();
  }

  return (
    <div className="login-wrap">
      <Leaf style={{ top:-30, left:-20, width:120, height:160, transform:"rotate(-30deg)" }} />
      <Leaf style={{ bottom:-40, right:-30, width:160, height:200, transform:"rotate(140deg)" }} />
      <Leaf style={{ top:"40%", right:40, width:80, height:100, transform:"rotate(60deg)" }} />

      <div className="login-card">
        <span className="brand-icon">🌳</span>
        <div className="login-title">Green Service</div>
        <div className="login-sub">Gestione presenze del team — buona giornata! 🌱</div>

        <div className="tab-row">
          <button className={`tab-btn ${tab==="worker"?"active":""}`} onClick={() => { setTab("worker"); setError(""); }}>👷 Operaio</button>
          <button className={`tab-btn ${tab==="boss"?"active":""}`} onClick={() => { setTab("boss"); setError(""); }}>🔑 Capo</button>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        {tab === "worker" ? (
          <>
            <div className="field">
              <label>Il tuo nome</label>
              <select value={sel} onChange={e => setSel(e.target.value)}>
                <option value="">— Seleziona operaio —</option>
                {WORKERS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>PIN segreto</label>
              <input type="password" placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key==="Enter" && handleWorker()} />
            </div>
            <button className="btn-primary" onClick={handleWorker}>🌿 Entra</button>
          </>
        ) : (
          <>
            <div className="field">
              <label>Password capo cantiere</label>
              <input type="password" placeholder="••••••••" value={bossPass} onChange={e => setBossPass(e.target.value)} onKeyDown={e => e.key==="Enter" && handleBoss()} />
            </div>
            <button className="btn-primary" onClick={handleBoss}>🌳 Accedi al pannello</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── WORKER ───────────────────────────────────────────────────────────────────
function WorkerPanel({ worker, records, updateRecords, onLogout }) {
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime]   = useState("");
  const [site, setSite]           = useState("");
  const [msg, setMsg]             = useState({ type:"", text:"" });

  const todayStr    = today();
  const todayRecord = records.find(r => r.worker === worker.name && r.date === todayStr);

  const weekH  = records.filter(r => r.worker===worker.name && weekKey(r.date)===weekKey(todayStr) && r.exit).reduce((s,r)=>s+calcHours(r.entry,r.exit),0);
  const monthH = records.filter(r => r.worker===worker.name && monthKey(r.date)===monthKey(todayStr) && r.exit).reduce((s,r)=>s+calcHours(r.entry,r.exit),0);

  async function handleEntry() {
    if (!entryTime) { setMsg({ type:"error", text:"Seleziona l'orario di ingresso." }); return; }
    if (todayRecord?.entry) { setMsg({ type:"error", text:"Hai già registrato l'ingresso oggi." }); return; }
    await updateRecords([...records, { id:Date.now(), worker:worker.name, date:todayStr, entry:entryTime, exit:null, site:null }]);
    setMsg({ type:"success", text:`Ingresso segnato alle ${entryTime}. Buona giornata! 🌿` });
    setEntryTime("");
  }

  async function handleExit() {
    if (!exitTime) { setMsg({ type:"error", text:"Seleziona l'orario di uscita." }); return; }
    if (!site.trim()) { setMsg({ type:"error", text:"Inserisci il posto dove hai lavorato." }); return; }
    if (!todayRecord) { setMsg({ type:"error", text:"Devi prima registrare l'ingresso." }); return; }
    if (todayRecord?.exit) { setMsg({ type:"error", text:"Hai già registrato l'uscita oggi." }); return; }
    await updateRecords(records.map(r => r.id===todayRecord.id ? {...r, exit:exitTime, site:site.trim()} : r));
    const h = calcHours(todayRecord.entry, exitTime);
    setMsg({ type:"success", text:`Uscita segnata. Oggi hai fatto ${h.toFixed(1)} ore. Ottimo lavoro! ✅` });
    setExitTime(""); setSite("");
  }

  const initials = worker.name.slice(0,2).toUpperCase();

  return (
    <div>
      <div className="header">
        <div className="header-logo">🌳 Green<span className="dot"> </span>Service <span className="header-badge">OPERAIO</span></div>
        <button className="logout-btn" onClick={onLogout}>Esci</button>
      </div>
      <div className="panel">
        <div className="panel-greeting">
          <div className="avatar">{initials}</div>
          <div>
            <div className="panel-title">Ciao, {worker.name}!</div>
            <div className="panel-date">{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
        </div>

        <div className="status-card">
          <div className="status-row">
            <span className="status-icon">{todayRecord?.entry ? "🟢" : "⚪"}</span>
            <span className="status-label">Ingresso oggi</span>
            <span className={`status-value ${todayRecord?.entry?"highlight":""}`}>{todayRecord?.entry || "—"}</span>
          </div>
          <div className="status-row">
            <span className="status-icon">{todayRecord?.exit ? "🟠" : "⚪"}</span>
            <span className="status-label">Uscita oggi</span>
            <span className={`status-value ${todayRecord?.exit?"highlight":""}`}>{todayRecord?.exit || "—"}</span>
          </div>
          <div className="status-row">
            <span className="status-icon">📍</span>
            <span className="status-label">Posto di lavoro</span>
            <span className="status-value">{todayRecord?.site || "—"}</span>
          </div>
          <div className="hours-row">
            <div className="hours-block">
              <div className="hours-label">Settimana</div>
              <div className="hours-num">{weekH.toFixed(1)}<span className="hours-unit"> h</span></div>
            </div>
            <div className="hours-block">
              <div className="hours-label">Mese</div>
              <div className="hours-num">{monthH.toFixed(1)}<span className="hours-unit"> h</span></div>
            </div>
          </div>
        </div>

        {msg.text && <div className={msg.type==="error"?"error-msg":"success-msg"}>{msg.text}</div>}

        <div className="action-card">
          {!todayRecord?.entry ? (
            <>
              <div className="action-header">
                <div className="action-icon">🌅</div>
                <div className="action-title">Registra Ingresso</div>
              </div>
              <div className="field">
                <label>Orario di ingresso</label>
                <select value={entryTime} onChange={e => setEntryTime(e.target.value)}>
                  <option value="">— Seleziona orario —</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={handleEntry}>🌿 Segna Ingresso</button>
            </>
          ) : !todayRecord?.exit ? (
            <>
              <div className="action-header">
                <div className="action-icon">🌇</div>
                <div className="action-title">Registra Uscita</div>
              </div>
              <div className="field">
                <label>Orario di uscita</label>
                <select value={exitTime} onChange={e => setExitTime(e.target.value)}>
                  <option value="">— Seleziona orario —</option>
                  {TIME_SLOTS.filter(t => t > todayRecord.entry).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Dove hai lavorato oggi?</label>
                <input type="text" placeholder="Es: Via Roma 12, Milano — Parco Sempione..." value={site} onChange={e => setSite(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleExit}>🍃 Segna Uscita</button>
            </>
          ) : (
            <div className="done-state">
              <div className="big-check">🌳</div>
              <h3>Giornata completata!</h3>
              <p>
                Ingresso: <strong>{todayRecord.entry}</strong> — Uscita: <strong>{todayRecord.exit}</strong><br/>
                Ore oggi: <strong>{calcHours(todayRecord.entry, todayRecord.exit).toFixed(1)}h</strong><br/>
                Lavori: {todayRecord.site}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOSS ─────────────────────────────────────────────────────────────────────
function BossPanel({ records, onLogout }) {
  const [period, setPeriod]       = useState("month");
  const [filterWorker, setFilter] = useState("all");
  const todayStr = today();

  function getHours(name) {
    return records.filter(r => {
      if (r.worker !== name || !r.exit) return false;
      if (period === "week")  return weekKey(r.date)  === weekKey(todayStr);
      if (period === "month") return monthKey(r.date) === monthKey(todayStr);
      return true;
    }).reduce((s,r) => s + calcHours(r.entry, r.exit), 0);
  }

  const filteredRecords = records
    .filter(r => filterWorker === "all" || r.worker === filterWorker)
    .sort((a,b) => b.date.localeCompare(a.date));

  const periodLabel = period==="week" ? "questa settimana" : period==="month" ? "questo mese" : "totale";
  const showWorkers = filterWorker==="all" ? WORKERS : WORKERS.filter(w => w.name===filterWorker);

  return (
    <div>
      <div className="header">
        <div className="header-logo">🌳 Green<span className="dot"> </span>Service <span className="header-badge">CAPO CANTIERE</span></div>
        <button className="logout-btn" onClick={onLogout}>Esci</button>
      </div>
      <div className="boss-panel">
        <div className="boss-title">📊 Riepilogo Presenze</div>
        <div style={{ color:"var(--muted)", fontSize:13, marginBottom:24 }}>
          Aggiornato al {new Date().toLocaleDateString("it-IT")}
        </div>

        <div className="filter-row">
          <div className="field">
            <label>Periodo</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="week">Questa settimana</option>
              <option value="month">Questo mese</option>
              <option value="all">Tutto</option>
            </select>
          </div>
          <div className="field">
            <label>Operaio</label>
            <select value={filterWorker} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tutti gli operai</option>
              {WORKERS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div className="section-label">Ore lavorate — {periodLabel}</div>
        <div className="stats-grid">
          {showWorkers.map(w => {
            const h = getHours(w.name);
            return (
              <div className="stat-card" key={w.name}>
                <div className="stat-name">{w.name}</div>
                <div className="stat-hours">{h.toFixed(1)}</div>
                <div className="stat-unit">ore {periodLabel}</div>
              </div>
            );
          })}
        </div>

        <div className="section-label">Dettaglio presenze</div>
        <div className="table-wrap">
          {filteredRecords.length === 0 ? (
            <div className="no-records">
              <span className="emoji">🌱</span>
              Nessuna presenza registrata ancora.
            </div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Operaio</th>
                  <th>Ingresso</th>
                  <th>Uscita</th>
                  <th>Ore</th>
                  <th>Posto</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => {
                  const h = r.exit ? calcHours(r.entry, r.exit) : null;
                  const isToday = r.date === todayStr;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: isToday ? 600 : 400, color: isToday ? "var(--green)" : "var(--text)" }}>
                        {new Date(r.date+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"})}
                        {isToday && <span style={{ marginLeft:6, fontSize:10, background:"#EEF6EC", color:"var(--green)", padding:"1px 6px", borderRadius:10, fontWeight:600 }}>oggi</span>}
                      </td>
                      <td style={{ fontWeight:600 }}>{r.worker}</td>
                      <td>{r.entry || "—"}</td>
                      <td>{r.exit  || "—"}</td>
                      <td style={{ fontFamily:"Playfair Display, serif", fontWeight:700, fontSize:16, color:"var(--green)" }}>
                        {h !== null ? `${h.toFixed(1)}h` : "—"}
                      </td>
                      <td style={{ color:"var(--muted)", fontSize:13 }}>{r.site || "—"}</td>
                      <td>
                        {r.exit
                          ? <span className="pill pill-green">✅ Completo</span>
                          : r.entry
                          ? <span className="pill pill-yellow">🌿 In lavoro</span>
                          : <span className="pill pill-gray">— Assente</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

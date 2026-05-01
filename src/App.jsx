import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0RO_rDY2yJ5XeakfoOAUf08zdydE1n68",
  authDomain: "presenze-verde.firebaseapp.com",
  projectId: "presenze-verde",
  storageBucket: "presenze-verde.firebasestorage.app",
  messagingSenderId: "985438306308",
  appId: "1:985438306308:web:09c013882f4a5a673db551",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const BOSS_PASSWORD = "capo2024";
const WORKERS = ["Coran","Hassan","Gianni","Italo","Fabrizio","Luana","Massimiliano"];
const SITES = [
  "Frascati - Centro Fisico Nucleare",
  "Assergi - Centro Fisico Nucleare",
  "Distributori Enel",
  "Comune di Celano",
  "Scuola di Ortucchio",
  "Parco Velino Silente",
  "Giardino Villa del Corvo",
  "Altro...",
];
const TIME_SLOTS = [];
for (let h = 5; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,"0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2,"0")}:30`);
}

function calcHours(e, x) {
  if (!e||!x) return 0;
  const [eh,em]=e.split(":").map(Number), [xh,xm]=x.split(":").map(Number);
  return Math.max(0,(xh*60+xm-(eh*60+em))/60);
}
function today() { return new Date().toISOString().slice(0,10); }
function weekKey(d) {
  const dt=new Date(d),day=dt.getDay()||7,mon=new Date(dt);
  mon.setDate(dt.getDate()-day+1); return mon.toISOString().slice(0,10);
}
function monthKey(d) { return d.slice(0,7); }
function fmtDate(d) { return new Date(d+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"2-digit"}); }

async function loadData() {
  try {
    const snap = await getDoc(doc(db,"greenservice","presenze"));
    const msnap = await getDoc(doc(db,"greenservice","memo"));
    return {
      records: snap.exists() ? snap.data().records : [],
      memo: msnap.exists() ? msnap.data().text : ""
    };
  } catch(e) { return { records:[], memo:"" }; }
}
async function saveRecords(records) {
  try { await setDoc(doc(db,"greenservice","presenze"),{records}); } catch(e){}
}
async function saveMemo(text) {
  try { await setDoc(doc(db,"greenservice","memo"),{text}); } catch(e){}
}

function exportExcel(records, label) {
  const rows=[["Data","Operaio","Ingresso","Uscita","Ore","Giornate","Cantiere"]];
  records.forEach(r=>{
    const h=r.exit?calcHours(r.entry,r.exit):0;
    rows.push([r.date,r.worker,r.entry||"",r.exit||"",h.toFixed(1),r.exit?"1":"0",r.site||""]);
  });
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download=`GreenService_${label}.csv`; a.click();
}
function exportPDF(records, label) {
  const summary={};
  WORKERS.forEach(w=>{summary[w]={hours:0,days:0}});
  records.forEach(r=>{ if(r.exit&&summary[r.worker]){summary[r.worker].hours+=calcHours(r.entry,r.exit);summary[r.worker].days++;} });
  const sRows=Object.entries(summary).map(([n,d])=>`<tr><td><b>${n}</b></td><td style="color:#2D5A27;font-weight:700">${d.hours.toFixed(1)}h</td><td style="font-weight:700">${d.days} gg</td></tr>`).join("");
  const dRows=records.map(r=>{
    const h=r.exit?calcHours(r.entry,r.exit):0;
    return `<tr><td>${new Date(r.date+"T12:00:00").toLocaleDateString("it-IT")}</td><td><b>${r.worker}</b></td><td>${r.entry||"—"}</td><td>${r.exit||"—"}</td><td style="color:#2D5A27;font-weight:700">${h>0?h.toFixed(1)+"h":"—"}</td><td>${r.exit?"✅":"—"}</td><td style="font-size:11px;color:#666">${r.site||"—"}</td></tr>`;
  }).join("");
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Green Service</title>
  <style>body{font-family:Georgia,serif;padding:32px;color:#2A3828;max-width:900px;margin:0 auto}h1{color:#2D5A27;font-size:28px}h2{color:#2D5A27;font-size:16px;margin:20px 0 8px}.sub{color:#888;font-size:13px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#2D5A27;color:white;padding:8px 10px;text-align:left;font-size:11px;letter-spacing:1px}td{padding:7px 10px;border-bottom:1px solid #E8DFD0;font-size:13px}tr:nth-child(even){background:#faf7f2}.footer{margin-top:20px;font-size:11px;color:#aaa;text-align:right}</style>
  </head><body><h1>🌳 Green Service</h1><div class="sub">Presenze — ${label} — ${new Date().toLocaleDateString("it-IT")}</div>
  <h2>Riepilogo operai</h2><table><thead><tr><th>Operaio</th><th>Ore</th><th>Giornate</th></tr></thead><tbody>${sRows}</tbody></table>
  <h2>Dettaglio</h2><table><thead><tr><th>Data</th><th>Operaio</th><th>Ingresso</th><th>Uscita</th><th>Ore</th><th>Gg</th><th>Cantiere</th></tr></thead><tbody>${dRows}</tbody></table>
  <div class="footer">Green Service — generato automaticamente</div></body></html>`;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));
  a.download=`GreenService_${label}.html`; a.click();
}

// ─── WORKER AVATAR COLORS ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#2D5A27","#3D7A35","#5A6E2A","#1A4A30","#4A6741","#2A5040","#3A5530"
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --forest:#1A3320;
  --green:#2D5A27;
  --green2:#3D7A35;
  --sage:#7A9E75;
  --gold:#C8A84B;
  --gold2:#E5C86A;
  --cream:#F7F3EC;
  --panna:#FDFAF5;
  --beige:#EDE5D8;
  --text:#1C2B1A;
  --muted:#7A8C77;
  --border:#D8CFBE;
  --white:#FFFFFF;
  --red:#C0392B;
}

html{-webkit-tap-highlight-color:transparent}
body{
  font-family:'Outfit',sans-serif;
  background:var(--cream);
  color:var(--text);
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}

/* ── LOGIN ── */
.login-bg{
  min-height:100vh;
  background:linear-gradient(165deg, #0D1F12 0%, #1A3320 40%, #2D5A27 100%);
  display:flex; align-items:center; justify-content:center;
  padding:24px; position:relative; overflow:hidden;
}
.login-bg::before{
  content:'';
  position:absolute; inset:0;
  background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
.login-card{
  background:rgba(253,250,245,0.97);
  border-radius:28px;
  padding:48px 36px;
  width:100%; max-width:380px;
  box-shadow:0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(200,168,75,0.3);
  position:relative;
  animation:slideUp .5s cubic-bezier(.16,1,.3,1) both;
}
.login-card::before{
  content:'';
  position:absolute; top:0; left:50%; transform:translateX(-50%);
  width:60%; height:3px;
  background:linear-gradient(90deg, transparent, var(--gold), transparent);
  border-radius:0 0 3px 3px;
}
.login-logo{
  width:100px; height:100px;
  border-radius:22px;
  margin:0 auto 20px;
  display:block;
  object-fit:cover;
  box-shadow:0 8px 24px rgba(45,90,39,0.25);
}
.login-title{
  font-family:'Cormorant Garamond',serif;
  font-size:34px; font-weight:700;
  text-align:center; color:var(--forest);
  margin-bottom:4px; letter-spacing:.5px;
}
.login-sub{
  text-align:center; color:var(--muted);
  font-size:13px; margin-bottom:36px;
  font-weight:300; letter-spacing:.5px;
}
.input-wrap{margin-bottom:16px}
.input-label{
  display:block; font-size:10px; font-weight:600;
  letter-spacing:2px; text-transform:uppercase;
  color:var(--muted); margin-bottom:8px;
}
.input-field{
  width:100%; background:var(--cream);
  border:1.5px solid var(--border); color:var(--text);
  padding:14px 18px; border-radius:14px;
  font-family:'Outfit',sans-serif; font-size:16px;
  outline:none; transition:all .2s;
}
.input-field:focus{border-color:var(--gold); background:var(--panna); box-shadow:0 0 0 3px rgba(200,168,75,0.1)}
.btn-login{
  width:100%;
  background:linear-gradient(135deg, var(--forest), var(--green));
  color:white; border:none; padding:16px;
  font-family:'Outfit',sans-serif; font-size:15px; font-weight:600;
  cursor:pointer; border-radius:14px; transition:all .25s;
  box-shadow:0 6px 20px rgba(26,51,32,0.35);
  letter-spacing:.5px; margin-top:4px;
}
.btn-login:hover{transform:translateY(-1px); box-shadow:0 10px 28px rgba(26,51,32,0.4)}
.btn-login:active{transform:translateY(0)}
.err{
  background:#FDF0EE; border:1px solid #E07060;
  color:var(--red); padding:10px 14px;
  border-radius:10px; font-size:13px; margin-bottom:14px; text-align:center;
}

/* ── HEADER ── */
.header{
  background:linear-gradient(135deg, var(--forest) 0%, var(--green) 100%);
  padding:env(safe-area-inset-top,16px) 20px 16px;
  padding-top:calc(env(safe-area-inset-top,0px) + 16px);
  display:flex; align-items:center; justify-content:space-between;
  position:sticky; top:0; z-index:100;
  box-shadow:0 2px 20px rgba(0,0,0,0.2);
}
.header-left{display:flex;align-items:center;gap:12px}
.header-logo-img{
  width:36px;height:36px;border-radius:10px;
  object-fit:cover;border:1.5px solid rgba(200,168,75,0.5);
}
.header-name{
  font-family:'Cormorant Garamond',serif;
  font-size:20px;font-weight:700;color:white;letter-spacing:.5px;
}
.header-date{font-size:11px;color:rgba(255,255,255,.6);font-weight:300;margin-top:1px}
.btn-exit{
  background:rgba(255,255,255,.1);
  border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.8); padding:7px 14px;
  border-radius:20px; cursor:pointer; font-size:12px;
  font-family:'Outfit',sans-serif; transition:all .2s;
  font-weight:500;
}
.btn-exit:hover{background:rgba(255,255,255,.2);color:white}

/* ── BOTTOM NAV ── */
.bottom-nav{
  position:fixed; bottom:0; left:0; right:0;
  background:rgba(253,250,245,0.97);
  backdrop-filter:blur(20px);
  border-top:1px solid var(--border);
  display:flex; padding:8px 0 calc(env(safe-area-inset-bottom,0px) + 8px);
  z-index:100;
  box-shadow:0 -4px 20px rgba(0,0,0,0.08);
}
.nav-item{
  flex:1; display:flex; flex-direction:column;
  align-items:center; gap:3px; cursor:pointer;
  padding:6px 4px; border:none; background:transparent;
  font-family:'Outfit',sans-serif; transition:all .2s;
}
.nav-icon{font-size:22px;transition:transform .2s}
.nav-label{font-size:10px;font-weight:600;letter-spacing:.5px;color:var(--muted);text-transform:uppercase;transition:color .2s}
.nav-item.active .nav-icon{transform:scale(1.15)}
.nav-item.active .nav-label{color:var(--green)}
.nav-item.active{position:relative}
.nav-item.active::after{content:'';position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--gold)}

/* ── MAIN CONTENT ── */
.main{
  padding:20px 16px calc(env(safe-area-inset-bottom,0px) + 90px);
  max-width:600px; margin:0 auto;
}

/* ── MEMO BANNER ── */
.memo-banner{
  background:linear-gradient(135deg, rgba(200,168,75,0.12), rgba(200,168,75,0.06));
  border:1px solid rgba(200,168,75,0.3);
  border-radius:14px; padding:14px 16px;
  margin-bottom:18px; display:flex; align-items:center; gap:10px;
}
.memo-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);flex-shrink:0;box-shadow:0 0 8px rgba(200,168,75,.5)}
.memo-text{font-size:13px;color:var(--text);font-weight:400;flex:1;font-style:italic}
.memo-edit{font-size:16px;cursor:pointer;opacity:.6}

/* ── SECTION TITLE ── */
.section-title{
  font-family:'Cormorant Garamond',serif;
  font-size:22px; font-weight:700; color:var(--forest);
  margin-bottom:14px; display:flex; align-items:center; gap:8px;
}
.section-sub{font-size:12px;color:var(--muted);font-weight:400;margin-left:auto}

/* ── QUICK ACTIONS ── */
.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px}
.quick-btn{
  background:var(--panna);
  border:1.5px solid var(--border);
  border-radius:16px; padding:16px 14px;
  cursor:pointer; transition:all .2s;
  display:flex; flex-direction:column; align-items:flex-start; gap:6px;
  text-align:left;
}
.quick-btn:active{transform:scale(.97)}
.quick-btn.green{background:linear-gradient(135deg,var(--green),var(--green2));border-color:transparent;color:white}
.quick-btn.gold{background:linear-gradient(135deg,#8B6914,var(--gold));border-color:transparent;color:white}
.quick-btn.red{background:linear-gradient(135deg,#7A2020,#C0392B);border-color:transparent;color:white}
.quick-icon{font-size:24px}
.quick-label{font-size:12px;font-weight:600;letter-spacing:.3px;line-height:1.3}
.quick-sub{font-size:10px;opacity:.7;font-weight:400}

/* ── WORKER CARDS ── */
.workers-list{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}
.worker-card{
  background:var(--panna);
  border-radius:18px;
  border:1.5px solid var(--border);
  padding:16px;
  display:flex; align-items:center; gap:14px;
  cursor:pointer; transition:all .25s;
  box-shadow:0 2px 8px rgba(0,0,0,0.04);
  position:relative; overflow:hidden;
}
.worker-card::before{
  content:'';
  position:absolute; left:0; top:0; bottom:0;
  width:4px; border-radius:4px 0 0 4px;
  background:var(--status-color, #ccc);
  transition:background .3s;
}
.worker-card:active{transform:scale(.98)}
.worker-avatar{
  width:46px;height:46px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  font-family:'Cormorant Garamond',serif;
  font-size:18px;font-weight:700;color:white;
  flex-shrink:0;
  box-shadow:0 3px 10px rgba(0,0,0,0.15);
}
.worker-info{flex:1;min-width:0}
.worker-name{font-size:15px;font-weight:600;color:var(--text);margin-bottom:3px}
.worker-status-text{font-size:12px;color:var(--muted);font-weight:400}
.worker-stats{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.stat-hours{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--green);line-height:1}
.stat-days{font-size:10px;color:var(--muted);font-weight:500;letter-spacing:.5px}
.status-pill{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 8px;border-radius:20px;
  font-size:10px;font-weight:600;letter-spacing:.3px;
  margin-top:3px;
}
.pill-done{background:#E8F5E4;color:#2D6B27}
.pill-work{background:#FEF9EC;color:#8B6914}
.pill-absent{background:var(--beige);color:var(--muted)}

/* ── FORM CARD ── */
.form-card{
  background:var(--panna);
  border:1.5px solid var(--border);
  border-radius:18px; padding:20px;
  margin-bottom:16px;
  box-shadow:0 2px 12px rgba(0,0,0,0.05);
}
.form-title{
  font-family:'Cormorant Garamond',serif;
  font-size:20px;font-weight:700;color:var(--forest);
  margin-bottom:18px;
}
.field{margin-bottom:14px}
.field-label{
  display:block;font-size:10px;font-weight:600;
  letter-spacing:1.5px;text-transform:uppercase;
  color:var(--muted);margin-bottom:6px;
}
select,input[type=text],input[type=date],input[type=month]{
  width:100%;background:var(--cream);
  border:1.5px solid var(--border);color:var(--text);
  padding:12px 14px;border-radius:12px;
  font-family:'Outfit',sans-serif;font-size:14px;
  outline:none;transition:all .2s;appearance:none;
}
select:focus,input:focus{border-color:var(--green);background:var(--panna);box-shadow:0 0 0 3px rgba(45,90,39,0.08)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.btn-action{
  padding:13px 20px;border:none;border-radius:12px;
  cursor:pointer;font-family:'Outfit',sans-serif;
  font-size:14px;font-weight:600;transition:all .2s;
  letter-spacing:.3px;
}
.btn-action:active{transform:scale(.97)}
.btn-action.primary{background:var(--green);color:white;box-shadow:0 4px 14px rgba(45,90,39,.25)}
.btn-action.secondary{background:var(--gold);color:white;box-shadow:0 4px 14px rgba(200,168,75,.3)}
.btn-action.danger{background:#FDF0EE;color:var(--red);border:1px solid #f0c0b0}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.btn-full{width:100%}

/* ── TOAST ── */
.toast{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + 80px);
  left:50%;transform:translateX(-50%);
  background:var(--forest);color:white;
  padding:12px 24px;border-radius:100px;
  font-size:13px;font-weight:500;
  box-shadow:0 8px 24px rgba(0,0,0,0.3);
  z-index:200;white-space:nowrap;
  animation:toastIn .3s cubic-bezier(.16,1,.3,1);
}
.toast.error{background:#C0392B}

/* ── SUMMARY CARDS ── */
.summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px}
.sum-card{
  background:var(--panna);border:1.5px solid var(--border);
  border-radius:16px;padding:16px;
  box-shadow:0 2px 8px rgba(0,0,0,0.04);
}
.sum-name{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.sum-h{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:700;color:var(--green);line-height:1}
.sum-d{font-size:11px;color:var(--muted);margin-top:3px}

/* ── WEEK TABLE ── */
.week-wrap{overflow-x:auto;border-radius:16px;border:1.5px solid var(--border);background:var(--panna)}
.week-table{width:100%;border-collapse:collapse;min-width:500px}
.week-table th{background:var(--forest);color:white;padding:10px 8px;font-size:11px;font-weight:600;text-align:center;letter-spacing:.5px}
.week-table th:first-child{text-align:left;padding-left:14px}
.week-table td{padding:10px 8px;border-bottom:1px solid var(--beige);text-align:center;font-size:12px}
.week-table tr:last-child td{border-bottom:none}
.wname{text-align:left!important;padding-left:14px!important;font-weight:600;font-size:13px}
.wcell-done{background:#E8F5E4;color:#2D6B27;font-weight:600;border-radius:6px}
.wcell-wip{background:#FEF9EC;color:#8B6914}
.wcell-no{color:#ccc}
.wtot{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--green)}

/* ── TABLE ── */
.tbl-wrap{border-radius:16px;overflow:hidden;border:1.5px solid var(--border);overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;min-width:500px}
.tbl th{background:var(--forest);color:white;padding:10px;font-size:10px;font-weight:600;text-align:left;letter-spacing:1px;text-transform:uppercase}
.tbl td{padding:10px;font-size:12px;border-bottom:1px solid var(--beige);background:var(--panna)}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:var(--cream)}

/* ── MISC ── */
.chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.chip-g{background:#E8F5E4;color:#2D6B27}
.chip-y{background:#FEF9EC;color:#8B6914}
.chip-n{background:var(--beige);color:var(--muted)}
.no-data{text-align:center;padding:40px;color:var(--muted);font-size:14px}
.divider{height:1px;background:var(--beige);margin:20px 0}
.filter-row{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:flex-end}
.filter-row .field{margin-bottom:0;flex:1;min-width:120px}
.export-row{display:flex;gap:8px}
.btn-export{padding:10px 14px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;transition:all .2s}
.btn-export:active{transform:scale(.96)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:flex-end;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
.modal{background:var(--panna);border-radius:24px 24px 16px 16px;padding:28px 24px;width:100%;max-width:500px;animation:slideUp .35s cubic-bezier(.16,1,.3,1)}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--forest);margin-bottom:20px}

@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [records, setRecords]   = useState([]);
  const [memo, setMemo]         = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadData().then(d => { setRecords(d.records); setMemo(d.memo); setLoading(false); });
  }, []);

  async function updateRecords(r) { setRecords(r); await saveRecords(r); }
  async function updateMemo(t) { setMemo(t); await saveMemo(t); }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#1A3320",color:"rgba(255,255,255,.6)",fontFamily:"Outfit,sans-serif",flexDirection:"column",gap:16}}>
      <style>{css}</style>
      <img src="/icon-192.png" style={{width:72,height:72,borderRadius:18,opacity:.8}} onError={e=>{e.target.style.display='none'}} />
      <span style={{fontSize:14,letterSpacing:1}}>Caricamento...</span>
    </div>
  );

  return (
    <div>
      <style>{css}</style>
      {!loggedIn
        ? <LoginScreen onLogin={()=>setLoggedIn(true)} />
        : <BossPanel records={records} memo={memo} updateRecords={updateRecords} updateMemo={updateMemo} onLogout={()=>setLoggedIn(false)} />
      }
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState("");

  function handle() {
    if (pass===BOSS_PASSWORD) { setErr(""); onLogin(); }
    else setErr("Password non corretta. Riprova.");
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <img src="/icon-512.png" className="login-logo" onError={e=>{e.target.style.display='none'}} />
        <div className="login-title">Green Service</div>
        <div className="login-sub">GESTIONE PRESENZE · ACCESSO RISERVATO</div>
        {err && <div className="err">{err}</div>}
        <div className="input-wrap">
          <label className="input-label">Password</label>
          <input className="input-field" type="password" placeholder="Inserisci la password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} autoFocus />
        </div>
        <button className="btn-login" onClick={handle}>Accedi →</button>
      </div>
    </div>
  );
}

// ─── BOSS PANEL ───────────────────────────────────────────────────────────────
function BossPanel({ records, memo, updateRecords, updateMemo, onLogout }) {
  const [tab, setTab]             = useState("oggi");
  const [toast, setToast]         = useState(null);
  const [modal, setModal]         = useState(null); // {type: 'segna'|'tutti'|'chiudi'|'completa'|'memo'}
  const [selWorker, setSelWorker] = useState("");
  const [entryT, setEntryT]       = useState("");
  const [exitT, setExitT]         = useState("");
  const [site, setSite]           = useState("");
  const [customSite, setCustomSite] = useState("");
  const [presDate, setPresDate]   = useState(today());
  const [tuttiT, setTuttiT]       = useState("");
  const [tuttiSite, setTuttiSite] = useState("");
  const [tuttiExitT, setTuttiExitT] = useState("");
  const [memoText, setMemoText]   = useState(memo);
  const [filterWorker, setFilter] = useState("all");
  const [filterMonth, setFilterMonth] = useState(monthKey(today()));
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData]   = useState({});
  const todayStr = today();

  function showToast(msg, type="ok") {
    setToast({msg,type}); setTimeout(()=>setToast(null),2500);
  }

  function getToday(name) { return records.find(r=>r.worker===name&&r.date===todayStr); }

  function getStats(name) {
    const m = records.filter(r=>r.worker===name&&r.exit&&monthKey(r.date)===monthKey(todayStr));
    return { hours:m.reduce((s,r)=>s+calcHours(r.entry,r.exit),0), days:m.length };
  }

  function getFinalSite(s, custom) { return s==="Altro..."?custom.trim():s; }

  async function doSegnaIngresso() {
    if (!selWorker||!entryT) { showToast("Compila tutti i campi","error"); return; }
    const fs = getFinalSite(site, customSite);
    if (!fs) { showToast("Seleziona il cantiere","error"); return; }
    const exists = records.find(r=>r.worker===selWorker&&r.date===presDate);
    if (exists?.entry) { showToast(`${selWorker} ha già l'ingresso`,"error"); return; }
    await updateRecords([...records,{id:Date.now(),worker:selWorker,date:presDate,entry:entryT,exit:null,site:fs}]);
    showToast(`✅ Ingresso ${selWorker} segnato alle ${entryT}`);
    setModal(null); setEntryT(""); setSite(""); setCustomSite("");
  }

  async function doSegnaUscita() {
    if (!selWorker||!exitT) { showToast("Compila tutti i campi","error"); return; }
    const rec = records.find(r=>r.worker===selWorker&&r.date===presDate);
    if (!rec) { showToast(`${selWorker} non ha l'ingresso`,"error"); return; }
    if (rec.exit) { showToast(`${selWorker} ha già l'uscita`,"error"); return; }
    await updateRecords(records.map(r=>r.id===rec.id?{...r,exit:exitT}:r));
    showToast(`✅ Uscita ${selWorker} alle ${exitT}`);
    setModal(null); setExitT("");
  }

  async function doTutti() {
    if (!tuttiT||!tuttiSite) { showToast("Compila tutti i campi","error"); return; }
    const fs = getFinalSite(tuttiSite, customSite);
    const newRecs=[...records];
    WORKERS.forEach(w=>{
      if (!newRecs.find(r=>r.worker===w&&r.date===todayStr))
        newRecs.push({id:Date.now()+Math.random(),worker:w,date:todayStr,entry:tuttiT,exit:null,site:fs});
    });
    await updateRecords(newRecs);
    showToast(`✅ Tutti entrati alle ${tuttiT}`);
    setModal(null); setTuttiT(""); setTuttiSite("");
  }

  async function doChiudiTutti() {
    if (!tuttiExitT) { showToast("Seleziona l'orario","error"); return; }
    const updated = records.map(r=>{
      if (r.date===todayStr&&r.entry&&!r.exit) return {...r,exit:tuttiExitT};
      return r;
    });
    await updateRecords(updated);
    showToast(`✅ Giornata chiusa per tutti alle ${tuttiExitT}`);
    setModal(null); setTuttiExitT("");
  }

  async function doCompleta() {
    if (!tuttiT||!tuttiExitT||!tuttiSite) { showToast("Compila tutti i campi","error"); return; }
    const fs = getFinalSite(tuttiSite, customSite);
    const newRecs=[...records];
    WORKERS.forEach(w=>{
      if (!newRecs.find(r=>r.worker===w&&r.date===todayStr))
        newRecs.push({id:Date.now()+Math.random(),worker:w,date:todayStr,entry:tuttiT,exit:tuttiExitT,site:fs});
    });
    await updateRecords(newRecs);
    showToast(`✅ Giornata completa per tutti`);
    setModal(null); setTuttiT(""); setTuttiExitT(""); setTuttiSite("");
  }

  async function deletePres(id) {
    if (!window.confirm("Eliminare questa presenza?")) return;
    await updateRecords(records.filter(r=>r.id!==id));
    showToast("Presenza eliminata");
  }

  function startEdit(r) {
    setEditingId(r.id);
    setEditData({date:r.date,worker:r.worker,entry:r.entry||"",exit:r.exit||"",site:r.site||""});
  }
  async function saveEdit(id) {
    await updateRecords(records.map(r=>r.id===id?{...r,...editData}:r));
    setEditingId(null); showToast("Modificato");
  }

  async function doSaveMemo() {
    await updateMemo(memoText);
    setModal(null); showToast("Memo salvato");
  }

  const filteredRecs = records
    .filter(r=>(filterWorker==="all"||r.worker===filterWorker)&&(!filterMonth||monthKey(r.date)===filterMonth))
    .sort((a,b)=>b.date.localeCompare(a.date));

  const weekStart = new Date(weekKey(todayStr)+"T12:00:00");
  const weekDays = Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d.toISOString().slice(0,10);
  });

  const todayEntered = WORKERS.filter(w=>getToday(w)?.entry).length;
  const todayDone    = WORKERS.filter(w=>getToday(w)?.exit).length;

  return (
    <div style={{paddingBottom:0}}>
      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <img src="/icon-192.png" className="header-logo-img" onError={e=>{e.target.style.display='none'}} />
          <div>
            <div className="header-name">Green Service</div>
            <div className="header-date">{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
        </div>
        <button className="btn-exit" onClick={onLogout}>Esci</button>
      </div>

      {/* TOAST */}
      {toast && <div className={`toast ${toast.type==="error"?"error":""}`}>{toast.msg}</div>}

      {/* CONTENT */}
      <div className="main">

        {/* MEMO */}
        {memo && (
          <div className="memo-banner" onClick={()=>{setMemoText(memo);setModal("memo")}}>
            <div className="memo-dot"></div>
            <div className="memo-text">{memo}</div>
            <span className="memo-edit">✏️</span>
          </div>
        )}

        {/* TAB OGGI */}
        {tab==="oggi" && (
          <>
            {/* Stato del giorno */}
            <div style={{display:"flex",gap:10,marginBottom:18}}>
              <div style={{flex:1,background:"var(--panna)",border:"1.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:30,fontWeight:700,color:"var(--green)"}}>{todayEntered}</div>
                <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>In cantiere</div>
              </div>
              <div style={{flex:1,background:"var(--panna)",border:"1.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:30,fontWeight:700,color:"var(--gold)"}}>{todayDone}</div>
                <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>Usciti</div>
              </div>
              <div style={{flex:1,background:"var(--panna)",border:"1.5px solid var(--border)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:30,fontWeight:700,color:"var(--muted)"}}>{WORKERS.length-todayEntered}</div>
                <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>Assenti</div>
              </div>
            </div>

            {/* Azioni rapide */}
            <div className="section-title" style={{marginBottom:12}}>⚡ Azioni Rapide</div>
            <div className="quick-grid">
              <button className="quick-btn green" onClick={()=>setModal("tutti")}>
                <span className="quick-icon">🌅</span>
                <span className="quick-label">Tutti Entrati</span>
                <span className="quick-sub">Segna ingresso a tutti</span>
              </button>
              <button className="quick-btn gold" onClick={()=>setModal("chiudi")}>
                <span className="quick-icon">🌇</span>
                <span className="quick-label">Chiudi Giornata</span>
                <span className="quick-sub">Uscita a chi è entrato</span>
              </button>
              <button className="quick-btn" style={{background:"linear-gradient(135deg,#2A4A5A,#3A7A8A)",border:"none",color:"white"}} onClick={()=>setModal("completa")}>
                <span className="quick-icon">✅</span>
                <span className="quick-label">Giornata Completa</span>
                <span className="quick-sub">Entrata + Uscita tutti</span>
              </button>
              <button className="quick-btn" onClick={()=>{setMemoText(memo);setModal("memo")}}>
                <span className="quick-icon">📝</span>
                <span className="quick-label">Memo Giornaliero</span>
                <span className="quick-sub">{memo?"Modifica nota":"Aggiungi nota"}</span>
              </button>
            </div>

            {/* Operai */}
            <div className="section-title">
              👷 Operai
              <span className="section-sub">Tocca per segnare presenza</span>
            </div>
            <div className="workers-list">
              {WORKERS.map((w,i)=>{
                const rec=getToday(w);
                const stats=getStats(w);
                const status=rec?.exit?"done":rec?.entry?"working":"absent";
                const statusColor=status==="done"?"#2D5A27":status==="working"?"#C8A84B":"#ccc";
                return (
                  <div key={w} className="worker-card"
                    style={{"--status-color":statusColor}}
                    onClick={()=>{setSelWorker(w);setPresDate(today());setModal("segna")}}>
                    <div className="worker-avatar" style={{background:AVATAR_COLORS[i%AVATAR_COLORS.length]}}>
                      {w.slice(0,2).toUpperCase()}
                    </div>
                    <div className="worker-info">
                      <div className="worker-name">{w}</div>
                      <div>
                        {status==="done" && <span className="status-pill pill-done">✅ {rec.entry} → {rec.exit}</span>}
                        {status==="working" && <span className="status-pill pill-work">🌿 Entrato {rec.entry}</span>}
                        {status==="absent" && <span className="status-pill pill-absent">— Non registrato</span>}
                      </div>
                    </div>
                    <div className="worker-stats">
                      <div className="stat-hours">{stats.hours.toFixed(1)}h</div>
                      <div className="stat-days">{stats.days} GG MESE</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB SEGNA */}
        {tab==="segna" && (
          <div className="form-card">
            <div className="form-title">✏️ Segna Presenza</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Operaio</label>
                <select value={selWorker} onChange={e=>setSelWorker(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {WORKERS.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Data</label>
                <input type="date" value={presDate} onChange={e=>setPresDate(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Ingresso</label>
                <select value={entryT} onChange={e=>setEntryT(e.target.value)}>
                  <option value="">— Orario —</option>
                  {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Uscita</label>
                <select value={exitT} onChange={e=>setExitT(e.target.value)}>
                  <option value="">— Orario —</option>
                  {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Cantiere</label>
              <select value={site} onChange={e=>setSite(e.target.value)}>
                <option value="">— Seleziona cantiere —</option>
                {SITES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {site==="Altro..." && (
              <div className="field">
                <label className="field-label">Descrivi il lavoro</label>
                <input type="text" placeholder="Es: Potatura privata..." value={customSite} onChange={e=>setCustomSite(e.target.value)} />
              </div>
            )}
            <div className="btn-row">
              <button className="btn-action primary" onClick={doSegnaIngresso}>🌅 Segna Ingresso</button>
              <button className="btn-action secondary" onClick={doSegnaUscita}>🌇 Segna Uscita</button>
            </div>
          </div>
        )}

        {/* TAB RIEPILOGO */}
        {tab==="riepilogo" && (
          <>
            <div className="filter-row">
              <div className="field">
                <label className="field-label">Mese</label>
                <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Operaio</label>
                <select value={filterWorker} onChange={e=>setFilter(e.target.value)}>
                  <option value="all">Tutti</option>
                  {WORKERS.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="export-row">
                <button className="btn-export" style={{background:"#1D6F42",color:"white"}} onClick={()=>exportExcel(filteredRecs,filterMonth||"tutto")}>📊</button>
                <button className="btn-export" style={{background:"#C0392B",color:"white"}} onClick={()=>exportPDF(filteredRecs,filterMonth||"tutto")}>📄</button>
              </div>
            </div>

            <div className="section-title" style={{marginBottom:12}}>Ore e Giornate</div>
            <div className="summary-grid">
              {(filterWorker==="all"?WORKERS:[filterWorker]).map(w=>{
                const recs=records.filter(r=>r.worker===w&&r.exit&&(!filterMonth||monthKey(r.date)===filterMonth));
                return (
                  <div className="sum-card" key={w}>
                    <div className="sum-name">{w}</div>
                    <div className="sum-h">{recs.reduce((s,r)=>s+calcHours(r.entry,r.exit),0).toFixed(1)}<span style={{fontSize:14,color:"var(--muted)",marginLeft:2}}>h</span></div>
                    <div className="sum-d">{recs.length} giornate</div>
                  </div>
                );
              })}
            </div>

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div className="section-title" style={{marginBottom:0}}>Dettaglio</div>
              <button onClick={async()=>{
                const nr={id:Date.now(),worker:WORKERS[0],date:today(),entry:"",exit:null,site:null};
                await updateRecords([...records,nr]);
                startEdit(nr);
              }} style={{background:"var(--green)",color:"white",border:"none",padding:"8px 14px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>＋ Aggiungi</button>
            </div>
            <div className="tbl-wrap">
              {filteredRecs.length===0
                ? <div className="no-data">🌱 Nessuna presenza per questo periodo</div>
                : <table className="tbl">
                    <thead><tr><th>Data</th><th>Operaio</th><th>Ing.</th><th>Usc.</th><th>Ore</th><th>Gg</th><th>Cantiere</th><th></th></tr></thead>
                    <tbody>
                      {filteredRecs.map(r=>{
                        const h=r.exit?calcHours(r.entry,r.exit):null;
                        const isE=editingId===r.id;
                        return (
                          <tr key={r.id} style={{background:isE?"#F0F7EE":""}}>
                            <td>{isE?<input type="date" value={editData.date} onChange={e=>setEditData({...editData,date:e.target.value})} style={{fontSize:11,padding:"2px 4px",border:"1px solid #ccc",borderRadius:4,width:100}} />:<span style={{color:r.date===todayStr?"var(--green)":"inherit",fontWeight:r.date===todayStr?600:400}}>{fmtDate(r.date)}</span>}</td>
                            <td>{isE?<select value={editData.worker} onChange={e=>setEditData({...editData,worker:e.target.value})} style={{fontSize:11,padding:"2px 4px"}}>{WORKERS.map(w=><option key={w} value={w}>{w}</option>)}</select>:<b>{r.worker}</b>}</td>
                            <td>{isE?<select value={editData.entry} onChange={e=>setEditData({...editData,entry:e.target.value})} style={{fontSize:11,padding:"2px 4px"}}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select>:r.entry||"—"}</td>
                            <td>{isE?<select value={editData.exit} onChange={e=>setEditData({...editData,exit:e.target.value})} style={{fontSize:11,padding:"2px 4px"}}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select>:r.exit||"—"}</td>
                            <td style={{fontFamily:"Cormorant Garamond,serif",fontWeight:700,color:"var(--green)",fontSize:14}}>{isE?(editData.entry&&editData.exit?`${calcHours(editData.entry,editData.exit).toFixed(1)}h`:"—"):(h!==null?`${h.toFixed(1)}h`:"—")}</td>
                            <td style={{textAlign:"center"}}>{r.exit?"✅":"—"}</td>
                            <td>{isE?<select value={editData.site} onChange={e=>setEditData({...editData,site:e.target.value})} style={{fontSize:11,padding:"2px 4px",maxWidth:120}}><option value="">—</option>{SITES.map(s=><option key={s} value={s}>{s}</option>)}</select>:<span style={{color:"var(--muted)",fontSize:11}}>{r.site||"—"}</span>}</td>
                            <td>
                              {isE
                                ?<div style={{display:"flex",gap:4}}><button onClick={()=>saveEdit(r.id)} style={{background:"var(--green)",color:"white",border:"none",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:11}}>✅</button><button onClick={()=>setEditingId(null)} style={{background:"var(--beige)",border:"none",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:11}}>✖</button></div>
                                :<div style={{display:"flex",gap:4}}><button onClick={()=>startEdit(r)} style={{background:"var(--beige)",border:"none",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:12}}>✏️</button><button onClick={()=>deletePres(r.id)} style={{background:"#FDF0EE",border:"none",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:12}}>🗑️</button></div>}
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
            <div className="section-title">📅 Settimana Corrente</div>
            <div className="week-wrap">
              <table className="week-table">
                <thead>
                  <tr>
                    <th>Operaio</th>
                    {weekDays.map(d=>(
                      <th key={d}>
                        {new Date(d+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short"})}<br/>
                        <span style={{fontSize:9,opacity:.7}}>{new Date(d+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})}</span>
                      </th>
                    ))}
                    <th>Ore</th><th>Gg</th>
                  </tr>
                </thead>
                <tbody>
                  {WORKERS.map(w=>{
                    const wRecs=records.filter(r=>r.worker===w&&weekDays.includes(r.date));
                    const totH=wRecs.filter(r=>r.exit).reduce((s,r)=>s+calcHours(r.entry,r.exit),0);
                    const totD=wRecs.filter(r=>r.exit).length;
                    return (
                      <tr key={w}>
                        <td className="wname">{w}</td>
                        {weekDays.map(d=>{
                          const rec=records.find(r=>r.worker===w&&r.date===d);
                          const h=rec?.exit?calcHours(rec.entry,rec.exit):null;
                          return <td key={d} className={rec?.exit?"wcell-done":rec?.entry?"wcell-wip":"wcell-no"}>{rec?.exit?`${h?.toFixed(1)}h`:rec?.entry?"…":"—"}</td>;
                        })}
                        <td className="wtot">{totH.toFixed(1)}h</td>
                        <td style={{fontWeight:600}}>{totD}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="bottom-nav">
        {[["oggi","📋","Oggi"],["segna","✏️","Segna"],["riepilogo","📊","Mese"],["settimana","📅","Settimana"]].map(([id,icon,label])=>(
          <button key={id} className={`nav-item ${tab===id?"active":""}`} onClick={()=>setTab(id)}>
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      {modal==="segna" && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal">
            <div className="modal-title">✏️ Segna Presenza — {selWorker}</div>
            <div className="form-grid" style={{marginBottom:12}}>
              <div className="field"><label className="field-label">Data</label><input type="date" value={presDate} onChange={e=>setPresDate(e.target.value)} /></div>
              <div className="field"><label className="field-label">Operaio</label><select value={selWorker} onChange={e=>setSelWorker(e.target.value)}>{WORKERS.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
              <div className="field"><label className="field-label">Ingresso</label><select value={entryT} onChange={e=>setEntryT(e.target.value)}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="field"><label className="field-label">Uscita</label><select value={exitT} onChange={e=>setExitT(e.target.value)}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div className="field"><label className="field-label">Cantiere</label><select value={site} onChange={e=>setSite(e.target.value)}><option value="">— Seleziona —</option>{SITES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            {site==="Altro..." && <div className="field"><label className="field-label">Descrivi</label><input type="text" value={customSite} onChange={e=>setCustomSite(e.target.value)} placeholder="Es: Potatura privata..." /></div>}
            <div className="btn-row" style={{marginTop:16}}>
              <button className="btn-action primary" onClick={doSegnaIngresso}>🌅 Ingresso</button>
              <button className="btn-action secondary" onClick={doSegnaUscita}>🌇 Uscita</button>
              <button className="btn-action danger" onClick={()=>setModal(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {modal==="tutti" && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal">
            <div className="modal-title">🌅 Tutti Entrati</div>
            <div className="field"><label className="field-label">Orario Ingresso</label><select value={tuttiT} onChange={e=>setTuttiT(e.target.value)}><option value="">— Seleziona —</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div className="field"><label className="field-label">Cantiere</label><select value={tuttiSite} onChange={e=>setTuttiSite(e.target.value)}><option value="">— Seleziona —</option>{SITES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            {tuttiSite==="Altro..." && <div className="field"><label className="field-label">Descrivi</label><input type="text" value={customSite} onChange={e=>setCustomSite(e.target.value)} placeholder="Es: Potatura privata..." /></div>}
            <div className="btn-row" style={{marginTop:16}}>
              <button className="btn-action primary btn-full" onClick={doTutti}>✅ Conferma per tutti</button>
              <button className="btn-action danger btn-full" onClick={()=>setModal(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {modal==="chiudi" && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal">
            <div className="modal-title">🌇 Chiudi Giornata a Tutti</div>
            <p style={{color:"var(--muted)",fontSize:13,marginBottom:16}}>Segnerà l'uscita a tutti gli operai che hanno l'ingresso ma non ancora l'uscita.</p>
            <div className="field"><label className="field-label">Orario Uscita</label><select value={tuttiExitT} onChange={e=>setTuttiExitT(e.target.value)}><option value="">— Seleziona —</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div className="btn-row" style={{marginTop:16}}>
              <button className="btn-action primary btn-full" onClick={doChiudiTutti}>✅ Chiudi giornata</button>
              <button className="btn-action danger btn-full" onClick={()=>setModal(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {modal==="completa" && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal">
            <div className="modal-title">✅ Giornata Completa</div>
            <div className="form-grid" style={{marginBottom:12}}>
              <div className="field"><label className="field-label">Ingresso</label><select value={tuttiT} onChange={e=>setTuttiT(e.target.value)}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="field"><label className="field-label">Uscita</label><select value={tuttiExitT} onChange={e=>setTuttiExitT(e.target.value)}><option value="">—</option>{TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div className="field"><label className="field-label">Cantiere</label><select value={tuttiSite} onChange={e=>setTuttiSite(e.target.value)}><option value="">— Seleziona —</option>{SITES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            {tuttiSite==="Altro..." && <div className="field"><label className="field-label">Descrivi</label><input type="text" value={customSite} onChange={e=>setCustomSite(e.target.value)} placeholder="Es: Potatura privata..." /></div>}
            <div className="btn-row" style={{marginTop:16}}>
              <button className="btn-action primary btn-full" onClick={doCompleta}>✅ Giornata completa per tutti</button>
              <button className="btn-action danger btn-full" onClick={()=>setModal(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {modal==="memo" && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="modal">
            <div className="modal-title">📝 Memo Giornaliero</div>
            <div className="field">
              <label className="field-label">Nota del giorno</label>
              <textarea value={memoText} onChange={e=>setMemoText(e.target.value)} placeholder="Es: Oggi piove, lavoriamo al coperto..." style={{width:"100%",minHeight:100,background:"var(--cream)",border:"1.5px solid var(--border)",borderRadius:12,padding:"12px 14px",fontFamily:"Outfit,sans-serif",fontSize:14,outline:"none",resize:"vertical",color:"var(--text)"}} />
            </div>
            <div className="btn-row" style={{marginTop:8}}>
              <button className="btn-action primary btn-full" onClick={doSaveMemo}>💾 Salva Memo</button>
              <button className="btn-action danger btn-full" onClick={()=>setModal(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

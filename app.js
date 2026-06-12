const colors = ["#36e7ff","#4dff9a","#7c5cff","#ffce45","#ff477e","#00b7ff","#22ffaa","#b967ff","#00ffd5"];
const $ = id => document.getElementById(id);
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let firms = [];
let payouts = [];

let showAllHistory = false;

function usd(n){return "$"+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
function today(){return new Date().toISOString().slice(0,10);}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[s]));}

async function init(){
  $("dateInput").value = today();
  const { data } = await sb.auth.getSession();
  currentUser = data.session?.user || null;
  updateAuthView();
  if(currentUser) await loadData();

  sb.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAuthView();
    if(currentUser) await loadData();
  });
}

function updateAuthView(){
  const loggedIn = !!currentUser;
  $("loginView").classList.toggle("hidden", loggedIn);
  $("appView").classList.toggle("hidden", !loggedIn);
  $("signOutBtn").classList.toggle("hidden", !loggedIn);
}

async function signIn(){
  await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

async function signOut(){
  await sb.auth.signOut();
}

async function loadData(){
  const { data: firmData, error: firmErr } = await sb.from("prop_firms").select("*").order("created_at", { ascending:true });
  if(firmErr){ alert("firm読み込みエラー: "+firmErr.message); return; }

  const { data: payoutData, error: payoutErr } = await sb.from("payouts").select("*").order("created_at", { ascending:false });
  if(payoutErr){ alert("payout読み込みエラー: "+payoutErr.message); return; }

  firms = firmData || [];
  payouts = payoutData || [];
  render();
}

function firmTotals(firmId){
  const list = payouts.filter(p => p.firm_id === firmId);
  return { count:list.length, amount:list.reduce((s,p)=>s+Number(p.amount),0) };
}

function render(){
  const totalCount = payouts.length;
  const totalAmount = payouts.reduce((s,p)=>s+Number(p.amount),0);
  $("totalAmount").textContent = usd(totalAmount);
  $("totalCount").textContent = totalCount;
  $("firmCount").textContent = firms.length;
  $("avgAmount").textContent = usd(totalCount ? totalAmount / totalCount : 0);
  $("statusText").textContent = `${firms.length} firms / ${totalCount} payouts`;

  $("firmSelect").innerHTML = "";
  firms.forEach(f=>{
    const opt=document.createElement("option");
    opt.value=f.id; opt.textContent=f.name; $("firmSelect").appendChild(opt);
  });

  $("firmList").innerHTML = firms.length ? "" : `<div class="empty">Prop firmを追加してね</div>`;
  firms.forEach((firm,index)=>{
    const t = firmTotals(firm.id);
    const card = document.createElement("div");
    card.className = "firm-card";
    card.style.setProperty("--firm-color", firm.color || colors[index % colors.length]);
    card.innerHTML = `
      <div class="firm-top">
        <div class="firm-name">${escapeHtml(firm.name)}</div>
        <button class="ghost danger tiny-btn" data-delete-firm="${firm.id}">Delete</button>
      </div>
      <div class="firm-stats">
        <div class="stat"><strong>${t.count}</strong><span>Payout Times</span></div>
        <div class="stat"><strong>${usd(t.amount)}</strong><span>Total USD</span></div>
      </div>`;
    $("firmList").appendChild(card);
  });

  if ($("seeAllBtn")) {
    $("seeAllBtn").textContent = showAllHistory ? "Show Less" : "See All";
  }

  const displayPayouts = showAllHistory ? payouts : payouts.slice(0, 20);

  $("historyList").innerHTML = displayPayouts.length ? "" : `<div class="empty">まだpayout履歴なし</div>`;

  displayPayouts.forEach(p=>{
    const firm = firms.find(f => f.id === p.firm_id);
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div>
        <div class="history-main">${escapeHtml(firm?.name || p.firm_name || "Deleted Firm")}</div>
        <div class="history-sub">${p.payout_date || ""}${p.memo ? " ・ " + escapeHtml(p.memo) : ""}</div>
      </div>
      <div>
        <div class="amount">${usd(p.amount)}</div>
        <button class="ghost danger tiny-btn" data-delete-payout="${p.id}">Delete</button>
      </div>`;
    $("historyList").appendChild(div);
  });

async function addFirm(){
  const name = $("firmNameInput").value.trim();
  if(!name || !currentUser) return;
  const color = colors[firms.length % colors.length];
  const { error } = await sb.from("prop_firms").insert({ name, color, user_id: currentUser.id });
  if(error) return alert(error.message);
  $("firmNameInput").value = "";
  await loadData();
}

async function addPayout(){
  const firmId = $("firmSelect").value;
  const firm = firms.find(f => f.id === firmId);
  const amount = Number($("amountInput").value);
  if(!firm || !amount || amount <= 0 || !currentUser) return;
  const { error } = await sb.from("payouts").insert({
    user_id: currentUser.id,
    firm_id: firmId,
    firm_name: firm.name,
    amount,
    payout_date: $("dateInput").value || today(),
    memo: $("memoInput").value.trim()
  });
  if(error) return alert(error.message);
  $("amountInput").value = "";
  $("memoInput").value = "";
  $("dateInput").value = today();
  await loadData();
}

async function deleteFirm(id){
  if(!confirm("このProp firmを消す？関連payoutも消えるよ。")) return;
  let { error } = await sb.from("payouts").delete().eq("firm_id", id);
  if(error) return alert(error.message);
  ({ error } = await sb.from("prop_firms").delete().eq("id", id));
  if(error) return alert(error.message);
  await loadData();
}

async function deletePayout(id){
  const { error } = await sb.from("payouts").delete().eq("id", id);
  if(error) return alert(error.message);
  await loadData();
}

async function clearHistory(){
  if(!confirm("全payout履歴を消す？")) return;
  const { error } = await sb.from("payouts").delete().eq("user_id", currentUser.id);
  if(error) return alert(error.message);
  await loadData();
}

document.addEventListener("click", e=>{
  const firmId = e.target.dataset.deleteFirm;
  const payoutId = e.target.dataset.deletePayout;
  if(firmId) deleteFirm(firmId);
  if(payoutId) deletePayout(payoutId);
});

$("googleLoginBtn").addEventListener("click", signIn);
$("signOutBtn").addEventListener("click", signOut);
$("addFirmBtn").addEventListener("click", addFirm);
$("addPayoutBtn").addEventListener("click", addPayout);
$("clearHistoryBtn").addEventListener("click", clearHistory);
$("firmNameInput").addEventListener("keydown", e=>{if(e.key==="Enter") addFirm();});
const seeAllBtn = $("seeAllBtn");
if (seeAllBtn) {
  seeAllBtn.addEventListener("click", () => {
    showAllHistory = !showAllHistory;
    render();
  });
}

init();

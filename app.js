/************ CONFIG (already set) ************/
const API = "https://script.google.com/macros/s/AKfycbz6jVshsaKlkw5-9UIQ1GfFkE9EHJi79d-fupYvOYgbGDMypDCkrbfUij-f-VRz2NYZ/exec";
const UPI_VPA = "9205713725@paytm";
const ORG = "BKU Bhagat Singh";
/************************************************/

let TOKEN = localStorage.getItem("BKU_TOKEN") || "";

/* Helpers */
const qs = (s) => document.querySelector(s);
function ok(el, txt) { el.className = "msg ok"; el.textContent = txt; }
function err(el, txt) { el.className = "msg err"; el.textContent = txt; }
function b64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
async function GET(path) {
  const r = await fetch(`${API}?path=${encodeURIComponent(path)}&origin=${encodeURIComponent(location.origin)}`);
  return r.json();
}
async function POST(path, body) {
  const r = await fetch(`${API}?path=${encodeURIComponent(path)}&origin=${encodeURIComponent(location.origin)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
function scrollToJoin(){ location.hash = "#join"; }

/* Feeds */
async function loadNews(){
  const box=qs("#newsList"); box.textContent="लोड हो रहा…";
  try{
    const res=await GET("news");
    const list = res.ok ? res.data : [];
    box.innerHTML = list.length ? list.map(n => `
      <div class="card">
        ${n.image ? `${n.image}` : ""}
        <h3>${n.title || ""}</h3>
        <p>${n.body || ""}</p>
        <small>${n.timestamp || ""}</small>
      </div>
    `).join("") : "कोई समाचार नहीं";
  }catch{ box.textContent="Error"; }
}
async function loadGallery(){
  const box=qs("#galList"); box.textContent="लोड हो रहा…";
  try{
    const res=await GET("gallery");
    const list = res.ok ? res.data : [];
    box.innerHTML = list.length ? list.map(g => `
      <figure>
        ${g.image}
        <figcaption>${g.caption || ""}</figcaption>
      </figure>
    `).join("") : "खाली";
  }catch{ box.textContent="Error"; }
}
async function loadLeaders(){
  const box=qs("#leadList"); box.textContent="लोड हो रहा…";
  try{
    const res=await GET("leaders");
    const list=res.ok ? res.data : [];
    box.innerHTML = list.length ? list.map(l => `
      <div class="card">
        ${l.photo ? `${l.photo}` : ""}
        <h3>${l.name || ""}</h3>
        <p>${l.role || ""}</p>
        <small>${[l.city, l.state].filter(Boolean).join(", ")}</small>
      </div>
    `).join("") : "खाली";
  }catch{ box.textContent="Error"; }
}

/* Lookups (State → District) */
async function loadLookups(){
  const res=await GET("states");
  const st=qs("#m-state"), di=qs("#m-district");
  const states = res.ok ? res.data.states : ["ALL STATES"];
  const map = res.ok ? res.data.map : {"ALL STATES":[]};

  st.innerHTML="";
  states.forEach(s => {
    const o=document.createElement("option");
    o.value=s; o.textContent=s; st.appendChild(o);
  });

  function paint(){
    const list = (st.value==="ALL STATES") ? Object.values(map).flat() : (map[st.value] || []);
    di.innerHTML="";
    list.forEach(d => {
      const o=document.createElement("option");
      o.value=d; o.textContent=d; di.appendChild(o);
    });
  }

  st.addEventListener("change", paint);
  paint();
}

/*************** OTP ***************/
async function sendOtp(){
  const m=qs("#m-msg"); m.className="msg"; m.textContent="";
  const email=qs("#m-email").value.trim();
  const name =qs("#m-name").value.trim().toUpperCase();
  const mobile=qs("#m-mobile").value.trim();

  if(!email) return err(m,"ईमेल चाहिए");
  const r=await POST("auth.sendotp",{email,name,mobile});
  r.ok ? ok(m,"OTP भेज दिया गया") : err(m, r.error || "Error");
}
async function verifyOtp(){
  const m=qs("#m-msg"); m.className="msg"; m.textContent="";
  const email=qs("#m-email").value.trim();
  const code =qs("#m-otp").value.trim();

  if(!email || !code) return err(m,"ईमेल और OTP चाहिए");
  const r=await POST("auth.verifyotp",{email,code});
  if(r.ok){ TOKEN=r.token; localStorage.setItem("BKU_TOKEN",TOKEN); ok(m,"Login सफल"); qs("#admin").classList.remove("hide"); }
  else err(m, r.error || "Error");
}

/*************** Membership ***************/
async function registerMember(){
  const m=qs("#m-msg"); m.className="msg"; m.textContent="";
  const name=qs("#m-name").value.trim().toUpperCase();
  const email=qs("#m-email").value.trim();
  const mobile=qs("#m-mobile").value.trim();
  const alt=qs("#m-alt").value.trim();
  const state=qs("#m-state").value.trim().toUpperCase();
  const district=qs("#m-district").value.trim().toUpperCase();
  const city=qs("#m-city").value.trim().toUpperCase();
  const f=qs("#m-photo").files[0];
  const photoBase64 = f ? await b64(f) : "";

  const r=await POST("member.register",{
    token:TOKEN, name, email, mobile, altMobile:alt, state, district, city, photoBase64
  });

  r.ok ? ok(m, `সদস্যতা बन गयी. ID: ${r.memberId}`) : err(m, r.error || "Error");
}

/*************** Admin: News & Gallery ***************/
async function createNews(){
  const a=qs("#a-msg"); a.className="msg"; a.textContent="";
  const title=qs("#n-title").value.trim().toUpperCase();
  const body =qs("#n-body").value.trim().toUpperCase();
  const f=qs("#n-img").files[0];
  const imageBase64 = f ? await b64(f) : "";

  const r=await POST("news.create",{token:TOKEN,title,body,imageBase64});
  r.ok ? (ok(a,"समाचार जुड़ गया"), loadNews()) : err(a, r.error || "Error");
}
async function uploadGallery(){
  const a=qs("#a-msg"); a.className="msg"; a.textContent="";
  const caption=qs("#g-cap").value.trim().toUpperCase();
  const f=qs("#g-img").files[0]; if(!f) return err(a,"चित्र चाहिए");
  const imageBase64=await b64(f);
  const r=await POST("gallery.upload",{caption,imageBase64});
  r.ok ? (ok(a,"गैलरी में जुड़ गया"), loadGallery()) : err(a, r.error || "Error");
}

/*************** Donation ***************/
function upiIntent(){
  const msg=qs("#d-msg"); msg.className="msg"; msg.textContent="";
  const amount=Number(qs("#d-amount").value || 0);
  if(!UPI_VPA) return err(msg, "UPI ID सेट करें");
  if(!amount || amount<1) return err(msg,"राशि सही डालें");

  const url = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(ORG)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Donation")}`;
  window.location.href = url;

  ok(msg,"UPI ऐप खुलेगी. भुगतान के बाद नीचे 'भुगतान लॉग' कर दें (optional).");
}
async function logDonation(){
  const msg=qs("#d-msg"); msg.className="msg"; msg.textContent="";
  const name=qs("#d-name").value.trim().toUpperCase();
  const mobile=qs("#d-mobile").value.trim();
  const amount=Number(qs("#d-amount").value || 0);
  const ref=qs("#d-ref").value.trim().toUpperCase();

  if(!amount || amount<1) return err(msg,"राशि सही दें");
  const r=await POST("donate.log",{name,mobile,amount,mode:"UPI",ref});
  r.ok ? ok(msg,"धन्यवाद! रिकॉर्ड हो गया") : err(msg, r.error || "Error");
}

/*************** Init ***************/
loadLookups();
loadNews();
loadGallery();
loadLeaders();
if (TOKEN) qs("#admin").classList.remove("hide");

/* Force UPPERCASE typing (UX) */
document.addEventListener("input",(e)=>{
  const el=e.target; if(!el) return;
  const isText=(el.tagName==="INPUT" && (el.type==="text"||!el.type));
  if(isText){ const v=el.value; if(/[a-z]/.test(v)) el.value=v.toUpperCase(); }
}, true);
``

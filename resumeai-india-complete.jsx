const { useState, useCallback, useRef, useEffect } = React;

// ─────────────────────────────────────────────────────────────────────────────
// AI CALL
// ─────────────────────────────────────────────────────────────────────────────
async function callAI(system, user, maxTokens = 600) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error("AI call failed");
  const d = await res.json();
  return d.content?.[0]?.text?.trim() || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = {
  free:      { name:"Free",      price:"₹0",        period:"forever",   color:"#2ecc71", icon:"🆓", limits:{ aiSummary:true, aiBullets:1, aiSkills:false, atsChecks:5, jobMatch:2, templates:3, pdfExports:5, docx:false, shareLink:false, coverLetter:false, salaryInsight:false, callScript:false, deepAnalysis:false, resumeBuilds:3 } },
  pro:       { name:"Pro",       price:"₹1,249",    period:"/month",    color:"#0057FF", icon:"⚡", limits:{ aiSummary:true, aiBullets:Infinity, aiSkills:true, atsChecks:Infinity, jobMatch:Infinity, templates:50, pdfExports:Infinity, docx:true, shareLink:true, coverLetter:true, salaryInsight:true, callScript:true, deepAnalysis:true, resumeBuilds:Infinity } },
  recruiter: { name:"Recruiter", price:"₹4,999",    period:"/6 months", color:"#FF5733", icon:"🏢", limits:{ aiSummary:true, aiBullets:Infinity, aiSkills:true, atsChecks:Infinity, jobMatch:Infinity, templates:50, pdfExports:Infinity, docx:true, shareLink:true, coverLetter:true, salaryInsight:true, callScript:true, deepAnalysis:true, resumeBuilds:Infinity, bulkReview:true, candidateTracking:true, teamAccess:5 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────
const INIT_FORM = {
  name:"", email:"", phone:"", city:"", linkedin:"", portfolio:"", summary:"",
  college:"", degree:"", branch:"", cgpa:"", gradYear:"",
  school:"", board:"", marks10:"", year10:"",
  jobs:[{ jobTitle:"", company:"", duration:"", location:"", bullets:"" }],
  technicalSkills:"", softSkills:"", certifications:"", languages:"", tools:"",
};

const POPULAR_SKILLS = ["Java","Python","React","Angular","Spring Boot","MySQL","MongoDB","AWS","Azure","Docker","Git","REST API","Node.js","TypeScript","Kubernetes","JIRA","Power BI","Agile/Scrum"];

// ─────────────────────────────────────────────────────────────────────────────
// RESUME HTML BUILDERS (print-safe)
// ─────────────────────────────────────────────────────────────────────────────
function buildResume(data, tpl) {
  const ac = { modern:"#0057FF", classic:"#1a1a2e", minimal:"#2ecc71", creative:"#FF5733" }[tpl] || "#0057FF";
  const jobs = (data.jobs||[]).map(j => j.company ? `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-weight:700;font-size:10pt;">${j.jobTitle}</span>
        <span style="font-size:8.5pt;color:#888;">${j.duration}</span>
      </div>
      <div style="color:${ac};font-weight:600;font-size:9pt;margin-bottom:3px;">${j.company}${j.location?" · "+j.location:""}</div>
      ${j.bullets ? j.bullets.split("\n").filter(Boolean).map(b=>`<div style="font-size:9pt;color:#444;padding-left:10px;margin-bottom:2px;">• ${b}</div>`).join("") : ""}
    </div>` : "").join("");

  const edu = (data.education||[data]).map ? (data.education||[]).map(e=>`
    <div style="margin-bottom:8px;">
      <div style="font-weight:700;font-size:9.5pt;">${e.degree||data.degree||""}</div>
      <div style="color:#555;font-size:8.5pt;">${e.college||data.college||""}</div>
      <div style="color:#888;font-size:8.5pt;">${e.cgpa||data.cgpa||""} ${e.year||data.gradYear ? "· "+(e.year||data.gradYear) : ""}</div>
    </div>`).join("") : "";

  const eduFromForm = data.college ? `
    <div style="margin-bottom:8px;">
      <div style="font-weight:700;font-size:9.5pt;">${data.degree||""} ${data.branch||""}</div>
      <div style="color:#555;font-size:8.5pt;">${data.college}</div>
      <div style="color:#888;font-size:8.5pt;">${data.cgpa||""} ${data.gradYear ? "· "+data.gradYear : ""}</div>
    </div>
    ${data.school ? `<div style="margin-bottom:6px;"><div style="font-weight:700;font-size:9pt;">12th — ${data.board||""}</div><div style="color:#666;font-size:8.5pt;">${data.school} ${data.marks10 ? "· "+data.marks10 : ""} ${data.year10 ? "· "+data.year10 : ""}</div></div>` : ""}
  ` : edu;

  const skills = (data.technicalSkills||"").split(",").map(s=>s.trim()).filter(Boolean).map(s=>
    `<span style="background:${ac}18;color:${ac};border-radius:3px;padding:2px 7px;font-size:8pt;font-weight:700;margin:2px 2px 0 0;display:inline-block;">${s}</span>`
  ).join("");

  if (tpl === "classic") return `
    <div style="font-family:Georgia,serif;font-size:10pt;color:#1a1a2e;line-height:1.6;padding:22px 26px;">
      <div style="text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:12px;margin-bottom:14px;">
        <div style="font-size:19pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${data.name||"Your Name"}</div>
        <div style="font-size:8.5pt;color:#555;margin-top:4px;">${[data.email,data.phone,data.city,data.linkedin].filter(Boolean).join("  |  ")}</div>
      </div>
      ${data.summary?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:7px;">Objective</div><div style="font-size:9.5pt;color:#333;">${data.summary}</div></div>`:""}
      ${jobs?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:8px;">Work Experience</div>${jobs}</div>`:""}
      ${data.college?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:8px;">Education</div>${eduFromForm}</div>`:""}
      ${data.technicalSkills?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:7px;">Technical Skills</div><div style="font-size:9.5pt;color:#333;">${(data.technicalSkills||"").split(",").map(s=>s.trim()).filter(Boolean).join("  ·  ")}</div></div>`:""}
      ${data.tools?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:7px;">Tools & Software</div><div style="font-size:9.5pt;color:#333;">${data.tools}</div></div>`:""}
      ${data.softSkills?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:7px;">Soft Skills</div><div style="font-size:9.5pt;color:#333;">${data.softSkills}</div></div>`:""}
      ${data.certifications?`<div style="margin-bottom:12px;"><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:7px;">Certifications</div><div style="font-size:9.5pt;color:#333;">${data.certifications}</div></div>`:""}
      ${data.languages?`<div><div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;border-bottom:1.5px solid #1a1a2e;padding-bottom:2px;margin-bottom:7px;">Languages</div><div style="font-size:9.5pt;color:#333;">${data.languages}</div></div>`:""}
    </div>`;

  if (tpl === "minimal") return `
    <div style="font-family:Arial,sans-serif;font-size:10pt;color:#1a1a2e;line-height:1.55;padding:22px 26px;">
      <div style="margin-bottom:12px;">
        <div style="font-size:20pt;font-weight:800;color:#1a1a2e;margin-bottom:4px;">${data.name||"Your Name"}</div>
        <div style="font-size:8.5pt;color:#888;">${[data.email,data.phone,data.city,data.linkedin].filter(Boolean).join("  •  ")}</div>
        <div style="height:2px;background:#2ecc71;margin-top:8px;border-radius:2px;"></div>
      </div>
      ${data.summary?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Summary</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div><div style="font-size:9.5pt;color:#444;">${data.summary}</div></div>`:""}
      ${jobs?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Experience</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div>${jobs}</div>`:""}
      ${data.college?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Education</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div>${eduFromForm}</div>`:""}
      ${data.technicalSkills?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Technical Skills</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div>${skills}</div>`:""}
      ${data.tools?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Tools & Software</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div><div style="font-size:9.5pt;color:#444;">${data.tools}</div></div>`:""}
      ${data.softSkills?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Soft Skills</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div><div style="font-size:9.5pt;color:#444;">${data.softSkills}</div></div>`:""}
      ${data.certifications?`<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Certifications</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div><div style="font-size:9.5pt;color:#444;">${data.certifications}</div></div>`:""}
      ${data.languages?`<div><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="font-size:8.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;">Languages</span><div style="flex:1;height:1px;background:#e8e8e8;"></div></div><div style="font-size:9.5pt;color:#444;">${data.languages}</div></div>`:""}
    </div>`;

  if (tpl === "creative") return `
    <div style="font-family:Arial,sans-serif;font-size:10pt;color:#1a1a2e;line-height:1.55;display:flex;min-height:500px;">
      <div style="width:30%;background:#1e1e2e;padding:18px 12px;flex-shrink:0;">
        <div style="border-bottom:2px solid #FF5733;padding-bottom:12px;margin-bottom:14px;">
          <div style="font-size:14pt;font-weight:800;color:#fff;line-height:1.2;margin-bottom:5px;">${data.name||"Your Name"}</div>
          ${data.jobs?.[0]?.jobTitle?`<div style="font-size:8pt;color:#FF5733;font-weight:700;text-transform:uppercase;">${data.jobs[0].jobTitle}</div>`:""}
        </div>
        <div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;margin-bottom:6px;">Contact</div>
        ${[data.email,data.phone,data.city,data.linkedin].filter(Boolean).map(v=>`<div style="font-size:7.5pt;color:#aaa;margin-bottom:3px;word-break:break-all;">${v}</div>`).join("")}
        ${data.technicalSkills?`
        <div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;margin:12px 0 8px;">Skills</div>
        ${(data.technicalSkills||"").split(",").slice(0,8).map((s,i)=>`<div style="margin-bottom:5px;"><div style="font-size:8pt;color:#ccc;margin-bottom:2px;">${s.trim()}</div><div style="height:3px;background:rgba(255,255,255,0.1);border-radius:2px;"><div style="height:100%;width:${65+(i%4)*9}%;background:#FF5733;border-radius:2px;"></div></div></div>`).join("")}
        `:""}
        ${data.languages?`<div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;margin:10px 0 6px;">Languages</div><div style="font-size:8pt;color:#aaa;">${data.languages}</div>`:""}
      </div>
      <div style="flex:1;padding:18px 16px;">
        ${data.summary?`<div style="margin-bottom:12px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;border-bottom:1.5px solid #FF573333;padding-bottom:3px;margin-bottom:7px;">Profile</div><div style="font-size:9.5pt;color:#444;">${data.summary}</div></div>`:""}
        ${jobs?`<div style="margin-bottom:12px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;border-bottom:1.5px solid #FF573333;padding-bottom:3px;margin-bottom:8px;">Experience</div>${jobs}</div>`:""}
        ${data.college?`<div style="margin-bottom:12px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;border-bottom:1.5px solid #FF573333;padding-bottom:3px;margin-bottom:8px;">Education</div>${eduFromForm}</div>`:""}
        ${data.certifications?`<div style="margin-bottom:12px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;border-bottom:1.5px solid #FF573333;padding-bottom:3px;margin-bottom:6px;">Certifications</div><div style="font-size:9pt;color:#444;">${data.certifications}</div></div>`:""}
        ${data.tools?`<div style="margin-bottom:12px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;border-bottom:1.5px solid #FF573333;padding-bottom:3px;margin-bottom:6px;">Tools & Software</div><div style="font-size:9pt;color:#444;">${data.tools}</div></div>`:""}
        ${data.softSkills?`<div><div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#FF5733;border-bottom:1.5px solid #FF573333;padding-bottom:3px;margin-bottom:6px;">Soft Skills</div><div style="font-size:9pt;color:#444;">${data.softSkills}</div></div>`:""}
      </div>
    </div>`;

  // Default: Modern Pro
  return `
    <div style="font-family:Arial,sans-serif;font-size:10pt;color:#1a1a2e;line-height:1.55;">
      <div style="background:#0057FF;padding:18px 22px;color:#fff;">
        <div style="font-size:20pt;font-weight:800;margin-bottom:4px;">${data.name||"Your Name"}</div>
        <div style="font-size:8.5pt;opacity:0.88;">${[data.email,data.phone,data.city,data.linkedin,data.portfolio].filter(Boolean).join("  •  ")}</div>
      </div>
      <div style="padding:16px 22px;">
        ${data.summary?`<div style="margin-bottom:12px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:6px;">Professional Summary</div><div style="font-size:9.5pt;color:#444;">${data.summary}</div></div>`:""}
        <div style="display:grid;grid-template-columns:1fr 0.5fr;gap:18px;">
          <div>
            ${jobs?`<div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:8px;">Work Experience</div>${jobs}`:""}
          </div>
          <div>
            ${data.college?`<div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:8px;">Education</div>${eduFromForm}`:""}
            ${data.technicalSkills?`<div style="margin-top:10px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:7px;">Technical Skills</div>${skills}</div>`:""}
            ${data.certifications?`<div style="margin-top:10px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:6px;">Certifications</div><div style="font-size:8.5pt;color:#444;">${data.certifications}</div></div>`:""}
            ${data.tools?`<div style="margin-top:10px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:6px;">Tools & Software</div><div style="font-size:8.5pt;color:#444;">${data.tools}</div></div>`:""}
            ${data.softSkills?`<div style="margin-top:10px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:6px;">Soft Skills</div><div style="font-size:8.5pt;color:#444;">${data.softSkills}</div></div>`:""}
            ${data.languages?`<div style="margin-top:10px;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0057FF;border-bottom:1.5px solid #0057FF44;padding-bottom:3px;margin-bottom:6px;">Languages</div><div style="font-size:8.5pt;color:#444;">${data.languages}</div></div>`:""}
          </div>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT PDF — Works on Android Chrome, Desktop Chrome, Safari
// ─────────────────────────────────────────────────────────────────────────────
function printResume(html, fileName) {
  // Remove any existing frame
  const existing = document.getElementById("resume-print-frame");
  if (existing) existing.remove();

  const frame = document.createElement("div");
  frame.id = "resume-print-frame";
  frame.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#f0f0f0;z-index:99999;overflow:auto;display:flex;flex-direction:column;";

  frame.innerHTML = `
    <div id="rpf-bar" style="background:#0057FF;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:10px;">
      <span style="font-weight:700;font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 ${fileName}</span>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button id="rpf-save" style="background:#fff;color:#0057FF;border:none;border-radius:8px;padding:10px 20px;font-weight:800;font-size:14px;cursor:pointer;">💾 Save as PDF</button>
        <button id="rpf-close" style="background:rgba(255,255,255,0.25);color:#fff;border:none;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;cursor:pointer;">✕</button>
      </div>
    </div>
    <div style="background:#FF9900;color:#fff;padding:10px 16px;font-size:12px;font-weight:600;flex-shrink:0;">
      📱 <strong>Android:</strong> Tap "Save as PDF" → Share icon → Print → Save as PDF &nbsp;|&nbsp; 🖥 <strong>Desktop:</strong> Ctrl+P → Save as PDF
    </div>
    <div style="flex:1;overflow:auto;padding:16px;">
      <div id="rpf-resume" style="max-width:794px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.15);">${html}</div>
    </div>
    <style>
      @media print {
        #rpf-bar, #rpf-bar + div { display:none!important; }
        body > *:not(#resume-print-frame) { display:none!important; }
        #resume-print-frame { position:static!important; background:white!important; padding:0!important; display:block!important; }
        #rpf-resume { max-width:100%!important; box-shadow:none!important; margin:0!important; }
        @page { size:A4; margin:8mm; }
      }
    </style>`;

  document.body.appendChild(frame);

  // Wire up buttons after DOM insert
  document.getElementById("rpf-save").onclick = () => window.print();
  document.getElementById("rpf-close").onclick = () => frame.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = { success:"#2ecc71", error:"#e74c3c", info:"#0057FF", warning:"#f39c12" };
  return <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:bg[type]||bg.info, color:"#fff", borderRadius:10, padding:"11px 22px", fontSize:13, fontWeight:700, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", whiteSpace:"nowrap", animation:"toastIn 0.3s ease" }}>{msg}</div>;
}

function Fld({ label, type="text", value, onChange, placeholder, rows, required, hint }) {
  const s = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 13px", color:"#e8eef8", fontSize:14, fontFamily:"inherit", transition:"border 0.2s", boxSizing:"border-box" };
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#7a90aa", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>{label}{required && <span style={{ color:"#FF5733" }}> *</span>}</label>}
      {rows ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...s, resize:"vertical" }} />
             : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} />}
      {hint && <div style={{ fontSize:11, color:"#445566", marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function AIBtn({ label, busy, onClick, locked, color="#0057FF" }) {
  return (
    <button onClick={locked?undefined:onClick} disabled={busy} style={{ background:locked?"rgba(255,255,255,0.04)":busy?"rgba(0,87,255,0.3)":color, color:locked?"#445":"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:11, fontWeight:700, cursor:locked||busy?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.2s", whiteSpace:"nowrap" }}>
      {busy?"⏳ Generating...":locked?`🔒 ${label}`:`✨ ${label}`}
    </button>
  );
}

function Card({ children, style }) {
  return <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:20, ...style }}>{children}</div>;
}

function SectionHead({ children, icon, color }) {
  return <div style={{ fontSize:15, fontWeight:800, color:color||"#c0cce0", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>{icon&&<span>{icon}</span>}{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── LANDING ──────────────────────────────────────────────────────────────────
function LandingPage({ onStart, plan, setPlan }) {
  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 16px" }}>
      {/* Hero */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center", marginBottom:60 }}>
        <div>
          <div style={{ background:"rgba(0,87,255,0.15)", color:"#4d9fff", border:"1px solid rgba(0,87,255,0.3)", borderRadius:20, padding:"3px 14px", fontSize:12, fontWeight:700, display:"inline-block", marginBottom:18 }}>🇮🇳 India's #1 Free AI Resume Builder</div>
          <h1 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:800, lineHeight:1.1, letterSpacing:-1.5, marginBottom:16 }}>
            Build resumes.<br /><span style={{ color:"#0057FF" }}>Get interviews.</span><br /><span style={{ fontSize:"70%", color:"#8899bb", fontWeight:600 }}>Completely Free.</span>
          </h1>
          <p style={{ fontSize:16, color:"#8899bb", lineHeight:1.7, marginBottom:28, maxWidth:440 }}>
            AI-powered ATS optimization for TCS, Infosys, Flipkart, Google India & 500+ companies. 2.4 lakh+ job seekers trust us.
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button onClick={onStart} style={{ background:"#0057FF", color:"#fff", border:"none", borderRadius:10, padding:"15px 36px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 6px 24px rgba(0,87,255,0.4)" }}>🚀 Build Resume — Free</button>
            <button onClick={()=>setPlan("pro")} style={{ background:"transparent", color:"#0057FF", border:"2px solid #0057FF", borderRadius:10, padding:"13px 28px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View Pro Plans</button>
          </div>
          <div style={{ display:"flex", gap:18, marginTop:20, flexWrap:"wrap" }}>
            {["No credit card required","Setup in 2 minutes","Hindi & English support"].map(t=>(
              <span key={t} style={{ fontSize:12, color:"#4d9fff", display:"flex", alignItems:"center", gap:5 }}><span style={{ color:"#2ecc71" }}>✓</span>{t}</span>
            ))}
          </div>
        </div>
        {/* Feature cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { icon:"🎯", title:"ATS Score Checker", desc:"Real-time keyword match vs job description", badge:"Free" },
            { icon:"🤖", title:"AI Bullet Generator", desc:"Convert plain activities to powerful bullets", badge:"AI" },
            { icon:"📄", title:"50+ Templates", desc:"Modern Pro, Classic IIT, Creative Edge & more", badge:"New" },
            { icon:"🔍", title:"Job Match Analysis", desc:"Skill gap + salary insights for any role", badge:"Pro" },
            { icon:"🇮🇳", title:"India-First Design", desc:"Optimized for Naukri, TCS iBegin, LinkedIn India", badge:"Local" },
            { icon:"⚡", title:"1-Click PDF Export", desc:"ATS-friendly PDF download instantly", badge:"Free" },
          ].map((f,i)=>(
            <div key={i} onClick={onStart} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{f.icon}</div>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{f.title}</div>
              <div style={{ fontSize:11, color:"#7a90aa", lineHeight:1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ background:"rgba(0,87,255,0.06)", border:"1px solid rgba(0,87,255,0.15)", borderRadius:16, padding:"28px 32px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, textAlign:"center", marginBottom:48 }}>
        {[["2.4L+","Resumes Built"],["89%","ATS Pass Rate"],["50+","Templates"],["Free","Forever Plan"]].map(([n,l],i)=>(
          <div key={i}><div style={{ fontSize:32, fontWeight:800, color:"#0057FF" }}>{n}</div><div style={{ fontSize:13, color:"#8899bb", marginTop:4 }}>{l}</div></div>
        ))}
      </div>

      {/* Pricing */}
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:8 }}>Simple Pricing</h2>
        <p style={{ color:"#7a90aa", fontSize:14 }}>No hidden charges. No surprises.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:48 }}>
        {Object.entries(PLANS).map(([key,p])=>(
          <div key={key} style={{ background:key==="pro"?"linear-gradient(135deg,#0057FF,#0040cc)":"rgba(255,255,255,0.04)", border:`2px solid ${plan===key?p.color:"rgba(255,255,255,0.08)"}`, borderRadius:18, padding:24, position:"relative" }}>
            {key==="pro"&&<div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"#FFD700", color:"#1a1a2e", borderRadius:20, padding:"3px 16px", fontSize:11, fontWeight:800 }}>Most Popular</div>}
            <div style={{ fontSize:28, fontWeight:800, letterSpacing:-1, marginBottom:4 }}>{p.price}</div>
            <div style={{ fontSize:14, fontWeight:700, color:key==="pro"?"#a8d4ff":p.color, marginBottom:4 }}>{p.name}</div>
            <div style={{ fontSize:12, color:key==="pro"?"rgba(255,255,255,0.6)":"#556677", marginBottom:16 }}>{p.period}</div>
            <button onClick={()=>{setPlan(key);onStart();}} style={{ width:"100%", background:key==="pro"?"#fff":"#0057FF", color:key==="pro"?"#0057FF":"#fff", border:"none", borderRadius:10, padding:"11px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              {key==="free"?"Start Free":key==="pro"?"Get Pro":"Get Recruiter"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BUILDER ───────────────────────────────────────────────────────────────────
const BUILDER_STEPS = [
  { id:"personal",   label:"Personal",   icon:"👤" },
  { id:"education",  label:"Education",  icon:"🎓" },
  { id:"experience", label:"Experience", icon:"💼" },
  { id:"skills",     label:"Skills",     icon:"⚡" },
  { id:"preview",    label:"Preview",    icon:"👁"  },
];

function Builder({ plan, onNavigate }) {
  const [step,     setStep]     = useState(0);
  const [form,     setForm]     = useState(INIT_FORM);
  const [tpl,      setTpl]      = useState("modern");
  const [busy,     setBusy]     = useState({});
  const [toast,    setToast]    = useState({ msg:"", type:"info" });
  const [showPrev, setShowPrev] = useState(false);
  const pc = PLANS[plan];

  const notify = (msg, type="info") => { setToast({ msg, type }); setTimeout(()=>setToast({ msg:"", type:"info" }), 3000); };
  const upd  = useCallback((f,v)=>setForm(p=>({...p,[f]:v})),[]);
  const updJ = useCallback((i,f,v)=>setForm(p=>{const j=[...p.jobs];j[i]={...j[i],[f]:v};return{...p,jobs:j};}),[]);
  const setB = (k,v)=>setBusy(p=>({...p,[k]:v}));

  const aiSummary = async()=>{
    setB("sum",true);
    try{
      const txt=await callAI(`You are an expert Indian resume writer. Write a 3-line professional summary in English for a job seeker targeting Indian companies. Be concise, ATS-friendly. Output only the summary text.`,
        `Name:${form.name}|Title:${form.jobs[0]?.jobTitle}|Company:${form.jobs[0]?.company}|Skills:${form.technicalSkills}|Degree:${form.degree}`);
      upd("summary",txt);notify("Summary ready!","success");
    }catch(e){notify("Error: "+e.message,"error");}
    setB("sum",false);
  };

  const aiBullets = async(idx)=>{
    const canAI = pc.limits.aiBullets===Infinity||idx<pc.limits.aiBullets;
    if(!canAI){notify("Free plan: 1 job only. Upgrade for more!","error");return;}
    const j=form.jobs[idx];
    if(!j.jobTitle){notify("Add job title first","error");return;}
    setB(`b${idx}`,true);
    try{
      const txt=await callAI(
        `You are an expert Indian resume writer. Your ONLY job is to write exactly 3 resume bullet points.
STRICT RULES:
- Output ONLY 3 bullet points. Nothing else.
- Each bullet starts with "•" on a new line.
- Each bullet starts with a strong action verb (Led, Built, Managed, Achieved, Reduced, Increased, Developed, etc.)
- Include at least one number or metric per bullet (%, ₹, count, time saved, etc.)
- If no details given, INVENT realistic metrics appropriate for the role. Do NOT ask questions.
- Total output: exactly 3 lines starting with "•". No intro. No explanation. No questions.

EXAMPLE OUTPUT FORMAT:
• Managed 50+ client accounts generating ₹15L monthly revenue with 92% retention rate
• Processed 200+ data entries daily in Tally with 99.8% accuracy reducing errors by 40%
• Handled 30+ customer calls daily achieving 4.5/5 CSAT score and 85% first-call resolution`,
        `Job Title: ${j.jobTitle}
Company: ${j.company||"Company"}
Duration: ${j.duration||""}
Skills/Tools: ${form.technicalSkills||j.jobTitle}
Any details user provided: ${j.bullets||"none"}`
      );
      // Clean output - keep only lines starting with bullet
      const lines = txt.split("\n").map(l=>l.trim()).filter(l=>l.startsWith("•")||l.startsWith("-")||l.match(/^\d\./));
      const cleaned = lines.length >= 2 ? lines.slice(0,3).map(l=>l.replace(/^[-\d.]\s*/,"• ").replace(/^•\s*/,"• ")).join("\n") : txt;
      updJ(idx,"bullets",cleaned);
      notify("Bullets ready!","success");
    }catch(e){notify("Error: "+e.message,"error");}
    setB(`b${idx}`,false);
  };

  const aiSkills = async()=>{
    if(!pc.limits.aiSkills){notify("Upgrade to Pro for AI skill suggestions!","error");return;}
    setB("sk",true);
    try{
      const txt=await callAI(`Suggest 8 additional relevant technical skills for Indian job market. Output only comma-separated skill names.`,
        `Title:${form.jobs[0]?.jobTitle}|Existing:${form.technicalSkills}`);
      upd("technicalSkills",form.technicalSkills?form.technicalSkills+", "+txt:txt);
      notify("Skills added!","success");
    }catch(e){notify("Error: "+e.message,"error");}
    setB("sk",false);
  };

  const exportPDF = ()=>{
    const html = buildResume(form,tpl);
    const fileName = `${(form.name||"Resume").replace(/\s+/g,"_")}_Resume.pdf`;
    printResume(html,fileName);
    notify("Resume opened — click Save as PDF!","success");
  };

  const filledPct = Math.min(Math.round([form.name,form.email,form.phone,form.city,form.summary,form.college,form.degree,form.technicalSkills,form.jobs[0]?.company,form.jobs[0]?.jobTitle].filter(v=>v&&v.trim()).length/10*100),100);

  const techList = (form.technicalSkills||"").split(",").map(s=>s.trim()).filter(Boolean);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 56px)" }}>
      {/* Step tabs */}
      <div style={{ background:"rgba(5,9,26,0.95)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"0 12px", overflowX:"auto", flexShrink:0, display:"flex", WebkitOverflowScrolling:"touch" }}>
        <div style={{ display:"flex", gap:4, padding:"8px 0", minWidth:"max-content" }}>
          {BUILDER_STEPS.map((s,i)=>(
            <div key={i} onClick={()=>setStep(i)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", background:step===i?"rgba(0,87,255,0.2)":"transparent", color:step===i?"#fff":step>i?"#2ecc71":"#667788", fontWeight:step===i?700:500, fontSize:12, borderRadius:8, cursor:"pointer", border:step===i?"1px solid rgba(0,87,255,0.4)":"1px solid transparent", whiteSpace:"nowrap", transition:"all 0.18s" }}>
              <span>{s.icon}</span><span>{s.label}</span>{step>i&&<span style={{ color:"#2ecc71", fontSize:10 }}>✓</span>}
            </div>
          ))}
        </div>
        {/* Progress */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, paddingRight:4, flexShrink:0 }}>
          <span style={{ fontSize:11, color:"#556677", whiteSpace:"nowrap" }}>{filledPct}% done</span>
          <button onClick={()=>setShowPrev(p=>!p)} style={{ background:showPrev?"#0057FF":"rgba(255,255,255,0.07)", color:"#fff", border:"none", borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {showPrev?"✏️ Form":"👁 Preview"}
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height:2, background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
        <div style={{ height:"100%", width:`${((step+1)/5)*100}%`, background:"linear-gradient(90deg,#0057FF,#2ecc71)", transition:"width 0.4s" }} />
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:showPrev?"1fr":"1fr", overflow:"hidden" }}>
        {/* Form panel - always show unless preview mode */}
        <div style={{ overflowY:"auto", padding:"20px 16px", display:showPrev?"none":"block" }} className="form-panel">
          <style>{`@media(min-width:768px){.form-panel{display:block!important;}}`}</style>
          <div style={{ maxWidth:660, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:800 }}>{BUILDER_STEPS[step].icon} {BUILDER_STEPS[step].label}</h2>
              <span style={{ fontSize:12, color:"#556677" }}>Step {step+1}/5</span>
            </div>

            {/* STEP 0: Personal */}
            {step===0&&<div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                <Fld label="Full Name" required value={form.name} onChange={v=>upd("name",v)} placeholder="Rahul Kumar Singh"/>
                <Fld label="Email" type="email" required value={form.email} onChange={v=>upd("email",v)} placeholder="rahul@gmail.com"/>
                <Fld label="Phone" type="tel" required value={form.phone} onChange={v=>upd("phone",v)} placeholder="+91 98765 43210"/>
                <Fld label="City, State" value={form.city} onChange={v=>upd("city",v)} placeholder="Mumbai, Maharashtra"/>
                <Fld label="LinkedIn URL" value={form.linkedin} onChange={v=>upd("linkedin",v)} placeholder="linkedin.com/in/rahul"/>
                <Fld label="Portfolio / GitHub" value={form.portfolio} onChange={v=>upd("portfolio",v)} placeholder="github.com/rahul"/>
              </div>
              <div style={{ marginTop:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#7a90aa", textTransform:"uppercase", letterSpacing:0.5 }}>Professional Summary</label>
                  <AIBtn label="AI Generate" busy={busy.sum} onClick={aiSummary}/>
                </div>
                <Fld value={form.summary} onChange={v=>upd("summary",v)} rows={4} placeholder="3-line professional intro — or use AI to generate..." hint="💡 Fill Experience & Skills first for better AI output"/>
              </div>
            </div>}

            {/* STEP 1: Education */}
            {step===1&&<div style={{ display:"grid", gap:16 }}>
              <Card style={{ background:"rgba(0,87,255,0.06)", border:"1px solid rgba(0,87,255,0.2)" }}>
                <SectionHead icon="🎓" color="#4d9fff">Graduation / Post-Graduation</SectionHead>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                  <Fld label="College / University" required value={form.college} onChange={v=>upd("college",v)} placeholder="IIT Delhi / VIT / DU"/>
                  <Fld label="Degree" value={form.degree} onChange={v=>upd("degree",v)} placeholder="B.Tech / BCA / MBA"/>
                  <Fld label="Branch / Specialization" value={form.branch} onChange={v=>upd("branch",v)} placeholder="Computer Science"/>
                  <Fld label="CGPA / Percentage" value={form.cgpa} onChange={v=>upd("cgpa",v)} placeholder="8.5 CGPA / 85%"/>
                  <Fld label="Passing Year" value={form.gradYear} onChange={v=>upd("gradYear",v)} placeholder="2022"/>
                </div>
              </Card>
              <Card>
                <SectionHead color="#8899bb">12th / Intermediate (Optional)</SectionHead>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                  <Fld label="School" value={form.school} onChange={v=>upd("school",v)} placeholder="DAV Public School"/>
                  <Fld label="Board" value={form.board} onChange={v=>upd("board",v)} placeholder="CBSE / ICSE / State Board"/>
                  <Fld label="Percentage" value={form.marks10} onChange={v=>upd("marks10",v)} placeholder="92%"/>
                  <Fld label="Year" value={form.year10} onChange={v=>upd("year10",v)} placeholder="2018"/>
                </div>
              </Card>
              <div style={{ background:"rgba(46,204,113,0.06)", border:"1px solid rgba(46,204,113,0.2)", borderRadius:12, padding:14, fontSize:12, color:"#8899bb", lineHeight:1.8 }}>
                <span style={{ color:"#2ecc71", fontWeight:700 }}>India Tip: </span>CGPA 6.5+ required for TCS/Infosys. GATE/CAT score? Always add if 90+ percentile.
              </div>
            </div>}

            {/* STEP 2: Experience */}
            {step===2&&<div style={{ display:"grid", gap:16 }}>
              {form.jobs.map((j,idx)=>(
                <Card key={idx}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontWeight:800, fontSize:14, color:"#4d9fff" }}>{idx===0?"💼 Latest Job":`💼 Job ${idx+1}`}</span>
                    {idx>0&&<button onClick={()=>setForm(p=>({...p,jobs:p.jobs.filter((_,i)=>i!==idx)}))} style={{ background:"rgba(231,76,60,0.15)", color:"#e74c3c", border:"none", borderRadius:7, padding:"4px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Remove</button>}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                    <Fld label="Job Title" required value={j.jobTitle} onChange={v=>updJ(idx,"jobTitle",v)} placeholder="Software Engineer"/>
                    <Fld label="Company" required value={j.company} onChange={v=>updJ(idx,"company",v)} placeholder="TCS / Infosys / Startup"/>
                    <Fld label="Duration" value={j.duration} onChange={v=>updJ(idx,"duration",v)} placeholder="Jun 2022 – Present"/>
                    <Fld label="Location" value={j.location} onChange={v=>updJ(idx,"location",v)} placeholder="Bangalore / Remote"/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:"#7a90aa", textTransform:"uppercase", letterSpacing:0.5 }}>Work Description</label>
                    <AIBtn label="AI Bullets" busy={busy[`b${idx}`]} onClick={()=>aiBullets(idx)} locked={pc.limits.aiBullets!==Infinity&&idx>=pc.limits.aiBullets}/>
                  </div>
                  <textarea value={j.bullets} onChange={e=>updJ(idx,"bullets",e.target.value)} placeholder={"What you did — or use AI Bullets button above\n• Led development of...\n• Reduced costs by 30%..."} rows={4} style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 13px", color:"#e8eef8", fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
                </Card>
              ))}
              <button onClick={()=>setForm(p=>({...p,jobs:[...p.jobs,{jobTitle:"",company:"",duration:"",location:"",bullets:""}]}))} style={{ background:"rgba(0,87,255,0.08)", border:"1.5px dashed rgba(0,87,255,0.35)", borderRadius:12, padding:14, color:"#4d9fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Add Another Job / Internship / Project
              </button>
              <div style={{ background:"rgba(255,215,0,0.06)", border:"1px solid rgba(255,215,0,0.2)", borderRadius:10, padding:14, fontSize:12, color:"#8899bb", lineHeight:1.7 }}>
                <span style={{ color:"#FFD700", fontWeight:700 }}>ATS Tip: </span>Numbers matter — "Improved performance by 40%" beats "Improved performance" every time.
              </div>
            </div>}

            {/* STEP 3: Skills */}
            {step===3&&<div style={{ display:"grid", gap:16 }}>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#7a90aa", textTransform:"uppercase", letterSpacing:0.5 }}>Technical Skills *</label>
                  <AIBtn label="AI Suggest" busy={busy.sk} onClick={aiSkills} locked={!pc.limits.aiSkills}/>
                </div>
                <Fld value={form.technicalSkills} onChange={v=>upd("technicalSkills",v)} rows={3} placeholder="Java, Python, React, SQL, AWS, Git, Docker..."/>
                {!pc.limits.aiSkills&&<div style={{ fontSize:11, color:"#FF5733", marginTop:4 }}>🔒 AI Skill Suggestions available in Pro plan</div>}
                {techList.length>0&&<div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
                  {techList.map((s,i)=><span key={i} style={{ background:"rgba(0,87,255,0.15)", color:"#4d9fff", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600 }}>{s}</span>)}
                </div>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
                <Fld label="Soft Skills" value={form.softSkills} onChange={v=>upd("softSkills",v)} placeholder="Leadership, Communication..."/>
                <Fld label="Languages Known" value={form.languages} onChange={v=>upd("languages",v)} placeholder="Hindi, English, Tamil..."/>
              </div>
              <Fld label="Tools & Software" value={form.tools} onChange={v=>upd("tools",v)} placeholder="VS Code, Jira, Figma, Postman..."/>
              <Fld label="Certifications" value={form.certifications} onChange={v=>upd("certifications",v)} rows={2} placeholder="AWS Certified Developer • Google Analytics • TCS NQT: 1200"/>
              <Card>
                <div style={{ fontSize:12, fontWeight:700, color:"#7a90aa", marginBottom:10 }}>🇮🇳 Popular Skills — Click to Add</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {POPULAR_SKILLS.map(sk=>{
                    const has=techList.map(s=>s.toLowerCase()).includes(sk.toLowerCase());
                    return <button key={sk} onClick={()=>{if(!has)upd("technicalSkills",form.technicalSkills?form.technicalSkills+", "+sk:sk);}} style={{ background:has?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.05)", color:has?"#2ecc71":"#8899bb", border:`1px solid ${has?"rgba(46,204,113,0.3)":"rgba(255,255,255,0.1)"}`, borderRadius:20, padding:"4px 13px", fontSize:12, fontWeight:600, cursor:has?"default":"pointer", fontFamily:"inherit" }}>
                      {has?"✓ ":"+ "}{sk}
                    </button>;
                  })}
                </div>
              </Card>
            </div>}

            {/* STEP 4: Preview & Export */}
            {step===4&&<div style={{ display:"grid", gap:16 }}>
              <Card>
                <SectionHead icon="🎨">Choose Template</SectionHead>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[{id:"modern",name:"Modern Pro",ac:"#0057FF",ats:88,plan:"free"},{id:"classic",name:"Classic IIT",ac:"#1a1a2e",ats:97,plan:"free"},{id:"minimal",name:"Minimal Clean",ac:"#2ecc71",ats:97,plan:"free"},{id:"creative",name:"Creative Edge",ac:"#FF5733",ats:72,plan:"pro"}].map(t=>{
                    const locked=t.plan==="pro"&&plan==="free";
                    return <button key={t.id} onClick={()=>!locked&&setTpl(t.id)} style={{ background:tpl===t.id?`${t.ac}20`:"rgba(255,255,255,0.03)", border:`2px solid ${tpl===t.id?t.ac:"rgba(255,255,255,0.08)"}`, borderRadius:12, padding:"12px 14px", cursor:locked?"not-allowed":"pointer", textAlign:"left", color:"#e8eef8", fontFamily:"inherit", opacity:locked?0.5:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontWeight:700, fontSize:13, color:tpl===t.id?t.ac:"#c0cce0" }}>{t.name}</span>
                        <span style={{ fontSize:10, fontWeight:800, color:t.ats>=90?"#2ecc71":"#f39c12", background:t.ats>=90?"rgba(46,204,113,0.15)":"rgba(243,156,18,0.15)", borderRadius:20, padding:"2px 8px" }}>ATS {t.ats}</span>
                      </div>
                      {locked&&<div style={{ fontSize:10, color:"#FF5733", marginTop:3 }}>🔒 Pro Only</div>}
                    </button>;
                  })}
                </div>
              </Card>

              {/* Live preview */}
              <Card style={{ padding:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#7a90aa", marginBottom:10 }}>Resume Preview</div>
                <div style={{ background:"#f5f5f5", borderRadius:8, overflow:"hidden", maxHeight:400, overflowY:"auto" }} dangerouslySetInnerHTML={{ __html:buildResume(form,tpl) }}/>
              </Card>

              <button onClick={exportPDF} style={{ background:"linear-gradient(135deg,#0057FF,#0040cc)", color:"#fff", border:"none", borderRadius:12, padding:"16px 28px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 6px 28px rgba(0,87,255,0.4)" }}>
                📥 Download Resume as PDF
              </button>
              <div style={{ background:"rgba(0,87,255,0.06)", border:"1px solid rgba(0,87,255,0.15)", borderRadius:10, padding:14, fontSize:12, color:"#8899bb" }}>
                <span style={{ color:"#4d9fff", fontWeight:700 }}>How to save: </span>
                Click download → resume opens → press <strong style={{ color:"#fff" }}>Ctrl+P → Save as PDF</strong>. On Android: Share → Print → Save as PDF.
              </div>
            </div>}

            {/* Nav */}
            <div style={{ display:"flex", gap:10, marginTop:24, paddingBottom:24 }}>
              <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{ flex:1, background:"rgba(255,255,255,0.05)", color:step===0?"#334455":"#e8eef8", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:step===0?"not-allowed":"pointer", fontFamily:"inherit" }}>← Back</button>
              {step<4
                ?<button onClick={()=>setStep(s=>s+1)} style={{ flex:2, background:"#0057FF", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Next: {BUILDER_STEPS[step+1].label} →</button>
                :<button onClick={exportPDF} style={{ flex:2, background:"#2ecc71", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>📥 Export PDF</button>
              }
            </div>
          </div>
        </div>

        {/* Preview panel — desktop always visible, mobile toggle */}
        <div style={{ overflowY:"auto", padding:16, background:"#080d20", display:showPrev?"block":"none" }} className="prev-panel">
          <style>{`@media(min-width:768px){.prev-panel{display:block!important;}.form-panel{display:block!important;} .form-panel,.prev-panel{} }`}</style>
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
            {[{id:"modern",ac:"#0057FF"},{id:"classic",ac:"#4455aa"},{id:"minimal",ac:"#2ecc71"},{id:"creative",ac:"#FF5733"}].map(t=>(
              <button key={t.id} onClick={()=>setTpl(t.id)} style={{ background:tpl===t.id?t.ac:"rgba(255,255,255,0.05)", color:tpl===t.id?"#fff":"#8899bb", border:"none", borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s", textTransform:"capitalize" }}>{t.id}</button>
            ))}
          </div>
          <div style={{ background:"#f5f5f5", borderRadius:10, overflow:"hidden" }} dangerouslySetInnerHTML={{ __html:buildResume(form,tpl) }}/>
          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ background:"rgba(0,87,255,0.1)", border:"1px solid rgba(0,87,255,0.2)", borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#0057FF" }}>{filledPct}%</div>
              <div style={{ fontSize:10, color:"#7a90aa", marginTop:2 }}>Profile Complete</div>
            </div>
            <div style={{ background:`${PLANS[plan].color}18`, border:`1px solid ${PLANS[plan].color}40`, borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:22, fontWeight:800, color:PLANS[plan].color }}>{PLANS[plan].name}</div>
              <div style={{ fontSize:10, color:"#7a90aa", marginTop:2 }}>Current Plan</div>
            </div>
          </div>
        </div>
      </div>
      <Toast msg={toast.msg} type={toast.type}/>
    </div>
  );
}

// ── ATS CHECKER ───────────────────────────────────────────────────────────────
function ATSChecker({ plan }) {
  const [resume,  setResume]  = useState("");
  const [jd,      setJd]      = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState("score");
  const [toast,   setToast]   = useState({ msg:"", type:"info" });

  const notify = (msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast({msg:"",type:"info"}),3000);};

  const analyze = async()=>{
    if(!resume.trim()){notify("Paste your resume first","error");return;}
    if(!jd.trim()){notify("Paste job description","error");return;}
    setLoading(true);setResult(null);
    try{
      const raw=await callAI(`You are an expert ATS analyzer for Indian job market. Return ONLY valid JSON:{"overallScore":<0-100>,"verdict":"<Excellent|Good|Average|Needs Work>","verdictReason":"<one sentence>","sections":{"keywords":{"score":<0-100>,"found":[...],"missing":[...]},"experience":{"score":<0-100>,"feedback":"<one line>"},"education":{"score":<0-100>,"feedback":"<one line>"},"skills":{"score":<0-100>,"found":[...],"missing":[]}},"topSuggestions":["<suggestion1>","<suggestion2>","<suggestion3>"]}`,
        `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,800);
      setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));
      setTab("score");notify("Analysis complete!","success");
    }catch(e){notify("Error: "+e.message,"error");}
    setLoading(false);
  };

  const vc={"Excellent":"#2ecc71","Good":"#4d9fff","Average":"#f39c12","Needs Work":"#e74c3c"};

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:8 }}>🎯 ATS Score Checker</h1>
        <p style={{ color:"#7a90aa", fontSize:14 }}>Paste your resume and job description — get a real ATS match score</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {[["📄 Your Resume","Paste full resume text...",resume,setResume],["💼 Job Description","Paste JD from Naukri/LinkedIn...",jd,setJd]].map(([label,ph,val,setter],i)=>(
          <Card key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:700, color:"#c0cce0" }}>{label}</label>
              <span style={{ fontSize:11, color:val.trim()?"#2ecc71":"#445566" }}>{val.trim()?`${val.trim().split(/\s+/).length} words`:"Empty"}</span>
            </div>
            <textarea value={val} onChange={e=>setter(e.target.value)} placeholder={ph} rows={12} style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 13px", color:"#e8eef8", fontSize:13, fontFamily:"inherit", resize:"vertical" }}/>
          </Card>
        ))}
      </div>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <button onClick={analyze} disabled={loading} style={{ background:loading?"rgba(0,87,255,0.4)":"#0057FF", color:"#fff", border:"none", borderRadius:12, padding:"14px 44px", fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px rgba(0,87,255,0.4)" }}>
          {loading?"⏳ Analyzing...":"🔍 Check ATS Score"}
        </button>
      </div>

      {result&&(
        <div>
          <div style={{ background:`${vc[result.verdict]||"#0057FF"}15`, border:`1px solid ${vc[result.verdict]||"#0057FF"}44`, borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:32 }}>{result.verdict==="Excellent"?"🏆":result.verdict==="Good"?"👍":result.verdict==="Average"?"⚠️":"🔧"}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:vc[result.verdict] }}>{result.verdict}!</div>
              <div style={{ fontSize:13, color:"#8899bb", marginTop:2 }}>{result.verdictReason}</div>
            </div>
            <div style={{ marginLeft:"auto", textAlign:"center" }}>
              <div style={{ fontSize:42, fontWeight:800, color:vc[result.verdict] }}>{result.overallScore}</div>
              <div style={{ fontSize:11, color:"#556677" }}>ATS Score</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto" }}>
            {[["score","📊 Scores"],["keywords","🔑 Keywords"],["suggestions","💡 Suggestions"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ background:tab===id?"#0057FF":"rgba(255,255,255,0.05)", color:tab===id?"#fff":"#8899bb", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>{label}</button>
            ))}
          </div>

          {tab==="score"&&<Card>
            <SectionHead>Section Scores</SectionHead>
            {Object.entries(result.sections).map(([key,val])=>(
              <div key={key} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                  <span style={{ color:"#c0cce0", fontWeight:600, textTransform:"capitalize" }}>{key}</span>
                  <span style={{ color:val.score>=75?"#2ecc71":val.score>=50?"#f39c12":"#e74c3c", fontWeight:800 }}>{val.score}/100</span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:20 }}>
                  <div style={{ height:"100%", width:`${val.score}%`, background:val.score>=75?"#2ecc71":val.score>=50?"#f39c12":"#e74c3c", borderRadius:20, transition:"width 0.8s" }}/>
                </div>
                {val.feedback&&<div style={{ fontSize:11, color:"#556677", marginTop:3 }}>{val.feedback}</div>}
              </div>
            ))}
          </Card>}

          {tab==="keywords"&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[["✅ Found",result.sections.keywords?.found,"#2ecc71"],["❌ Missing",result.sections.keywords?.missing,"#e74c3c"]].map(([label,items,color])=>(
              <Card key={label}>
                <div style={{ fontSize:14, fontWeight:700, color, marginBottom:12 }}>{label} ({(items||[]).length})</div>
                <div>{(items||[]).map((k,i)=><span key={i} style={{ display:"inline-block", background:`${color}15`, color, border:`1px solid ${color}33`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, margin:"2px" }}>{k}</span>)}</div>
              </Card>
            ))}
          </div>}

          {tab==="suggestions"&&<Card>
            <SectionHead icon="💡">Top Suggestions</SectionHead>
            {(result.topSuggestions||[]).map((s,i)=>(
              <div key={i} style={{ display:"flex", gap:12, marginBottom:12, padding:"12px 14px", background:"rgba(0,87,255,0.06)", border:"1px solid rgba(0,87,255,0.15)", borderRadius:10 }}>
                <div style={{ width:24, height:24, background:"#0057FF", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, flexShrink:0 }}>{i+1}</div>
                <span style={{ fontSize:13, color:"#c0cce0", lineHeight:1.6 }}>{s}</span>
              </div>
            ))}
          </Card>}
        </div>
      )}
      <Toast msg={toast.msg} type={toast.type}/>
    </div>
  );
}

// ── JOB MATCH ─────────────────────────────────────────────────────────────────
function JobMatch({ plan }) {
  const [resume,  setResume]  = useState("");
  const [jd,      setJd]      = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState("overview");
  const [toast,   setToast]   = useState({ msg:"", type:"info" });
  const notify=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast({msg:"",type:"info"}),3000);};

  const analyze=async()=>{
    if(!resume.trim()||!jd.trim()){notify("Fill both fields","error");return;}
    setLoading(true);setResult(null);
    try{
      const raw=await callAI(`You are a career coach for Indian job market. Return ONLY valid JSON:{"matchScore":<0-100>,"matchLevel":"<Strong Match|Good Match|Partial Match|Weak Match>","summary":"<2 sentences>","skillsMatched":["skill1","skill2"],"skillsMissing":[{"skill":"name","priority":"Must Have|Good to Have","learnTime":"2 weeks"}],"suggestions":[{"section":"Summary|Experience|Skills","action":"<what to change>","example":"<specific text>"}],"interviewStrengths":["strength1","strength2","strength3"],"interviewTopics":["topic1","topic2","topic3"],"salaryRange":"<e.g. ₹8-12 LPA>","applyRecommendation":"<Highly Recommended|Recommended|Apply with Improvements|Not Recommended>"}`,
        `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,900);
      setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));
      setTab("overview");notify("Analysis complete!","success");
    }catch(e){notify("Error: "+e.message,"error");}
    setLoading(false);
  };

  const applyColors={"Highly Recommended":"#2ecc71","Recommended":"#4d9fff","Apply with Improvements":"#f39c12","Not Recommended":"#e74c3c"};

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:8 }}>🔍 Job Match Analysis</h1>
        <p style={{ color:"#7a90aa", fontSize:14 }}>Skill gap analysis, resume tailoring suggestions, interview prep</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {[["📄 Your Resume","Paste resume text...",resume,setResume],["💼 Job Description","Paste JD from Naukri/LinkedIn...",jd,setJd]].map(([label,ph,val,setter],i)=>(
          <Card key={i}>
            <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#c0cce0", marginBottom:8 }}>{label}</label>
            <textarea value={val} onChange={e=>setter(e.target.value)} placeholder={ph} rows={12} style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 13px", color:"#e8eef8", fontSize:13, fontFamily:"inherit", resize:"vertical" }}/>
          </Card>
        ))}
      </div>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <button onClick={analyze} disabled={loading} style={{ background:loading?"rgba(0,87,255,0.4)":"linear-gradient(135deg,#0057FF,#0040cc)", color:"#fff", border:"none", borderRadius:12, padding:"14px 44px", fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px rgba(0,87,255,0.4)" }}>
          {loading?"⏳ Analyzing...":"🔍 Analyze Job Match"}
        </button>
      </div>

      {result&&<div>
        <div style={{ background:`${applyColors[result.applyRecommendation]||"#0057FF"}15`, border:`1px solid ${applyColors[result.applyRecommendation]||"#0057FF"}44`, borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <div style={{ fontSize:32 }}>{result.applyRecommendation==="Highly Recommended"?"🚀":result.applyRecommendation==="Recommended"?"👍":"⚠️"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:800, color:applyColors[result.applyRecommendation] }}>{result.applyRecommendation}</div>
            <div style={{ fontSize:13, color:"#8899bb", marginTop:2 }}>{result.summary}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:42, fontWeight:800, color:applyColors[result.applyRecommendation] }}>{result.matchScore}</div>
            <div style={{ fontSize:11, color:"#556677" }}>Match Score</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto" }}>
          {[["overview","📊 Overview"],["skills","⚡ Skills"],["suggestions","✏️ Tailor"],["interview","🎤 Interview"],...(plan==="pro"?[["salary","💰 Salary"]]:[""])].filter(Boolean).map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ background:tab===id?"#0057FF":"rgba(255,255,255,0.05)", color:tab===id?"#fff":"#8899bb", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>{label}</button>
          ))}
        </div>

        {tab==="overview"&&<div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[["Skills Matched",(result.skillsMatched||[]).length,"#2ecc71"],["Skills Missing",(result.skillsMissing||[]).length,"#e74c3c"],["Interview Ready",result.matchScore>=70?"High":"Medium",result.matchScore>=70?"#2ecc71":"#f39c12"]].map(([l,v,c],i)=>(
            <Card key={i} style={{ textAlign:"center" }}><div style={{ fontSize:28, fontWeight:800, color:c }}>{v}</div><div style={{ fontSize:12, color:"#7a90aa", marginTop:4 }}>{l}</div></Card>
          ))}
        </div>}

        {tab==="skills"&&<div style={{ display:"grid", gap:14 }}>
          <Card>
            <SectionHead color="#2ecc71">✅ Matched Skills</SectionHead>
            <div>{(result.skillsMatched||[]).map((s,i)=><span key={i} style={{ display:"inline-block", background:"rgba(46,204,113,0.15)", color:"#2ecc71", border:"1px solid rgba(46,204,113,0.3)", borderRadius:20, padding:"3px 11px", fontSize:11, fontWeight:700, margin:"2px" }}>{s}</span>)}</div>
          </Card>
          <Card>
            <SectionHead color="#e74c3c">❌ Missing Skills</SectionHead>
            {(result.skillsMissing||[]).map((s,i)=>{
              const c=s.priority==="Must Have"?"#e74c3c":s.priority==="Good to Have"?"#f39c12":"#2ecc71";
              return <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:`${c}0d`, border:`1px solid ${c}33`, borderRadius:10, marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:c }}>{s.skill}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"#7a90aa" }}>Learn in: <strong style={{ color:"#c0cce0" }}>{s.learnTime}</strong></span>
                  <span style={{ background:`${c}20`, color:c, borderRadius:20, padding:"2px 9px", fontSize:10, fontWeight:800 }}>{s.priority}</span>
                </div>
              </div>;
            })}
          </Card>
        </div>}

        {tab==="suggestions"&&<Card>
          <SectionHead icon="✏️">Resume Tailoring Suggestions</SectionHead>
          {(result.suggestions||[]).map((s,i)=>(
            <div key={i} style={{ marginBottom:14, padding:"14px 16px", background:"rgba(0,87,255,0.06)", border:"1px solid rgba(0,87,255,0.15)", borderRadius:12 }}>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <span style={{ background:"rgba(0,87,255,0.2)", color:"#4d9fff", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{s.section}</span>
              </div>
              <div style={{ fontSize:13, color:"#c0cce0", marginBottom:8, lineHeight:1.6 }}>{s.action}</div>
              {s.example&&<div style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#7a90aa", fontStyle:"italic" }}>Example: "{s.example}"</div>}
            </div>
          ))}
        </Card>}

        {tab==="interview"&&<div style={{ display:"grid", gap:14 }}>
          <Card>
            <SectionHead icon="💪">Your Strengths for This Role</SectionHead>
            {(result.interviewStrengths||[]).map((s,i)=><div key={i} style={{ display:"flex", gap:8, marginBottom:10, fontSize:13, color:"#c0cce0" }}><span style={{ color:"#2ecc71", fontWeight:800 }}>✓</span>{s}</div>)}
          </Card>
          <Card>
            <SectionHead icon="📚">Topics to Prepare</SectionHead>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
              {(result.interviewTopics||[]).map((t,i)=>(
                <div key={i} style={{ background:"rgba(0,87,255,0.06)", border:"1px solid rgba(0,87,255,0.15)", borderRadius:10, padding:"12px 14px", display:"flex", gap:8 }}>
                  <span style={{ width:22, height:22, background:"rgba(0,87,255,0.3)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</span>
                  <span style={{ fontSize:12, color:"#c0cce0" }}>{t}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>}

        {tab==="salary"&&plan==="pro"&&<Card>
          <SectionHead icon="💰" color="#2ecc71">Salary Insight</SectionHead>
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:44, fontWeight:800, color:"#2ecc71" }}>{result.salaryRange||"N/A"}</div>
            <div style={{ fontSize:13, color:"#7a90aa", marginTop:8 }}>Estimated market range for this role in India</div>
          </div>
        </Card>}
      </div>}
      <Toast msg={toast.msg} type={toast.type}/>
    </div>
  );
}

// ── TEMPLATES PAGE ─────────────────────────────────────────────────────────────
function TemplatesPage({ plan, onNavigate }) {
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState({ msg:"", type:"info" });
  const notify=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast({msg:"",type:"info"}),3000);};

  const CATS = ["All","Tech","Finance","Marketing","Design","Management","Fresher","Government","Healthcare","Sales"];
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");

  const TMPL_DATA = [
    {id:"modern-pro",name:"Modern Pro",cat:"Tech",ats:88,plan:"free",accent:"#0057FF",tag:"Popular",desc:"Bold header, two-column. Best for software engineers."},
    {id:"classic-iit",name:"Classic IIT",cat:"Government",ats:97,plan:"free",accent:"#1a1a2e",tag:"ATS Safe",desc:"Formal serif. Best for PSU, banking, government roles."},
    {id:"minimal-clean",name:"Minimal Clean",cat:"Tech",ats:97,plan:"free",accent:"#2ecc71",tag:"ATS Safe",desc:"Ultra-clean for TCS, Infosys, Wipro applications."},
    {id:"creative-edge",name:"Creative Edge",cat:"Design",ats:72,plan:"pro",accent:"#FF5733",tag:"Standout",desc:"Dark sidebar. Best for UI/UX and design roles."},
    {id:"navy-executive",name:"Navy Executive",cat:"Management",ats:90,plan:"free",accent:"#003566",tag:"Premium",desc:"Dark navy for senior management and executive roles."},
    {id:"slate-modern",name:"Slate Modern",cat:"Finance",ats:91,plan:"free",accent:"#2c3e50",tag:"New",desc:"Professional gray tones for CA, MBA, finance roles."},
    {id:"teal-fresh",name:"Teal Fresh",cat:"Fresher",ats:93,plan:"free",accent:"#16a085",tag:"Fresher",desc:"Clean teal. Perfect for fresh graduates and interns."},
    {id:"gold-executive",name:"Gold Executive",cat:"Management",ats:85,plan:"pro",accent:"#D4A017",tag:"Premium",desc:"Gold accents for C-suite and VP roles."},
    {id:"purple-creative",name:"Purple Creative",cat:"Design",ats:74,plan:"pro",accent:"#8e44ad",tag:"Creative",desc:"Bold purple sidebar for graphic designers."},
    {id:"emerald-pro",name:"Emerald Pro",cat:"Finance",ats:88,plan:"pro",accent:"#27ae60",tag:"Finance",desc:"Professional green for finance and banking."},
    {id:"sky-tech",name:"Sky Tech",cat:"Tech",ats:87,plan:"pro",accent:"#00adb5",tag:"Tech",desc:"Sky blue for data scientists and ML engineers."},
    {id:"forest-clean",name:"Forest Clean",cat:"Healthcare",ats:94,plan:"pro",accent:"#2d6a4f",tag:"Medical",desc:"Clean forest green for healthcare workers."},
    {id:"fresh-campus",name:"Fresh Campus",cat:"Fresher",ats:92,plan:"pro",accent:"#0288d1",tag:"Campus",desc:"Campus placement optimized for IIT/NIT freshers."},
    {id:"medical-pro",name:"Medical Pro",cat:"Healthcare",ats:95,plan:"pro",accent:"#1976d2",tag:"Medical",desc:"Clinical blue for MBBS, BDS, hospital admin."},
    {id:"banking-formal",name:"Banking Formal",cat:"Finance",ats:95,plan:"pro",accent:"#1a237e",tag:"Banking",desc:"Strictly formal for IBPS, SBI, RBI candidates."},
    {id:"product-manager",name:"Product Manager",cat:"Tech",ats:87,plan:"pro",accent:"#6200ea",tag:"PM",desc:"Metrics-focused layout for PMs at product companies."},
    {id:"consulting-pro",name:"Consulting Pro",cat:"Management",ats:92,plan:"pro",accent:"#283593",tag:"Consulting",desc:"Structured for McKinsey, BCG, Deloitte candidates."},
    {id:"ai-ml-pro",name:"AI/ML Pro",cat:"Tech",ats:87,plan:"pro",accent:"#6a1b9a",tag:"AI/ML",desc:"Research layout for AI/ML and data science roles."},
    {id:"bold-sales",name:"Bold Sales",cat:"Sales",ats:84,plan:"pro",accent:"#FF6B00",tag:"Sales",desc:"High-impact layout for sales managers and BDMs."},
    {id:"digital-mkt",name:"Digital Marketing",cat:"Marketing",ats:83,plan:"pro",accent:"#0097a7",tag:"Digital",desc:"Campaign-focused for performance marketers."},
  ];

  const filtered = TMPL_DATA.filter(t=>(cat==="All"||t.cat===cat)&&(!search||t.name.toLowerCase().includes(search.toLowerCase())||t.desc.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:8 }}>📄 50+ Resume Templates</h1>
        <p style={{ color:"#7a90aa", fontSize:14 }}>Professionally designed for every role and industry in India</p>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200, position:"relative" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#556677" }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search templates..." style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px 10px 34px", color:"#e8eef8", fontSize:13, fontFamily:"inherit" }}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:18, WebkitOverflowScrolling:"touch" }}>
        {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?"#0057FF":"rgba(255,255,255,0.05)", color:cat===c?"#fff":"#8899bb", border:`1px solid ${cat===c?"#0057FF":"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"6px 15px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>{c}</button>)}
      </div>

      <div style={{ fontSize:12, color:"#445566", marginBottom:14 }}>Showing <strong style={{ color:"#c0cce0" }}>{filtered.length}</strong> templates</div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:14 }}>
        {filtered.map(t=>{
          const locked=t.plan==="pro"&&plan==="free";
          const sel=selected?.id===t.id;
          return (
            <div key={t.id} onClick={()=>{if(locked){notify("Upgrade to Pro for this template","error");return;}setSelected(t);notify(`"${t.name}" selected!`,"success");}} style={{ background:"rgba(255,255,255,0.03)", border:`2px solid ${sel?t.accent:"rgba(255,255,255,0.08)"}`, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", opacity:locked?0.7:1 }}>
              {/* Thumbnail */}
              <div style={{ height:140, background:`${t.accent}10`, borderBottom:`2px solid ${t.accent}22`, position:"relative", padding:8 }}>
                <div style={{ background:"#fff", borderRadius:6, height:"100%", padding:"8px 10px", overflow:"hidden" }}>
                  <div style={{ width:"60%", height:6, background:t.accent, borderRadius:2, marginBottom:5 }}/>
                  <div style={{ width:"80%", height:3, background:"#eee", borderRadius:1, marginBottom:3 }}/>
                  {[70,85,60,75].map((w,i)=><div key={i} style={{ width:`${w}%`, height:3, background:"#f0f0f0", borderRadius:1, marginBottom:3 }}/>)}
                  <div style={{ display:"flex", gap:3, marginTop:5 }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:20, height:5, background:`${t.accent}33`, borderRadius:2 }}/>)}
                  </div>
                </div>
                {locked&&<div style={{ position:"absolute", inset:0, background:"rgba(5,9,26,0.72)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:6 }}><div style={{ textAlign:"center" }}><div style={{ fontSize:20 }}>🔒</div><div style={{ fontSize:10, fontWeight:700, color:"#fff", marginTop:4 }}>Pro Only</div></div></div>}
                {sel&&<div style={{ position:"absolute", top:8, right:8, width:22, height:22, background:t.accent, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, color:"#fff" }}>✓</div>}
                <div style={{ position:"absolute", top:8, left:8, background:`${t.accent}dd`, color:"#fff", borderRadius:20, padding:"1px 8px", fontSize:9, fontWeight:800 }}>{t.tag}</div>
              </div>
              {/* Footer */}
              <div style={{ padding:"10px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:sel?t.accent:"#c0cce0" }}>{t.name}</span>
                  <span style={{ fontSize:10, fontWeight:800, color:t.ats>=90?"#2ecc71":"#f39c12", background:t.ats>=90?"rgba(46,204,113,0.15)":"rgba(243,156,18,0.15)", borderRadius:20, padding:"1px 7px" }}>ATS {t.ats}</span>
                </div>
                <div style={{ fontSize:10, color:"#556677", lineHeight:1.5 }}>{t.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {selected&&(
        <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:90, background:"#0d1526", border:`1px solid ${selected.accent}55`, borderRadius:16, padding:"14px 22px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 8px 40px rgba(0,0,0,0.6)" }}>
          <div style={{ width:10, height:10, background:selected.accent, borderRadius:"50%" }}/>
          <div><div style={{ fontWeight:700, fontSize:13 }}>{selected.name}</div><div style={{ fontSize:10, color:"#556677" }}>ATS {selected.ats} · {selected.cat}</div></div>
          <button onClick={()=>onNavigate("builder")} style={{ background:selected.accent, color:"#fff", border:"none", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Use Template →</button>
          <button onClick={()=>setSelected(null)} style={{ background:"rgba(255,255,255,0.07)", color:"#8899bb", border:"none", borderRadius:9, padding:"9px 12px", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
        </div>
      )}
      <Toast msg={toast.msg} type={toast.type}/>
    </div>
  );
}

// ── PLANS PAGE ─────────────────────────────────────────────────────────────────
function PlansPage({ plan, setPlan }) {
  const [toast, setToast] = useState({ msg:"", type:"info" });
  const notify=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast({msg:"",type:"info"}),3000);};

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:8 }}>Simple, Transparent Pricing</h1>
        <p style={{ color:"#7a90aa", fontSize:14 }}>No hidden charges. Cancel anytime. 7-day refund guarantee.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:32 }}>
        {Object.entries(PLANS).map(([key,p])=>(
          <div key={key} style={{ background:key==="pro"?"linear-gradient(135deg,#0057FF,#0040cc)":"rgba(255,255,255,0.04)", border:`2px solid ${plan===key?p.color:"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:24, position:"relative" }}>
            {key==="pro"&&<div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"#FFD700", color:"#1a1a2e", borderRadius:20, padding:"3px 16px", fontSize:11, fontWeight:800 }}>Most Popular</div>}
            <div style={{ fontSize:28, marginBottom:8 }}>{p.icon}</div>
            <div style={{ fontSize:18, fontWeight:800, color:key==="pro"?"#a8d4ff":p.color }}>{p.name}</div>
            <div style={{ fontSize:30, fontWeight:800, letterSpacing:-1, margin:"8px 0 2px" }}>{p.price}</div>
            <div style={{ fontSize:12, color:key==="pro"?"rgba(255,255,255,0.6)":"#556677", marginBottom:20 }}>{p.period}</div>
            <div style={{ marginBottom:20 }}>
              {p.features?.slice(0,7).map((f,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:key==="pro"?"rgba(255,255,255,0.9)":"#c0cce0" }}>
                  <span style={{ color:key==="pro"?"#a8d4ff":p.color, fontWeight:800, flexShrink:0 }}>✓</span>{f}
                </div>
              ))||Object.entries({
                free:["3 Resume Builds/month","AI Summary","AI Bullets (1 job)","5 ATS Checks/month","3 Free Templates","5 PDF Exports","Keyword Highlight"],
                pro:["Unlimited Everything","AI Bullets All Jobs","AI Skill Suggestions","50+ Templates","PDF + DOCX Export","Shareable Links","Salary Insights","Cover Letter AI"],
                recruiter:["Everything in Pro","Bulk Resume Review","Candidate Tracking","Team Access (5 users)","ATS Integration","Dedicated Manager"],
              })[key].map((f,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:key==="pro"?"rgba(255,255,255,0.9)":"#c0cce0" }}>
                  <span style={{ color:key==="pro"?"#a8d4ff":p.color, fontWeight:800, flexShrink:0 }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={()=>{setPlan(key);notify(`${p.name} plan activated!`,"success");}} style={{ width:"100%", background:plan===key?(key==="pro"?"#fff":"#0057FF"):`${p.color}22`, color:plan===key?(key==="pro"?"#0057FF":"#fff"):p.color, border:`1.5px solid ${p.color}`, borderRadius:10, padding:"12px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
              {plan===key?"✓ Current Plan":key==="free"?"Downgrade to Free":`Upgrade to ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#c0cce0", marginBottom:14 }}>🔒 All payments secured via Razorpay</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
          {[["💳","UPI / Cards / Net Banking","GPay, PhonePe, Paytm, Visa, Mastercard, Rupay"],["📧","GST Invoice on Email","Valid for business expense claims"],["↩️","7-Day Refund Policy","Full refund, no questions asked"],["🔄","Cancel Anytime","No lock-in, no cancellation fee"]].map(([icon,title,desc],i)=>(
            <div key={i} style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#c0cce0", marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:11, color:"#7a90aa" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Toast msg={toast.msg} type={toast.type}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP — Navigation shell
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"home",      label:"Home",          icon:"🏠" },
  { id:"builder",   label:"Build Resume",  icon:"📝" },
  { id:"ats",       label:"ATS Checker",   icon:"🎯" },
  { id:"jobmatch",  label:"Job Match",     icon:"🔍" },
  { id:"templates", label:"Templates",     icon:"📄" },
  { id:"plans",     label:"Plans",         icon:"💰" },
];

function ResumeAIIndia() {

  const [page, setPage]   = useState("home");
  const [plan, setPlan]   = useState("free");
  const [menuOpen, setMenuOpen] = useState(false);
  const pc = PLANS[plan];

  return (
    <div style={{ fontFamily:"'Sora','DM Sans',sans-serif", background:"#05091a", color:"#e8eef8", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,textarea,select{outline:none;font-family:inherit;}
        input:focus,textarea:focus{border-color:#0057FF!important;box-shadow:0 0 0 3px rgba(0,87,255,0.12)!important;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:#0057FF55;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        .fade-up{animation:fadeUp 0.35s ease;}
        .nav-item{cursor:pointer;transition:all 0.18s;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap;}
        .nav-item:hover{background:rgba(255,255,255,0.07);}
        @media print{nav,#resume-print-frame>div:first-child{display:none!important;}body>*:not(#resume-print-frame){display:none!important;}#resume-print-frame{position:static!important;}@page{size:A4;margin:0;}}
      `}</style>

      {/* TOP NAV */}
      <nav style={{ background:"rgba(5,9,26,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"0 16px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:80 }}>
        {/* Logo */}
        <div onClick={()=>setPage("home")} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", flexShrink:0 }}>
          <div style={{ width:32, height:32, background:"#0057FF", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16 }}>R</div>
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:-0.3 }}>ResumeAI <span style={{ color:"#0057FF" }}>India</span></span>
        </div>

        {/* Desktop nav links */}
        <div style={{ display:"flex", gap:2, overflowX:"auto" }} className="desktop-nav">
          <style>{`@media(max-width:640px){.desktop-nav{display:none!important;}}`}</style>
          {NAV_ITEMS.slice(1).map(item=>(
            <div key={item.id} className="nav-item" onClick={()=>setPage(item.id)} style={{ color:page===item.id?"#fff":"#8899bb", background:page===item.id?"rgba(0,87,255,0.2)":"transparent" }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Right: plan badge + mobile menu */}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
          <button onClick={()=>setPage("plans")} style={{ background:`${pc.color}20`, color:pc.color, border:`1px solid ${pc.color}50`, borderRadius:20, padding:"5px 13px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {pc.icon} {pc.name}
          </button>
          {/* Mobile menu toggle */}
          <button onClick={()=>setMenuOpen(m=>!m)} style={{ background:"rgba(255,255,255,0.07)", color:"#fff", border:"none", borderRadius:8, padding:"7px 10px", fontSize:14, cursor:"pointer" }} className="mobile-menu-btn">
            <style>{`@media(min-width:641px){.mobile-menu-btn{display:none!important;}}`}</style>
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen&&(
        <div style={{ background:"rgba(5,9,26,0.98)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"8px 16px" }}>
          {NAV_ITEMS.map(item=>(
            <div key={item.id} onClick={()=>{setPage(item.id);setMenuOpen(false);}} style={{ padding:"10px 12px", fontSize:14, fontWeight:600, color:page===item.id?"#fff":"#8899bb", background:page===item.id?"rgba(0,87,255,0.15)":"transparent", borderRadius:8, marginBottom:4, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              {item.icon} {item.label}
            </div>
          ))}
        </div>
      )}

      {/* PAGE CONTENT */}
      <div className="fade-up" key={page}>
        {page==="home"     && <LandingPage onStart={()=>setPage("builder")} plan={plan} setPlan={setPlan}/>}
        {page==="builder"  && <Builder plan={plan} onNavigate={setPage}/>}
        {page==="ats"      && <ATSChecker plan={plan}/>}
        {page==="jobmatch" && <JobMatch plan={plan}/>}
        {page==="templates"&& <TemplatesPage plan={plan} onNavigate={setPage}/>}
        {page==="plans"    && <PlansPage plan={plan} setPlan={setPlan}/>}
      </div>
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ResumeAIIndia />);

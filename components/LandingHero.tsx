'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './landing-hero.css';

export default function LandingHero() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeVaultDetailRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Element;
      // also exclude .mob-dd so clicks inside the dropdown don't close it before link fires
      if (!t.closest('#lh-nav') && !t.closest('.mob-dd')) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  useEffect(() => {
    let mounted = true;
    const iids: ReturnType<typeof setInterval>[] = [];
    let tourTimer: ReturnType<typeof setTimeout> | null = null;

    /* ═══ DATA ═══ */
    const ROWS = ['A','B','C','D','E','F'];
    const COLS = 8;
    const CLIENTS = ['Martinez','Rodriguez','Johnson','Williams','Brown','Davis','Garcia','Lopez','Wilson','Anderson','Taylor','Thomas'];
    const JOBS = ['Fire','Water','Moving','Storage'];
    const STATUSES = ['PENDING','PENDING','READY','READY','READY','READY','DELIVERED','empty','empty'];
    const PACKERS = ['J. Rodriguez','M. Garcia','K. Wilson','T. Johnson','S. Davis','R. Anderson'];
    const ROOMS_ALL = ['Living Room','Bedroom','Kitchen','Bathroom','Garage','Office','Dining Room','Master Bedroom','Basement'];
    const VAULT_STATUS_TAGS = ['Needs Cleaning','Ready to Go','Storage Only','Total Loss'];
    const CONTENT_TYPES = ['Boxes','Furniture','Both'];
    const PHOTO_COLORS: Record<string,string[][]> = {
      Fire:[['#fef3c7','#fde68a'],['#fff7ed','#fed7aa'],['#fef2f2','#fecaca']],
      Water:[['#eff6ff','#bfdbfe'],['#f0f9ff','#bae6fd'],['#ecfeff','#a5f3fc']],
      Moving:[['#f5f3ff','#ddd6fe'],['#fdf4ff','#e9d5ff'],['#f0fdf4','#bbf7d0']],
      Storage:[['#f0fdf4','#bbf7d0'],['#f9fafb','#e5e7eb'],['#fff7ed','#fed7aa']],
    };

    function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }
    function rndN(min: number, max: number) { return min + Math.floor(Math.random()*(max-min+1)); }
    function pick<T>(arr: T[], n: number): T[] { const a=[...arr],r:T[]=[]; while(r.length<n&&a.length){const i=Math.floor(Math.random()*a.length);r.push(a.splice(i,1)[0]);} return r; }

    type Cell = { row:string;col:number;status:string;client:string;job:string;packer:string;rooms:string[];vaultStatus:string[];content:string;photoCount:number };
    let gridData: Cell[][] = [];

    function makeGrid(): Cell[][] {
      return ROWS.map(row=>Array.from({length:COLS},(_,c)=>{
        const s=rnd(STATUSES);const job=rnd(JOBS);const client=rnd(CLIENTS);
        return {row,col:c+1,status:s,client,job,packer:rnd(PACKERS),rooms:pick(ROOMS_ALL,rndN(1,3)),vaultStatus:s==='empty'?[]:pick(VAULT_STATUS_TAGS,rndN(0,2)),content:rnd(CONTENT_TYPES),photoCount:s==='empty'?0:rndN(0,4)};
      }));
    }

    let selectedCell: {row:string;col:number}|null = null;

    /* ═══ FEATURE CAROUSEL ═══ */
    const FEATURES = [
      {color:'#2563eb',bg:'#eff6ff',border:'#bfdbfe',tagColor:'#1d4ed8',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>',title:'Photo Documentation',desc:'Attach up to 6 photos per vault with automatic compression. Lightbox viewer for quick inspection on any device.',tag:'Up to 6 photos per vault'},
      {color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe',tagColor:'#6d28d9',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h1v1h-1zm0 4h1v1h-1zm4-4h1v1h-1zm0 4h1v1h-1z"/></svg>',title:'QR Code Scanning',desc:'Every vault gets a printable QR code. Scan from any phone to instantly pull up client info, status and photos.',tag:'Scan from any device'},
      {color:'#0891b2',bg:'#ecfeff',border:'#a5f3fc',tagColor:'#0e7490',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',title:'Team Chat',desc:'Built-in messaging so packers, supervisors and owners stay in sync — no external apps needed.',tag:'Real-time · 10s polling'},
      {color:'#059669',bg:'#ecfdf5',border:'#a7f3d0',tagColor:'#047857',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',title:'Email Snapshots',desc:'Generate a full warehouse report with one click and send directly to clients or management via EmailJS.',tag:'Formatted PDF reports'},
      {color:'#d97706',bg:'#fffbeb',border:'#fde68a',tagColor:'#b45309',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',title:'Global Search',desc:'Search across all warehouses by client name, job type, packer or position. Results link directly to the vault.',tag:'Across all warehouses'},
      {color:'#dc2626',bg:'#fef2f2',border:'#fecaca',tagColor:'#b91c1c',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>',title:'Work Orders',desc:'Create Cleaning, Restoration and Delivery tasks. Assign to team members and track progress from Pending to Done.',tag:'Cleaning · Restoration · Delivery'},
      {color:'#4f46e5',bg:'#eef2ff',border:'#c7d2fe',tagColor:'#4338ca',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',title:'Role-Based Access',desc:'Owners manage the full operation. Workers see their tasks. Invite teammates with a unique company code.',tag:'Owner · Worker roles'},
      {color:'#0369a1',bg:'#f0f9ff',border:'#bae6fd',tagColor:'#0284c7',icon:'<svg fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',title:'Statistics & Analytics',desc:'Visual breakdowns by status, job type, warehouse and client. Filter by 7 days, 30 days, 3 months or all time.',tag:'Charts · Filters · Trends'},
    ];
    let featIdx = 0;
    function buildCarousel() {
      const wrap = document.getElementById('featCarousel');
      const dotsEl = document.getElementById('featDotsRow');
      if (!wrap||!dotsEl) return;
      wrap.innerHTML = FEATURES.map((f,i)=>`<div class="feat-card${i===0?' active':''}" id="feat${i}"><div class="feat-icon-wrap" style="background:${f.bg}"><span style="color:${f.color}">${f.icon}</span></div><div class="feat-title">${f.title}</div><div class="feat-desc">${f.desc}</div><div class="feat-tag" style="background:${f.bg};border-color:${f.border};color:${f.tagColor}"><svg fill="none" stroke="currentColor" stroke-width="2.5" width="7" height="7" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>${f.tag}</div></div>`).join('');
      dotsEl.innerHTML = FEATURES.map((_,i)=>`<div class="feat-dot${i===0?' on':''}" id="fdot${i}"></div>`).join('');
    }
    function rotateFeat() {
      if (!mounted) return;
      const prev = document.getElementById('feat'+featIdx);
      const prevDot = document.getElementById('fdot'+featIdx);
      if (prev) prev.classList.remove('active');
      if (prevDot) prevDot.classList.remove('on');
      featIdx = (featIdx+1) % FEATURES.length;
      const next = document.getElementById('feat'+featIdx);
      const nextDot = document.getElementById('fdot'+featIdx);
      if (next) next.classList.add('active');
      if (nextDot) nextDot.classList.add('on');
    }

    /* ═══ DONUT CHART ═══ */
    function polarToXY(cx:number,cy:number,r:number,deg:number){const rad=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}
    function arcPath(cx:number,cy:number,r:number,startDeg:number,endDeg:number){if(endDeg-startDeg>=360)endDeg=startDeg+359.9;const s=polarToXY(cx,cy,r,startDeg);const e=polarToXY(cx,cy,r,endDeg);const large=endDeg-startDeg>180?1:0;return `M${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r} 0 ${large},1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`;}
    function makePieChart(pending:number,ready:number,delivered:number){
      const el=document.getElementById('donutChart');if(!el)return;
      const total=pending+ready+delivered;if(!total){el.innerHTML='';return;}
      const cx=22,cy=22,r=18,t=3;
      const segs=[{v:pending,color:'#fbbf24'},{v:ready,color:'#22c55e'},{v:delivered,color:'#3b82f6'}];
      let cur=0,paths='';
      segs.forEach(seg=>{if(!seg.v)return;const deg=(seg.v/total)*360;paths+=`<path d="${arcPath(cx,cy,r,cur,cur+deg)}" fill="none" stroke="${seg.color}" stroke-width="${t}" stroke-linecap="round"/>`;cur+=deg;});
      const pct=Math.round((ready/total)*100);
      el.innerHTML=`<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f3f4f6" stroke-width="${t}"/>${paths}<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="7" font-weight="800" fill="#111827">${pct}%</text><text x="${cx}" y="${cy+7}" text-anchor="middle" dominant-baseline="middle" font-size="4.5" fill="#9ca3af">ready</text></svg>`;
    }

    /* ═══ STATS ═══ */
    function countStats(){let pending=0,ready=0,delivered=0,total=0;gridData.forEach(r=>r.forEach(c=>{if(c.status==='empty')return;total++;if(c.status==='PENDING')pending++;else if(c.status==='READY')ready++;else if(c.status==='DELIVERED')delivered++;}));return{total,pending,ready,delivered};}
    function updateStats(){
      const s=countStats();
      const set=(id:string,v:string|number)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};
      set('statTotal',s.total);set('statPending',s.pending);set('statReady',s.ready);set('statDelivered',s.delivered);
      set('vaultCountSub',s.total+' vaults stored');set('dPending',s.pending);set('dReady',s.ready);set('dDelivered',s.delivered);
      set('invTotal',s.total+' total vaults');
      makePieChart(s.pending,s.ready,s.delivered);
      const t=s.total||1;
      const sw=(id:string,w:number)=>{const el=document.getElementById(id);if(el)el.style.width=w+'%';};
      sw('barPending',s.pending/t*100);sw('barReady',s.ready/t*100);sw('barDelivered',s.delivered/t*100);
      set('wh1n',Math.round(s.total*.40));set('wh2n',Math.round(s.total*.36));set('wh3n',s.total-Math.round(s.total*.40)-Math.round(s.total*.36));
      const jobs:{[k:string]:number}={Fire:0,Water:0,Moving:0,Storage:0};
      gridData.forEach(r=>r.forEach(c=>{if(c.status!=='empty')jobs[c.job]++;}));
      const jMax=Math.max(...Object.values(jobs),1);
      ['Fire','Water','Moving','Storage'].forEach(j=>{
        const fill=document.getElementById('j'+j);const cnt=document.getElementById('j'+j+'N');
        if(fill)fill.style.width=(jobs[j]/jMax*100)+'%';if(cnt)cnt.textContent=String(jobs[j]);
      });
    }

    /* ═══ VAULT DETAIL ═══ */
    const JOB_CLASS:{[k:string]:string}={Fire:'vdb-fire',Water:'vdb-water',Moving:'vdb-moving',Storage:'vdb-storage'};
    const STATUS_CLASS:{[k:string]:string}={PENDING:'vdb-pending',READY:'vdb-ready',DELIVERED:'vdb-delivered'};
    const STATUS_TOAST_COLOR:{[k:string]:string}={PENDING:'#fbbf24',READY:'#22c55e',DELIVERED:'#3b82f6'};

    function openVaultDetail(cell:Cell){
      if(cell.status==='empty'){closeVaultDetail();return;}
      selectedCell={row:cell.row,col:cell.col};
      const set=(id:string,v:string)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
      set('vdPos',cell.row+cell.col);set('vdClient',cell.client+(rndN(0,1)?' Family':' Co.'));
      const jobBadge=document.getElementById('vdJobBadge');
      if(jobBadge){jobBadge.textContent=cell.job+' Damage';jobBadge.className='vd-badge '+(JOB_CLASS[cell.job]||'');}
      const stBadge=document.getElementById('vdStatusBadge');
      if(stBadge){stBadge.textContent=cell.status;stBadge.className='vd-badge '+(STATUS_CLASS[cell.status]||'');}
      const tagsEl=document.getElementById('vdTags');
      if(tagsEl)tagsEl.innerHTML=cell.vaultStatus.length?cell.vaultStatus.map(t=>`<span class="vd-tag">${t}</span>`).join(''):'<span class="vd-tag" style="color:#d1d5db;border-color:#f3f4f6">None assigned</span>';
      const roomsEl=document.getElementById('vdRooms');
      if(roomsEl)roomsEl.innerHTML=cell.rooms.map(r=>`<span class="vd-tag">${r}</span>`).join('');
      set('vdContent',cell.content);set('vdPacker',cell.packer);set('vdPhotoCount',cell.photoCount+' photo'+(cell.photoCount!==1?'s':''));
      const photosEl=document.getElementById('vdPhotos');
      if(photosEl){const colors=PHOTO_COLORS[cell.job]||PHOTO_COLORS.Storage;let html='';for(let i=0;i<Math.min(cell.photoCount,4);i++){const[c1,c2]=colors[i%colors.length];html+=`<div class="vd-photo" style="background:linear-gradient(135deg,${c1},${c2})"></div>`;}if(cell.photoCount>4)html+=`<div class="vd-photo" style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:7px;color:#9ca3af;font-weight:700">+${cell.photoCount-4}</div>`;photosEl.innerHTML=html;}
      const ap=document.getElementById('analyticsPanel');const sp=document.getElementById('splitPanel');const vd=document.getElementById('vaultDetail');
      if(ap)ap.style.display='none';if(sp)sp.style.display='none';
      if(vd){vd.classList.remove('open');void vd.offsetWidth;vd.classList.add('open');}
      renderGrid();
    }
    function closeVaultDetail(){
      selectedCell=null;
      const vd=document.getElementById('vaultDetail');const ap=document.getElementById('analyticsPanel');const sp=document.getElementById('splitPanel');
      if(vd)vd.classList.remove('open');if(ap)ap.style.display='';if(sp)sp.style.display='';
      renderGrid();
    }
    closeVaultDetailRef.current = closeVaultDetail;

    /* ═══ TOAST ═══ */
    let toastTimer: ReturnType<typeof setTimeout>|null=null;
    function showToast(msg:string,color:string){
      if(toastTimer)clearTimeout(toastTimer);
      const toast=document.getElementById('appToast');const dot=document.getElementById('toastDot');const msgEl=document.getElementById('toastMsg');
      if(dot)dot.style.background=color||'#22c55e';if(msgEl)msgEl.textContent=msg;if(toast)toast.classList.add('show');
      toastTimer=setTimeout(()=>{if(toast)toast.classList.remove('show');},2500);
    }

    /* ═══ GRID RENDER ═══ */
    function renderGrid(){
      const wrap=document.getElementById('whGrid');if(!wrap)return;
      let html=`<div style="display:grid;grid-template-columns:13px repeat(${COLS},minmax(0,1fr));gap:2px;margin-bottom:2px"><div></div>`;
      for(let c=1;c<=COLS;c++)html+=`<div class="wh-col-lbl">${c}</div>`;
      html+='</div>';
      gridData.forEach(rowArr=>{
        html+=`<div class="wh-row"><div class="wh-row-lbl">${rowArr[0].row}</div>`;
        rowArr.forEach(cell=>{
          const isSel=selectedCell&&selectedCell.row===cell.row&&selectedCell.col===cell.col;
          const selClass=isSel?' selected':'';
          if(cell.status==='empty'){html+=`<div class="wh-cell empty${selClass}" data-row="${cell.row}" data-col="${cell.col}"><div class="cell-plus"><svg fill="none" stroke="currentColor" stroke-width="2" width="7" height="7" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div></div>`;}
          else{html+=`<div class="wh-cell ${cell.status.toLowerCase()}${selClass}" data-row="${cell.row}" data-col="${cell.col}">${cell.photoCount>0?'<div class="cell-photo"></div>':''}<div class="cell-client">${cell.client}</div><div class="cell-job">${cell.job}</div></div>`;}
        });
        html+='</div>';
      });
      wrap.innerHTML=html;
      updateStats();
    }

    /* ═══ GRID CLICK (event delegation) ═══ */
    function handleGridClick(e:Event){
      const cellEl=(e.target as Element).closest('.wh-cell');if(!cellEl)return;
      const row=cellEl.getAttribute('data-row');const col=parseInt(cellEl.getAttribute('data-col')||'0');
      if(!row||!col)return;
      const rowArr=gridData.find(r=>r[0].row===row);if(!rowArr)return;
      const cell=rowArr[col-1];if(!cell)return;
      const cycle=['PENDING','READY','DELIVERED','empty'];
      cell.status=cycle[(cycle.indexOf(cell.status)+1)%cycle.length];
      if(cell.status!=='empty'){cell.vaultStatus=pick(VAULT_STATUS_TAGS,rndN(0,2));cell.rooms=pick(ROOMS_ALL,rndN(1,3));cell.photoCount=rndN(0,4);openVaultDetail(cell);showToast(`${cell.row}${cell.col} → ${cell.status}`,STATUS_TOAST_COLOR[cell.status]);}
      else{closeVaultDetail();showToast(`${cell.row}${cell.col} cleared`,'#9ca3af');}
      renderGrid();
    }
    const gridWrap=document.getElementById('whGrid');
    if(gridWrap)gridWrap.addEventListener('click',handleGridClick);
    // store ref for cleanup
    const gridWrapRef = gridWrap;

    /* ═══ AUTO-ANIMATE ═══ */
    function animateRandom(){
      if(!mounted)return;
      const ri=Math.floor(Math.random()*gridData.length);const ci=Math.floor(Math.random()*gridData[ri].length);
      const cell=gridData[ri][ci];const cycle=['PENDING','READY','DELIVERED','empty'];
      cell.status=cycle[Math.floor(Math.random()*cycle.length)];
      if(cell.status!=='empty'){cell.photoCount=rndN(0,4);if(selectedCell&&selectedCell.row===cell.row&&selectedCell.col===cell.col)openVaultDetail(cell);showToast(`${cell.row}${cell.col} → ${cell.status}`,STATUS_TOAST_COLOR[cell.status]);}
      renderGrid();
    }

    /* ═══ TOUR CONTROLLER ═══ */
    const TOUR_SCREENS=['scnWarehouse','scnSearch','scnStats','scnChat'];
    const TOUR_SIDEBAR:{[k:string]:string}={scnWarehouse:'Warehouses',scnSearch:'Search',scnStats:'Stats',scnChat:'Chat'};
    const TOUR_DUR:{[k:string]:number}={scnWarehouse:5000,scnSearch:7000,scnStats:6000,scnChat:7000};
    let tourIdx=0;

    function navigateTo(screenId:string){
      closeVaultDetail();
      const curScr=document.querySelector('.screen.active');const nxt=document.getElementById(screenId);if(!nxt)return;
      if(curScr&&curScr!==nxt){curScr.classList.add('leaving');curScr.classList.remove('active');setTimeout(()=>curScr.classList.remove('leaving'),500);}
      requestAnimationFrame(()=>requestAnimationFrame(()=>nxt.classList.add('active')));
      document.querySelectorAll('.sb-item').forEach(el=>(el as HTMLElement).classList.remove('active'));
      const sbi=document.querySelector(`.sb-item[title="${TOUR_SIDEBAR[screenId]}"]`) as HTMLElement|null;
      if(sbi){sbi.style.background='#eff6ff';sbi.style.color='#2563eb';setTimeout(()=>{sbi.style.background='';sbi.style.color='';sbi.classList.add('active');},280);}
      setTimeout(()=>{
        if(!mounted)return;
        if(screenId==='scnSearch'){runSearchAnim();runCursorSearch();}
        else if(screenId==='scnStats'){runStatsAnim();runCursorStats();}
        else if(screenId==='scnChat'){runChatAnim();runCursorChat();}
        else if(screenId==='scnWarehouse'){runCursorWarehouse();}
      },500);
    }
    function tourStep(){
      if(!mounted)return;
      if(tourTimer)clearTimeout(tourTimer);
      const sid=TOUR_SCREENS[tourIdx];
      navigateTo(sid);
      tourTimer=setTimeout(()=>{if(!mounted)return;tourIdx=(tourIdx+1)%TOUR_SCREENS.length;tourStep();},TOUR_DUR[sid]);
    }

    /* ═══ SEARCH ANIMATION ═══ */
    const SRCH_Q='martinez';
    const SRCH_RES=[
      {pos:'A3',client:'Martinez Family',meta:'Fire Damage · J. Rodriguez · Lower',stBg:'#fef3c7',stC:'#92400e',st:'PENDING'},
      {pos:'C7',client:'Martinez Co.',meta:'Water Damage · M. Garcia · Upper',stBg:'#dcfce7',stC:'#166534',st:'READY'},
      {pos:'E2',client:'J. Martinez',meta:'Moving · K. Wilson · Lower',stBg:'#dbeafe',stC:'#1e40af',st:'DELIVERED'},
      {pos:'B4',client:'Martinez & Sons',meta:'Storage · T. Johnson · Lower',stBg:'#fef3c7',stC:'#92400e',st:'PENDING'},
    ];
    function runSearchAnim(){
      if(!mounted)return;
      const tEl=document.getElementById('srchTyped');const wEl=document.getElementById('srchWrap');const hEl=document.getElementById('srchHint');const lEl=document.getElementById('srchLbl');const rEl=document.getElementById('srchResultsList');
      if(tEl)tEl.textContent='';if(hEl)hEl.style.display='block';if(lEl)lEl.style.display='none';if(rEl)rEl.innerHTML='';if(wEl)wEl.classList.add('focused');
      let i=0;
      function typeNext(){if(!mounted)return;if(!tEl)return;if(i<SRCH_Q.length){tEl.textContent+=SRCH_Q[i];i++;setTimeout(typeNext,55+Math.random()*40);}else{if(hEl)hEl.style.display='none';if(lEl)lEl.style.display='block';if(rEl){rEl.innerHTML=SRCH_RES.map((r,idx)=>`<div class="srch-row" id="sr${idx}"><span class="srch-pos">${r.pos}</span><div class="srch-info"><div class="srch-client">${r.client}</div><div class="srch-meta">${r.meta}</div></div><span class="srch-st" style="background:${r.stBg};color:${r.stC}">${r.st}</span><svg class="srch-arr" fill="none" stroke="currentColor" stroke-width="2" width="8" height="8" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></div>`).join('');SRCH_RES.forEach((_,idx)=>setTimeout(()=>{const row=document.getElementById('sr'+idx);if(row)row.classList.add('vis');},80+idx*90));setTimeout(()=>{const row=document.getElementById('sr0');if(row)row.classList.add('hi');},550);}}}
      setTimeout(typeNext,200);
    }

    /* ═══ STATS ANIMATION ═══ */
    function stCU(id:string,target:number,sfx:string,dur:number){const el=document.getElementById(id);if(!el)return;const t0=Date.now();const tick=()=>{if(!mounted)return;const p=Math.min((Date.now()-t0)/dur,1);const e=1-Math.pow(1-p,3);el.textContent=Math.round(e*target)+(sfx||'');if(p<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}
    function drawSD(p:number,r:number,d:number){const el=document.getElementById('statDonut');if(!el)return;const t=p+r+d;if(!t)return;const cx=32,cy=32,rad=26,sw=4;const segs=[{v:p,c:'#fbbf24'},{v:r,c:'#22c55e'},{v:d,c:'#3b82f6'}];let cur=0,paths='';segs.forEach(seg=>{if(!seg.v)return;const deg=(seg.v/t)*360;paths+=`<path d="${arcPath(cx,cy,rad,cur,cur+deg)}" fill="none" stroke="${seg.c}" stroke-width="${sw}" stroke-linecap="round"/>`;cur+=deg;});const pct=Math.round(r/t*100);el.innerHTML=`<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="#f3f4f6" stroke-width="${sw}"/>${paths}<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="800" fill="#111827">${pct}%</text><text x="${cx}" y="${cy+9}" text-anchor="middle" dominant-baseline="middle" font-size="6" fill="#9ca3af">ready</text></svg>`;}
    function runStatsAnim(){
      if(!mounted)return;
      const s=countStats();
      stCU('scN1',s.total,'',1000);stCU('scN2',s.total>0?Math.round(s.ready/s.total*100):0,'%',1200);stCU('scN4',17,'',900);
      stCU('slN1',s.pending,'',800);stCU('slN2',s.ready,'',800);stCU('slN3',s.delivered,'',800);
      setTimeout(()=>drawSD(s.pending,s.ready,s.delivered),200);
      const jobs:{[k:string]:number}={Fire:0,Water:0,Moving:0,Storage:0};
      gridData.forEach(r=>r.forEach(c=>{if(c.status!=='empty')jobs[c.job]++;}));
      const jMax=Math.max(...Object.values(jobs),1);
      const wh1=Math.round(s.total*.40),wh2=Math.round(s.total*.36),wh3=s.total-Math.round(s.total*.40)-Math.round(s.total*.36);
      const whMax=Math.max(wh1,wh2,wh3,1);
      setTimeout(()=>{
        if(!mounted)return;
        ['Fire','Water','Moving','Storage'].forEach(j=>{const f=document.getElementById('sb'+j);const n=document.getElementById('sb'+j+'N');if(f)f.style.width=(jobs[j]/jMax*100)+'%';if(n)n.textContent=String(jobs[j]);});
        const sw2=(fi:string,ni:string,v:number,m:number)=>{const f=document.getElementById(fi);const n=document.getElementById(ni);if(f)f.style.width=(v/m*100)+'%';if(n)n.textContent=String(v);};
        sw2('sbWh1','sbWh1N',wh1,whMax);sw2('sbWh2','sbWh2N',wh2,whMax);sw2('sbWh3','sbWh3N',wh3,whMax);
      },300);
    }

    /* ═══ CHAT ANIMATION ═══ */
    const CHAT_NEW=[
      {av:'TJ',bg:'#10b981',name:'T. Johnson',text:'Williams vault D5 done — status changed ✓',delay:1200,me:false},
      {av:'BR',bg:'#2563eb',name:'You',text:'Perfect, marking as Delivered now 👍',delay:2800,me:true},
      {av:'MG',bg:'#6366f1',name:'M. Garcia',text:'Rodriguez pickup confirmed for tomorrow 9am 📦',delay:4400,me:false},
    ];
    function runChatAnim(){
      if(!mounted)return;
      const newEl=document.getElementById('chatNewMsgs');const typEl=document.getElementById('cflTyping');const typAvEl=document.getElementById('cflTypingAv');const bodyEl=document.getElementById('chatFullBody');
      if(newEl)newEl.innerHTML='';if(typEl)typEl.classList.remove('vis');
      CHAT_NEW.forEach(msg=>{
        if(!msg.me){setTimeout(()=>{if(!mounted)return;if(typAvEl){typAvEl.textContent=msg.av;typAvEl.style.background=msg.bg;}if(typEl)typEl.classList.add('vis');},msg.delay-900);setTimeout(()=>{if(typEl)typEl.classList.remove('vis');},msg.delay-80);}
        setTimeout(()=>{if(!mounted||!newEl)return;const div=document.createElement('div');div.className='cfl-msg'+(msg.me?' me':'');div.style.cssText='opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s';div.innerHTML=`<div class="cfl-av" style="background:${msg.bg}">${msg.av}</div><div class="cfl-bw"><div class="cfl-name">${msg.name}</div><div class="cfl-bubble">${msg.text}</div><div class="cfl-ts">just now</div></div>`;newEl.appendChild(div);void div.offsetWidth;div.style.opacity='1';div.style.transform='translateY(0)';if(bodyEl)bodyEl.scrollTop=bodyEl.scrollHeight;},msg.delay);
      });
    }

    /* ═══ FAKE CURSOR ═══ */
    const cur=document.getElementById('fakeCursor');
    function cursorMoveTo(x:number,y:number,cb?:()=>void){if(!cur)return cb&&cb();cur.style.left=x+'px';cur.style.top=y+'px';setTimeout(cb||function(){},580);}
    function cursorClick2(cb?:()=>void){if(!cur)return cb&&cb();cur.classList.add('clicking');setTimeout(()=>{cur.classList.remove('clicking');cb&&cb();},260);}
    function cursorAnim(steps:{move?:[number,number];click?:boolean;wait?:number}[]){let i=0;function next(){if(!mounted||i>=steps.length)return;const s=steps[i++];if(s.move){cursorMoveTo(s.move[0],s.move[1],()=>{if(s.click)cursorClick2(()=>setTimeout(next,s.wait||80));else setTimeout(next,s.wait||60);});}else{setTimeout(next,s.wait||60);}}next();}
    function getRelPos(el:Element|null):{x:number;y:number}{if(!el)return{x:20,y:20};const frame=document.getElementById('appFrame');if(!frame)return{x:20,y:20};const fr=frame.getBoundingClientRect();const er=el.getBoundingClientRect();return{x:er.left-fr.left+er.width/2,y:er.top-fr.top+er.height/2};}
    function cellPos(row:string,col:number){const cells=document.querySelectorAll('#scnWarehouse .wh-cell');const ri=['A','B','C','D','E','F'].indexOf(row);if(ri<0||!cells.length)return{x:80,y:60};const idx=ri*COLS+(col-1);return getRelPos(cells[idx]);}
    function runCursorWarehouse(){setTimeout(()=>{if(!mounted)return;const c1=cellPos('B',3);const c2=cellPos('D',6);const c3=cellPos('A',1);cursorAnim([{move:[c1.x,c1.y],wait:200},{move:[c1.x,c1.y],click:true,wait:600},{move:[c2.x,c2.y],wait:300},{move:[c2.x,c2.y],click:true,wait:600},{move:[c3.x,c3.y],wait:250},{move:[c3.x,c3.y],click:true,wait:400}]);},300);}
    function runCursorSearch(){setTimeout(()=>{if(!mounted)return;const sw=document.getElementById('srchWrap');const p=getRelPos(sw);cursorAnim([{move:[p.x,p.y],wait:150},{move:[p.x,p.y],click:true,wait:3200},{move:[p.x,p.y+48],wait:300},{move:[p.x,p.y+48],click:true,wait:400}]);},200);}
    function runCursorStats(){setTimeout(()=>{if(!mounted)return;const btns=document.querySelectorAll('#scnStats .vt-btn');const b7d=btns[0];const b3m=btns[2];const p7=getRelPos(b7d);const p3=getRelPos(b3m);cursorAnim([{move:[p7.x,p7.y],wait:1400},{move:[p7.x,p7.y],click:true,wait:600},{move:[p3.x,p3.y],wait:500},{move:[p3.x,p3.y],click:true,wait:400}]);},400);}
    function runCursorChat(){setTimeout(()=>{if(!mounted)return;const inp=document.querySelector('.cfl-inp');const send=document.querySelector('.cfl-send');const pi=getRelPos(inp);const ps=getRelPos(send);cursorAnim([{move:[pi.x,pi.y],wait:1200},{move:[pi.x,pi.y],click:true,wait:3000},{move:[ps.x,ps.y],wait:300},{move:[ps.x,ps.y],click:true,wait:400}]);},600);}
    if(cur){cur.style.left='80px';cur.style.top='60px';}

    /* ═══ INIT ═══ */
    gridData = makeGrid();
    buildCarousel();
    renderGrid();
    iids.push(setInterval(rotateFeat, 3200));
    iids.push(setInterval(animateRandom, 3500));
    setTimeout(()=>{if(mounted)tourStep();}, 400);

    return () => {
      mounted = false;
      iids.forEach(clearInterval);
      if(tourTimer)clearTimeout(tourTimer);
      if(toastTimer)clearTimeout(toastTimer);
      if(gridWrapRef)gridWrapRef.removeEventListener('click',handleGridClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" id="home">
      {/* NAV */}
      <nav className="lh-nav" id="lh-nav">
        <div className="nav-l">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="lh-logo"><img src="/wm-logo.png" alt="WM" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} draggable={false} /><span className="logo-name">Warehouse Manager</span></div>
          <ul className="nav-links">
            <li className="nl"><a href="#home">Home</a></li>
            <li className="nl"><a href="#features">Features</a></li>
            <li className="nl"><a href="#about">About</a></li>
            <li className="nl"><a href="#contact">Contact</a></li>
          </ul>
        </div>
        <div className="nav-r">
          <button className="lh-btn-ghost" onClick={() => router.push('/login')}>Sign in</button>
          <button className="lh-btn-black" onClick={() => router.push('/login')}>Get access →</button>
          <button className="lh-hbg" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <svg fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </nav>

      {/* MOBILE DROPDOWN */}
      {menuOpen && (
        <div className="mob-dd open">
          <a className="mob-lnk" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a className="mob-lnk" href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a className="mob-lnk" href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a className="mob-lnk" href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </div>
      )}

      {/* HERO BODY */}
      <div className="hbody">
        {/* Left copy */}
        <div className="h-copy">
          <p className="h-eyebrow">Futuristic · Warehouse Management</p>
          <div className="h-hrow">
            <span className="h-num">05</span>
            <h1 className="h-h1">SMARTER.<br /><em>FASTER.</em></h1>
          </div>
          <div className="h-rule" />
          <div className="h-ctas">
            <button className="lh-btn-black" onClick={() => router.push('/login')}>Get access →</button>
            <button className="lh-btn-ghost" onClick={() => router.push('/login')}>Sign in</button>
          </div>
          <div className="h-trust">
            <div className="jbadge jb-fire">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              Fire Damage
            </div>
            <div className="jbadge jb-water">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              Water Damage
            </div>
            <div className="jbadge jb-moving">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Moving
            </div>
            <div className="jbadge jb-storage">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Storage
            </div>
          </div>
        </div>

        {/* Mobile showcase (hidden — tour covers it) */}
        <div className="mob-showcase" id="mobShowcase" />

        {/* Right — app mockup */}
        <div className="app-wrap" id="appWrap">
          {/* Mobile scroll-pass overlay: sits on top of the frame on mobile so
              finger touches scroll the page instead of getting trapped inside */}
          <div className="mob-scroll-glass" aria-hidden="true" />
          <div className="app-glow" />
          <div className="app-frame" id="appFrame">
            {/* Browser bar */}
            <div className="browser-bar">
              <div className="btr"><div className="bt bt-r" /><div className="bt bt-y" /><div className="bt bt-g" /></div>
              <div className="url-bar">
                <span className="url-lock"><svg fill="none" stroke="currentColor" strokeWidth="2.5" width="9" height="9" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <span>managerwarehouse.cc/warehouses/central</span>
                <span className="url-live"><span className="url-live-dot" />LIVE</span>
              </div>
            </div>

            {/* App body */}
            <div className="app-body">
              {/* SIDEBAR */}
              <div className="app-sidebar">
                <div className="sb-header"><div className="sb-logo-box"><span className="sb-logo-txt">WM</span></div></div>
                <div className="sb-nav">
                  <div className="sb-item" title="Dashboard"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                  <div className="sb-item active" title="Warehouses"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><path d="M6 22V12a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/><path d="M2 22V9.2a2 2 0 0 1 .9-1.66L11.9 2.4a2 2 0 0 1 2.2 0l9 5.14A2 2 0 0 1 24 9.2V22"/><path d="M2 22h20"/></svg></div>
                  <div className="sb-item" title="Storage"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>
                  <div className="sb-item" title="Tasks"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg><span className="sb-badge">3</span></div>
                  <div className="sb-item" title="Search"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                  <div className="sb-item" title="Stats"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
                  <div className="sb-item" title="Snapshots"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg></div>
                  <div className="sb-item" title="Chat"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span className="sb-badge">2</span></div>
                  <div className="sb-item" title="Settings"><svg fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
                </div>
                <div className="sb-footer"><div className="sb-avatar">BR</div></div>
              </div>

              {/* MAIN */}
              <div className="app-main">
                {/* Screen 1: Warehouse */}
                <div className="screen active" id="scnWarehouse">
                  <div className="app-topbar">
                    <div><div className="app-title">Central Warehouse</div><div className="app-subtitle" id="vaultCountSub">47 vaults stored</div></div>
                    <div className="app-topbar-r">
                      <div className="tb-btn">6×8</div>
                      <div className="view-toggle"><div className="vt-btn on">Map</div><div className="vt-btn">List</div></div>
                      <div className="tb-btn">Scan QR</div>
                      <div className="tb-add">+ Add Vault</div>
                    </div>
                  </div>
                  <div className="level-bar">
                    <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
                      <span className="level-lbl">Level:</span>
                      <div className="level-toggle"><div className="lv-btn on">Lower</div><div className="lv-btn">Upper</div></div>
                    </div>
                    <div className="legend">
                      <div className="leg-item"><div className="leg-dot" style={{background:'#f3f4f6',border:'1px dashed #d1d5db'}} /><span className="leg-lbl">Empty</span></div>
                      <div className="leg-item"><div className="leg-dot" style={{background:'#fbbf24'}} /><span className="leg-lbl">Pending</span></div>
                      <div className="leg-item"><div className="leg-dot" style={{background:'#22c55e'}} /><span className="leg-lbl">Ready</span></div>
                      <div className="leg-item"><div className="leg-dot" style={{background:'#3b82f6'}} /><span className="leg-lbl">Delivered</span></div>
                    </div>
                  </div>
                  <div className="stats-strip">
                    <div className="ss-chip"><div className="ss-dot" style={{background:'#6b7280'}} /><span id="statTotal">47</span>&nbsp;Total</div>
                    <div className="ss-chip"><div className="ss-dot" style={{background:'#fbbf24'}} /><span id="statPending">12</span>&nbsp;Pending</div>
                    <div className="ss-chip"><div className="ss-dot" style={{background:'#22c55e'}} /><span id="statReady">28</span>&nbsp;Ready</div>
                    <div className="ss-chip"><div className="ss-dot" style={{background:'#3b82f6'}} /><span id="statDelivered">7</span>&nbsp;Delivered</div>
                  </div>
                  <div className="wh-grid-wrap" id="whGrid" />
                  <div className="app-split" id="splitPanel">
                    <div className="split-col">
                      <div className="split-hd">Work Orders<span style={{background:'#ef4444',color:'#fff',fontSize:'5px',fontWeight:700,borderRadius:'9999px',padding:'1px 4px'}}>5 pending</span></div>
                      <div className="task-items">
                        <div className="task-row"><span className="task-type-pill" style={{background:'#fef3c7',color:'#92400e'}}>Cleaning</span><div className="task-detail"><div className="task-client">Martinez Family</div><div className="task-sub">Vault A3 · J. Rodriguez</div></div><span className="task-st ts-pending">PENDING</span></div>
                        <div className="task-row"><span className="task-type-pill" style={{background:'#eff6ff',color:'#1d4ed8'}}>Delivery</span><div className="task-detail"><div className="task-client">Rodriguez Co.</div><div className="task-sub">Vault B7 · M. Garcia</div></div><span className="task-st ts-progress">IN PROG</span></div>
                        <div className="task-row"><span className="task-type-pill" style={{background:'#f5f3ff',color:'#7c3aed'}}>Restoration</span><div className="task-detail"><div className="task-client">Johnson Family</div><div className="task-sub">Vault C2 · K. Wilson</div></div><span className="task-st ts-done">DONE</span></div>
                        <div className="task-row"><span className="task-type-pill" style={{background:'#fef3c7',color:'#92400e'}}>Cleaning</span><div className="task-detail"><div className="task-client">Williams Co.</div><div className="task-sub">Vault D5 · T. Johnson</div></div><span className="task-st ts-pending">PENDING</span></div>
                        <div className="task-row"><span className="task-type-pill" style={{background:'#eff6ff',color:'#1d4ed8'}}>Delivery</span><div className="task-detail"><div className="task-client">Brown Family</div><div className="task-sub">Vault E1 · S. Davis</div></div><span className="task-st ts-progress">IN PROG</span></div>
                      </div>
                    </div>
                    <div className="split-col">
                      <div className="split-hd">Team Chat<span style={{background:'#2563eb',color:'#fff',fontSize:'5px',fontWeight:700,borderRadius:'9999px',padding:'1px 4px'}}>2 unread</span></div>
                      <div className="chat-items">
                        <div className="chat-msg"><div className="chat-av" style={{background:'#6366f1'}}>MG</div><div className="chat-bw"><div className="chat-name">M. Garcia</div><div className="chat-bubble">Martinez done — vaults A3 and A4 ready ✓</div><div className="chat-time">2m ago</div></div></div>
                        <div className="chat-msg me"><div className="chat-av" style={{background:'#2563eb'}}>BR</div><div className="chat-bw"><div className="chat-name">You</div><div className="chat-bubble">Thanks, moving to Delivered now</div><div className="chat-time">1m ago</div></div></div>
                        <div className="chat-msg"><div className="chat-av" style={{background:'#f59e0b'}}>KW</div><div className="chat-bw"><div className="chat-name">K. Wilson</div><div className="chat-bubble">Row C cleaned, photos needed for Johnson</div><div className="chat-time">just now</div></div></div>
                        <div className="chat-msg me"><div className="chat-av" style={{background:'#2563eb'}}>BR</div><div className="chat-bw"><div className="chat-name">You</div><div className="chat-bubble">On it, uploading now 📷</div><div className="chat-time">just now</div></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="app-analytics" id="analyticsPanel">
                    <div className="ana-col">
                      <div className="ana-hd">Inventory Status</div>
                      <div className="donut-wrap"><div id="donutChart" /><div className="donut-legend"><div className="dl-row"><div className="dl-dot" style={{background:'#fbbf24'}} /><span className="dl-lbl">Pending</span><span className="dl-n" id="dPending">12</span></div><div className="dl-row"><div className="dl-dot" style={{background:'#22c55e'}} /><span className="dl-lbl">Ready</span><span className="dl-n" id="dReady">28</span></div><div className="dl-row"><div className="dl-dot" style={{background:'#3b82f6'}} /><span className="dl-lbl">Delivered</span><span className="dl-n" id="dDelivered">7</span></div></div></div>
                      <div className="inv-bar"><div className="inv-seg" id="barPending" style={{background:'#fbbf24',width:'0%'}} /><div className="inv-seg" id="barReady" style={{background:'#22c55e',width:'0%'}} /><div className="inv-seg" id="barDelivered" style={{background:'#3b82f6',width:'0%'}} /></div>
                      <div className="inv-total" id="invTotal">47 total vaults</div>
                      <div className="wh-mini-grid"><div className="wh-mini-card"><div className="wh-mini-n" id="wh1n">19</div><div className="wh-mini-l">Central</div></div><div className="wh-mini-card"><div className="wh-mini-n" id="wh2n">17</div><div className="wh-mini-l">North</div></div><div className="wh-mini-card"><div className="wh-mini-n" id="wh3n">11</div><div className="wh-mini-l">South</div></div><div className="wh-mini-card"><div className="wh-mini-n" style={{color:'#9ca3af',fontSize:'9px'}}>+</div><div className="wh-mini-l">Add new</div></div></div>
                    </div>
                    <div className="ana-col">
                      <div className="ana-hd">By Job Type</div>
                      <div className="job-row"><div className="job-dot" style={{background:'#ef4444'}} /><span className="job-name">Fire</span><div className="job-track"><div className="job-fill" id="jFire" style={{background:'#ef4444',width:'0%'}} /></div><span className="job-pct" id="jFireN">0</span></div>
                      <div className="job-row"><div className="job-dot" style={{background:'#3b82f6'}} /><span className="job-name">Water</span><div className="job-track"><div className="job-fill" id="jWater" style={{background:'#3b82f6',width:'0%'}} /></div><span className="job-pct" id="jWaterN">0</span></div>
                      <div className="job-row"><div className="job-dot" style={{background:'#a855f7'}} /><span className="job-name">Moving</span><div className="job-track"><div className="job-fill" id="jMoving" style={{background:'#a855f7',width:'0%'}} /></div><span className="job-pct" id="jMovingN">0</span></div>
                      <div className="job-row"><div className="job-dot" style={{background:'#6b7280'}} /><span className="job-name">Storage</span><div className="job-track"><div className="job-fill" id="jStorage" style={{background:'#6b7280',width:'0%'}} /></div><span className="job-pct" id="jStorageN">0</span></div>
                      <div className="ana-divider" />
                      <div style={{fontSize:'5.5px',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'#9ca3af',marginBottom:'3px',flexShrink:0}}>Work Orders</div>
                      <div className="wo-item"><div className="wo-icon" style={{background:'#f9fafb',color:'#9ca3af'}}><svg fill="none" stroke="currentColor" strokeWidth="2" width="9" height="9" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><span className="wo-lbl">Pending</span><span className="wo-n" id="woPending">5</span></div>
                      <div className="wo-item"><div className="wo-icon" style={{background:'#fffbeb',color:'#f59e0b'}}><svg fill="none" stroke="currentColor" strokeWidth="2" width="9" height="9" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div><span className="wo-lbl">In Progress</span><span className="wo-n" id="woInProgress">3</span></div>
                      <div className="wo-item"><div className="wo-icon" style={{background:'#f0fdf4',color:'#22c55e'}}><svg fill="none" stroke="currentColor" strokeWidth="2" width="9" height="9" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><span className="wo-lbl">Completed</span><span className="wo-n" id="woDone">9</span></div>
                      <div className="wo-total-row"><span className="wo-total-n" id="woTotal">17</span><span className="wo-total-l">Total work orders</span></div>
                    </div>
                    <div className="ana-col">
                      <div className="ana-hd">What it does</div>
                      <div className="feat-carousel" id="featCarousel" />
                      <div className="feat-dots-row" id="featDotsRow" />
                    </div>
                  </div>
                  <div className="vault-detail" id="vaultDetail">
                    <div className="vd-header">
                      <div className="vd-pos"><span className="vd-pos-badge" id="vdPos">A3</span><span className="vd-level-badge">Lower Level</span></div>
                      <button className="vd-close" onClick={() => closeVaultDetailRef.current?.()}>✕</button>
                    </div>
                    <div className="vd-body">
                      <div className="vd-client-name" id="vdClient">Martinez Family</div>
                      <div className="vd-badges-row"><span className="vd-badge" id="vdJobBadge">Fire Damage</span><span className="vd-badge" id="vdStatusBadge">PENDING</span></div>
                      <div className="vd-section"><div className="vd-section-label">Vault Status</div><div className="vd-tags-wrap" id="vdTags" /></div>
                      <div className="vd-section"><div className="vd-section-label">Room Locations</div><div className="vd-tags-wrap" id="vdRooms" /></div>
                      <div className="vd-meta-row">
                        <div className="vd-meta"><div className="vd-meta-label">Content</div><div className="vd-meta-val" id="vdContent">Boxes</div></div>
                        <div className="vd-meta"><div className="vd-meta-label">Packer</div><div className="vd-meta-val" id="vdPacker">J. Rodriguez</div></div>
                        <div className="vd-meta"><div className="vd-meta-label">Photos</div><div className="vd-meta-val" id="vdPhotoCount">3</div></div>
                      </div>
                      <div className="vd-photos" id="vdPhotos" />
                      <div className="vd-actions">
                        <button className="vd-btn vd-btn-primary">Edit</button>
                        <button className="vd-btn">Print QR</button>
                        <button className="vd-btn">Photos</button>
                        <button className="vd-btn vd-btn-danger" style={{marginLeft:'auto'}}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Screen 2: Search */}
                <div className="screen" id="scnSearch">
                  <div className="app-topbar"><div><div className="app-title">Global Search</div><div className="app-subtitle">All warehouses · All clients</div></div></div>
                  <div style={{padding:'8px 10px',background:'#fff',borderBottom:'1px solid #f3f4f6',flexShrink:0,display:'flex',gap:'6px',alignItems:'center'}}>
                    <div className="srch-input-wrap" id="srchWrap">
                      <svg fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" viewBox="0 0 24 24" style={{color:'#9ca3af',flexShrink:0}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      <span id="srchTyped" className="srch-typed" /><span className="srch-cursor">|</span>
                    </div>
                  </div>
                  <div className="srch-hint" id="srchHint">Search by client name, vault position, or job type</div>
                  <div className="srch-section-lbl" id="srchLbl" style={{display:'none'}}>4 results for &ldquo;martinez&rdquo;</div>
                  <div className="srch-results-wrap" id="srchResultsList" />
                </div>

                {/* Screen 3: Statistics */}
                <div className="screen" id="scnStats">
                  <div className="app-topbar">
                    <div><div className="app-title">Statistics</div><div className="app-subtitle">Company overview</div></div>
                    <div className="app-topbar-r"><div className="view-toggle"><div className="vt-btn">7d</div><div className="vt-btn on">30d</div><div className="vt-btn">3m</div><div className="vt-btn">All</div></div></div>
                  </div>
                  <div className="stat-cards-row">
                    <div className="stat-card"><div className="stat-card-n" id="scN1">—</div><div className="stat-card-l">Total Vaults</div><div className="stat-card-trend t-up">↑ 12%</div></div>
                    <div className="stat-card"><div className="stat-card-n" id="scN2">—</div><div className="stat-card-l">Ready Rate</div><div className="stat-card-trend t-up">↑ 8%</div></div>
                    <div className="stat-card"><div className="stat-card-n">3</div><div className="stat-card-l">Warehouses</div><div className="stat-card-trend t-neu">Active</div></div>
                    <div className="stat-card"><div className="stat-card-n" id="scN4">—</div><div className="stat-card-l">Work Orders</div><div className="stat-card-trend t-dn">5 pending</div></div>
                  </div>
                  <div className="stat-chart-row">
                    <div className="stat-col">
                      <div className="stat-col-hd">By Status</div>
                      <div className="stat-donut-area"><div id="statDonut" /><div><div className="stat-leg-row"><div className="stat-leg-dot" style={{background:'#fbbf24'}} /><span className="stat-leg-lbl">Pending</span><span className="stat-leg-n" id="slN1">—</span></div><div className="stat-leg-row"><div className="stat-leg-dot" style={{background:'#22c55e'}} /><span className="stat-leg-lbl">Ready</span><span className="stat-leg-n" id="slN2">—</span></div><div className="stat-leg-row"><div className="stat-leg-dot" style={{background:'#3b82f6'}} /><span className="stat-leg-lbl">Delivered</span><span className="stat-leg-n" id="slN3">—</span></div></div></div>
                    </div>
                    <div className="stat-col">
                      <div className="stat-col-hd">By Job Type</div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">Fire</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbFire" style={{background:'#ef4444'}} /></div><span className="stat-bar-n" id="sbFireN">—</span></div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">Water</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbWater" style={{background:'#3b82f6'}} /></div><span className="stat-bar-n" id="sbWaterN">—</span></div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">Moving</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbMoving" style={{background:'#a855f7'}} /></div><span className="stat-bar-n" id="sbMovingN">—</span></div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">Storage</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbStorage" style={{background:'#6b7280'}} /></div><span className="stat-bar-n" id="sbStorageN">—</span></div>
                    </div>
                    <div className="stat-col">
                      <div className="stat-col-hd">By Warehouse</div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">Central</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbWh1" style={{background:'#6366f1'}} /></div><span className="stat-bar-n" id="sbWh1N">—</span></div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">North</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbWh2" style={{background:'#6366f1'}} /></div><span className="stat-bar-n" id="sbWh2N">—</span></div>
                      <div className="stat-bar-row"><span className="stat-bar-lbl">South</span><div className="stat-bar-track"><div className="stat-bar-fill" id="sbWh3" style={{background:'#6366f1'}} /></div><span className="stat-bar-n" id="sbWh3N">—</span></div>
                    </div>
                  </div>
                </div>

                {/* Screen 4: Chat */}
                <div className="screen" id="scnChat">
                  <div className="app-topbar">
                    <div><div className="app-title">Team Chat</div><div className="app-subtitle">Company channel</div></div>
                    <div className="app-topbar-r"><div className="tb-btn" style={{color:'#22c55e',borderColor:'#bbf7d0'}}><span style={{width:'5px',height:'5px',borderRadius:'50%',background:'#22c55e',display:'inline-block',marginRight:'2px'}} />4 Online</div></div>
                  </div>
                  <div className="chat-full-body" id="chatFullBody">
                    <div className="cfl-msg"><div className="cfl-av" style={{background:'#6366f1'}}>MG</div><div className="cfl-bw"><div className="cfl-name">M. Garcia</div><div className="cfl-bubble">Morning! Martinez vaults A3-A4 packed and ready ✓</div><div className="cfl-ts">9:14 AM</div></div></div>
                    <div className="cfl-msg me"><div className="cfl-av" style={{background:'#2563eb'}}>BR</div><div className="cfl-bw"><div className="cfl-name">You</div><div className="cfl-bubble">Great, updating their status to Ready now</div><div className="cfl-ts">9:16 AM</div></div></div>
                    <div className="cfl-msg"><div className="cfl-av" style={{background:'#f59e0b'}}>KW</div><div className="cfl-bw"><div className="cfl-name">K. Wilson</div><div className="cfl-bubble">Row C cleaned. Photos still needed for Johnson vault</div><div className="cfl-ts">9:22 AM</div></div></div>
                    <div className="cfl-msg me"><div className="cfl-av" style={{background:'#2563eb'}}>BR</div><div className="cfl-bw"><div className="cfl-name">You</div><div className="cfl-bubble">On it, uploading now 📷</div><div className="cfl-ts">9:23 AM</div></div></div>
                    <div className="cfl-typing" id="cflTyping"><div className="cfl-t-av" id="cflTypingAv" style={{background:'#10b981'}}>TJ</div><div className="cfl-dots"><div className="cfl-dot" /><div className="cfl-dot" /><div className="cfl-dot" /></div></div>
                    <div id="chatNewMsgs" />
                  </div>
                  <div className="cfl-input-bar">
                    <input className="cfl-inp" placeholder="Type a message..." readOnly />
                    <button className="cfl-send">Send</button>
                  </div>
                </div>

                {/* Fake cursor */}
                <div className="fake-cursor" id="fakeCursor">
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                    <path className="cursor-dot" d="M1 1L1 15L4.5 11.5L6.5 17L8.5 16.2L6.5 10.5H11L1 1Z" fill="white" stroke="#111827" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Toast */}
                <div className="app-toast" id="appToast">
                  <div className="toast-dot" id="toastDot" />
                  <span id="toastMsg">Vault updated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

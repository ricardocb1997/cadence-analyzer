(function(){
  const $ = (s)=>document.querySelector(s);
  const fileInput = $('#fileInput');
  const analyzeBtn = $('#analyzeBtn');
  const downloadBtn = $('#downloadBtn');
  const logEl = $('#log');
  const summaryEl = $('#summary');
  const decimalSelect = $('#decimalSelect');
  const removeZerosEl = $('#removeZeros');
  const maxCadEl = $('#maxCad');
  const winSizeEl = $('#winSize');
  const itValueEl = $('#itValue');
  const itBadgeEl = $('#itBadge');

  let results = null;
  let charts = { altCad:null, tech:null };

  function log(msg){
    logEl.textContent += `\n${msg}`;
    logEl.scrollTop = logEl.scrollHeight;
  }
  function reset(){
    summaryEl.innerHTML='';
    itValueEl.textContent = '—';
    itBadgeEl.textContent = 'Sin datos';
    itBadgeEl.className = 'it-badge';
    if(charts.altCad){ charts.altCad.destroy(); charts.altCad=null; }
    if(charts.tech){ charts.tech.destroy(); charts.tech=null; }
    results=null; downloadBtn.disabled=true; logEl.textContent='';
  }

  function parseNumber(s, decimal){
    if(s==null) return NaN;
    if(typeof s === 'number') return s;
    s = String(s).trim();
    if(decimal === ',') s = s.replace('.', '').replace(',', '.');
    return Number(s);
  }

  function toSec(ts){ return Math.floor(new Date(ts).getTime()/1000); }

  function linearInterp(x0,y0,x1,y1,x){
    if(x1===x0) return y0;
    const t=(x - x0)/(x1 - x0);
    return y0 + t*(y1 - y0);
  }

  function resample1Hz(rows){
    if(!rows.length) return [];
    const start = rows[0].sec;
    const end   = rows[rows.length-1].sec;
    const bySec = new Map(rows.map(r=>[r.sec, r]));
    const out = [];

    let lastKnown = null;
    let nextIdx = 0;

    for(let s=start; s<=end; s++){
      if(bySec.has(s)){
        out.push({ sec:s, cadence:bySec.get(s).cadence, altitude:bySec.get(s).altitude });
        lastKnown = bySec.get(s);
        while(nextIdx < rows.length && rows[nextIdx].sec <= s) nextIdx++;
      } else {
        while(nextIdx < rows.length && rows[nextIdx].sec < s) nextIdx++;
        const nextKnown = (nextIdx < rows.length) ? rows[nextIdx] : null;
        const cad = (lastKnown && nextKnown)
          ? linearInterp(lastKnown.sec, lastKnown.cadence, nextKnown.sec, nextKnown.cadence, s)
          : (lastKnown ? lastKnown.cadence : (nextKnown ? nextKnown.cadence : NaN));
        const alt = (lastKnown && nextKnown)
          ? linearInterp(lastKnown.sec, lastKnown.altitude, nextKnown.sec, nextKnown.altitude, s)
          : (lastKnown ? lastKnown.altitude : (nextKnown ? nextKnown.altitude : NaN));
        out.push({ sec:s, cadence:cad, altitude:alt });
      }
    }
    return out;
  }

  function rollingStd(arr, w){
    const out=[];
    if(w<=1 || arr.length < w) return out;
    let window = arr.slice(0, w);
    function std(values){
      const n = values.length;
      const mean = values.reduce((a,b)=>a+b,0)/n;
      const v = values.reduce((acc,x)=>acc + (x-mean)*(x-mean), 0) / (n-1);
      return Math.sqrt(v);
    }
    out.push(std(window));
    for(let i=w;i<arr.length;i++){
      window.shift();
      window.push(arr[i]);
      out.push(std(window));
    }
    return out;
  }

  function makeCSV(rows){
    const header = 'time_s,indice_tecnicidad,altitude,cadence\n';
    return header + rows.map(r=>`${r.time_s},${r.indice_tecnicidad},${r.altitude ?? ''},${r.cadence ?? ''}`).join('\n');
  }

  function download(filename, text){
    const blob = new Blob([text], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display='none';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  function finiteArray(arr){ return arr.filter(v=>Number.isFinite(v)); }
  function percentile(sorted, p){
    if(!sorted.length) return NaN;
    const idx = (p/100) * (sorted.length-1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if(lo === hi) return sorted[lo];
    const w = idx - lo;
    return sorted[lo]*(1-w) + sorted[hi]*w;
  }
  function robustLimits(arr, {nonNegative=false, padFrac=0.2, fallback=[0,1]}={}){
    const vals = finiteArray(arr).slice().sort((a,b)=>a-b);
    if(!vals.length) return {min:fallback[0], max:fallback[1]};
    let q1 = percentile(vals, 1);
    let q99 = percentile(vals, 99);
    if(!Number.isFinite(q1) || !Number.isFinite(q99) || q1===q99){
      const m = vals.reduce((a,b)=>a+b,0)/vals.length;
      const range = Math.max(Math.abs(m)*0.5, 1);
      let lo = m - range, hi = m + range;
      if(nonNegative) lo = Math.max(0, lo);
      return {min:lo, max:hi};
    }
    let range = q99 - q1;
    if(range === 0) range = Math.max(Math.abs(q99)*0.5, 1);
    let lo = q1 - range*padFrac;
    let hi = q99 + range*padFrac;
    if(nonNegative) lo = Math.max(0, lo);
    if(hi <= lo) hi = lo + 1;
    return {min:lo, max:hi};
  }

  function itCategory(value){
    if(!Number.isFinite(value)) return {label:'Sin datos', className:''};
    if(value <= 0.30) return {label:'Nada técnico', className:'green'};
    if(value <= 0.60) return {label:'Poco técnico', className:'yellow'};
    if(value <= 0.90) return {label:'Moderadamente técnico', className:'orange'};
    return {label:'Muy técnico', className:'red'};
  }

  function renderSummary(stats){
    const { duration_s, n_windows, pct_removed, removed_zero, removed_high, win, maxCad } = stats;
    summaryEl.innerHTML = `
      <div class="tile"><b>Duración</b>${duration_s.toFixed(1)} s</div>
      <div class="tile"><b>Ventanas (${win}s)</b>${n_windows}</div>
      <div class="tile"><b>% eliminado</b>${pct_removed.toFixed(2)}%</div>
      <div class="tile"><b>Elim. cad=0</b>${removed_zero}</div>
      <div class="tile"><b>Elim. cad>${maxCad}</b>${removed_high}</div>
    `;
  }

  function renderAltCad(t, alt, cad){
    if(charts.altCad){ charts.altCad.destroy(); charts.altCad=null; }
    const limAlt = robustLimits(alt, {nonNegative:false, padFrac:0.15, fallback:[0,10]});
    const limCad = robustLimits(cad, {nonNegative:true, padFrac:0.15, fallback:[0,120]});
    const ctx = document.getElementById('altCadChart');
    charts.altCad = new Chart(ctx, {
      type:'line',
      data:{
        labels: t,
        datasets:[
          { label:'Altitud (m)', data: alt, yAxisID:'yAlt', borderWidth:1, spanGaps:true },
          { label:'Cadencia', data: cad, yAxisID:'yCad', borderDash:[6,4], borderWidth:1, spanGaps:true }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:false,
        interaction:{ mode:'index', intersect:false },
        scales:{
          yAlt:{ position:'left', min: limAlt.min, max: limAlt.max, title:{ display:true, text:'Altitud (m)' } },
          yCad:{ position:'right', min: limCad.min, max: limCad.max, title:{ display:true, text:'Cadencia' }, grid:{ drawOnChartArea:false } },
          x:{ title:{ display:true, text:'Tiempo (s)' } }
        },
        plugins:{ legend:{ position:'top' } }
      }
    });
  }

  function renderTech(t, it){
    if(charts.tech){ charts.tech.destroy(); charts.tech=null; }
    const limIT = robustLimits(it, {nonNegative:true, padFrac=0.25, fallback:[0,1]});
    const ctx = document.getElementById('techChart');
    charts.tech = new Chart(ctx, {
      type:'line',
      data:{
        labels: t,
        datasets:[ { label:'Índice de tecnicidad', data: it, yAxisID:'yIT', borderWidth:1, spanGaps:true } ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:false,
        scales:{
          yIT:{ position:'left', min: limIT.min, max: limIT.max, title:{ display:true, text:'Índice de tecnicidad' } },
          x:{ title:{ display:true, text:'Tiempo (s)' } }
        },
        plugins:{ legend:{ display:false } }
      }
    });
  }

  analyzeBtn.addEventListener('click', ()=>{
    reset();
    const file = fileInput.files?.[0];
    if(!file){ log('Selecciona un CSV.'); return; }
    const decimal = decimalSelect.value;
    const removeZeros = removeZerosEl.checked;
    const maxCad = parseInt(maxCadEl.value||'120',10);
    const win = parseInt(winSizeEl.value||'5',10);

    Papa.parse(file, {
      header:true,
      dynamicTyping:false,
      skipEmptyLines:true,
      complete: (res)=>{
        try{
          const rows = res.data;
          log(`Filas totales (incluyendo cabecera): ${rows.length}`);
          let mapped = [];
          for(const r of rows){
            const ts = r.timestamp ?? r.Time ?? r.date ?? r.datetime;
            if(!ts) continue;
            const sec = toSec(ts);
            let cad = parseNumber(r.cadence ?? r.Cadence, decimal);
            let alt = parseNumber(r.altitude ?? r.Altitude, decimal);
            if(Number.isNaN(cad)) continue;
            mapped.push({ sec, cadence: cad, altitude: alt });
          }
          if(!mapped.length){ log('No se encontraron columnas reconocibles (timestamp, cadence).'); return; }
          mapped.sort((a,b)=>a.sec-b.sec);

          // Cleaning
          const n0 = mapped.length;
          let removed_zero=0, removed_high=0;
          mapped = mapped.filter(r=>{
            if(removeZeros && r.cadence === 0){ removed_zero++; return false; }
            if(r.cadence > maxCad){ removed_high++; return false; }
            return true;
          });
          const n1 = mapped.length;
          const pct_removed = n0? ((n0-n1)/n0*100) : 0;
          log(`Limpieza: eliminadas ${removed_zero} (cad=0), ${removed_high} (cad>${maxCad}).`);

          // Resample 1Hz
          const groupedBySec = new Map();
          for(const r of mapped){
            const k = r.sec;
            if(!groupedBySec.has(k)) groupedBySec.set(k, { cad:[], alt:[] });
            if(Number.isFinite(r.cadence)) groupedBySec.get(k).cad.push(r.cadence);
            if(Number.isFinite(r.altitude)) groupedBySec.get(k).alt.push(r.altitude);
          }
          const compact = Array.from(groupedBySec.entries()).map(([sec, v])=>({
            sec,
            cadence: v.cad.length? v.cad.reduce((a,b)=>a+b,0)/v.cad.length : NaN,
            altitude: v.alt.length? v.alt.reduce((a,b)=>a+b,0)/v.alt.length : NaN
          })).sort((a,b)=>a.sec-b.sec);

          const series = resample1Hz(compact);
          const t = series.map(r=>r.sec - series[0].sec);
          const cad = series.map(r=>r.cadence);
          const alt = series.map(r=>r.altitude);

          // Rolling STD -> Índice de tecnicidad
          const it = rollingStd(cad, win);
          const tAligned = t.slice(win-1);
          const altAligned = alt.slice(win-1);
          const cadAligned = cad.slice(win-1);

          // Global IT
          const itAvg = it.length ? it.reduce((a,b)=>a+b,0)/it.length : NaN;
          itValueEl.textContent = Number.isFinite(itAvg) ? itAvg.toFixed(4) : '—';
          const cat = itCategory(itAvg);
          itBadgeEl.textContent = cat.label;
          itBadgeEl.className = 'it-badge ' + (cat.className || '');

          // Summary tiles
          const duration_s = (series.at(-1).sec - series[0].sec);
          renderSummary({ duration_s, n_windows: it.length, pct_removed, removed_zero, removed_high, win, maxCad });

          // Charts
          renderAltCad(tAligned, altAligned, cadAligned);
          renderTech(tAligned, it);

          // Export results
          results = tAligned.map((time_s, i)=>({ time_s, indice_tecnicidad: it[i], altitude: altAligned[i], cadence: cadAligned[i] }));
          downloadBtn.disabled = !results.length;

        }catch(err){
          console.error(err);
          log('Error procesando el archivo: ' + err.message);
        }
      }
    });
  });

  downloadBtn.addEventListener('click', ()=>{
    if(!results){ return; }
    const csv = makeCSV(results);
    download('indice_tecnicidad_5s.csv', csv);
  });
})();
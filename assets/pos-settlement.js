/* Client-only terminal-statement comparison. Never uploads the provider file.
 * A matching reference is evidence for operator review, not bank-settlement proof.
 * Expected statement columns: reference,kind,amount,currency[,fee]
 * kind=payment|refund; amount/fee in positive EUR with dot-decimal notation.
 */
(function(root) {
'use strict';
function amount(value,label,{zero=false}={}){
  const x=String(value??'').trim();
  if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(x))throw Error(label+' must use EUR with a dot and at most two decimal places');
  const [whole,decimal='']=x.split('.');
  const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)||cents>2000000000||(!zero&&cents<=0))throw Error(label+' is outside supported limits');
  return cents;
}
function rows(text) {
  if(typeof text!=='string'||text.length===0||text.length>1048576)throw Error('Choose a provider CSV smaller than 1 MB');
  if(text.includes('\u0000'))throw Error('Invalid provider CSV');
  const first=text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0];
  const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const out=[];let row=[],field='',quoted=false,justClosed=false;
  const finishField=()=>{row.push(field);field='';justClosed=false;if(row.length>20)throw Error('Provider CSV has too many columns');};
  const finishRow=()=>{finishField();if(row.some(x=>x.trim()!==''))out.push(row);row=[];if(out.length>10001)throw Error('Provider CSV is too large; select a shorter period');};
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'){
        if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;justClosed=true;}
      }else{field+=ch;}
      if(field.length>1000)throw Error('Provider CSV cell is too long');
      continue;
    }
    if(ch==='"'){if(field.length||justClosed)throw Error('Invalid CSV quoting');quoted=true;continue;}
    if(justClosed&&!['\r','\n',delimiter].includes(ch))throw Error('Unexpected content after quoted CSV cell');
    if(ch===delimiter){finishField();continue;}
    if(ch==='\r'){if(text[i+1]==='\n')i++;finishRow();continue;}
    if(ch==='\n'){finishRow();continue;}
    field+=ch;if(field.length>1000)throw Error('Provider CSV cell is too long');
  }
  if(quoted)throw Error('Unclosed CSV quote');
  if(field.length||row.length||justClosed)finishRow();
  return out;
}
function parseProviderCSV(text){
  const table=rows(text);
  if(table.length<2)throw Error('Provider CSV needs a header and at least one transaction');
  const header=table.shift().map(h=>h.trim().toLowerCase());
  if(new Set(header).size!==header.length)throw Error('Duplicate provider CSV headers');
  for(const required of ['reference','kind','amount','currency'])if(!header.includes(required))throw Error('Missing provider CSV column: '+required);
  const accepted=new Set(['reference','kind','amount','currency','fee']);
  if(header.some(h=>!accepted.has(h)))throw Error('Unknown provider CSV column; use the expected statement template');
  return table.map((fields,i)=>{
    if(fields.length!==header.length)throw Error('Incorrect number of columns on statement row '+(i+2));
    const item=Object.fromEntries(header.map((k,j)=>[k,fields[j].trim()]));
    const ref=item.reference;
    if(!ref||ref.length>120||/[\x00-\x1f]/.test(ref))throw Error('Invalid transaction reference on row '+(i+2));
    if(!['payment','refund'].includes(item.kind.toLowerCase()))throw Error('Use payment or refund on row '+(i+2));
    if(item.currency!=='EUR')throw Error('Provider CSV must use EUR; do not guess currency conversion');
    return {reference:ref,kind:item.kind.toLowerCase(),
      amount_cents:amount(item.amount,'Amount on row '+(i+2)),
      fee_cents:amount(item.fee||'0','Fee on row '+(i+2),{zero:true})};
  });
}
const key=x=>x.kind+'\u0000'+x.reference;
function compare(feed,statement){
  if(!feed||feed.currency!=='EUR'||!Array.isArray(feed.payments)||!Array.isArray(feed.refunds))
    throw Error('Invalid protected PoS reconciliation feed');
  if(!Array.isArray(statement)||!statement.length||statement.length>10000)throw Error('Provider statement required');
  const recorded=[];
  const notes=[];
  for(const p of feed.payments) {
    if(p.kind==='reversal_note'){notes.push(p);continue;}
    if(p.kind!=='payment'||!['card','other'].includes(p.method))throw Error('Unsupported PoS payment record');
    recorded.push(p);
  }
  for(const r of feed.refunds){
    if(r.kind!=='refund'||!['card','other'].includes(r.method))throw Error('Unsupported PoS refund record');
    recorded.push(r);
  }
  const map=new Map(),positions=new Map(),differences=[];
  for(const item of statement){
    if(!['payment','refund'].includes(item.kind)||item.currency!==undefined&&item.currency!=='EUR'||
       !Number.isSafeInteger(item.amount_cents)||item.amount_cents<=0||
       !Number.isSafeInteger(item.fee_cents)||item.fee_cents<0)throw Error('Invalid provider statement row');
    const k=key(item);
    if(!map.has(k))map.set(k,[]);
    map.get(k).push(item);
  }
  for(const rec of recorded){
    const ref=String(rec.reference||'').trim(),k=key({...rec,reference:ref});
    const matches=map.get(k)||[];
    if(!ref||!Number.isSafeInteger(Number(rec.amount_cents))||Number(rec.amount_cents)<=0){
      differences.push({kind:rec.kind,reference:ref||'(missing)',status:'invalid_pos_record',recorded_cents:rec.amount_cents,statement_cents:null});
      continue;
    }
    positions.set(k,(positions.get(k)||0)+1);
    let status='matched_statement_only';
    if(matches.length===0)status='missing_in_provider_statement';
    else if(matches.length>1)status='duplicate_provider_reference';
    else if(matches[0].amount_cents!==Number(rec.amount_cents))status='amount_mismatch';
    else if(rec.status==='open'&&rec.kind==='payment')status='open_order_requires_review';
    else if(rec.kind==='refund'&&!rec.fiscal_correction_reference)status='fiscal_correction_requires_review';
    differences.push({kind:rec.kind,reference:ref,status,recorded_cents:Number(rec.amount_cents),
      statement_cents:matches.length===1?matches[0].amount_cents:null,method:rec.method||null});
  }
  for(const [k,count] of positions)if(count>1)
    for(const row of differences)if(key(row)===k)row.status='duplicate_pos_reference';
  for(const [k,entries] of map)if(!positions.has(k)){
    for(const e of entries)differences.push({kind:e.kind,reference:e.reference,status:'not_found_in_pos',recorded_cents:null,statement_cents:e.amount_cents});
  }
  const totals=statement.reduce((t,e)=>{
    t[e.kind==='payment'?'provider_payments_cents':'provider_refunds_cents']+=e.amount_cents;
    t.provider_fees_cents+=e.fee_cents;
    return t;
  },{provider_payments_cents:0,provider_refunds_cents:0,provider_fees_cents:0});
  totals.expected_net_from_provider_csv_cents=totals.provider_payments_cents-totals.provider_refunds_cents-totals.provider_fees_cents;
  const matched=differences.filter(x=>x.status==='matched_statement_only').length;
  return {matched_statement_only:matched,needs_review:differences.length-matched+notes.length,
    differences,unverified_reversal_notes:notes.length,totals,
    provider_verified:false,bank_settlement_verified:false,
    notice:'References matched only against the imported statement. Verify the provider report and actual bank deposits independently; fiscal corrections and AEAT issuance remain separate.'};
}
function renderPanel(p){
 if(!p?.open)return '';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat(undefined,{style:'currency',currency:'EUR'}).format(Number(v||0)/100);
 const result=p.result,rows=Array.isArray(result?.differences)?result.differences:[],total=result?.totals;
 const message=status=>({
   matched_statement_only:'Statement reference and gross amount match (not bank verified)',
   open_order_requires_review:'External payment on an unposted order',
   fiscal_correction_requires_review:'Recorded refund needs fiscal correction review',
   duplicate_provider_reference:'Duplicate in provider CSV',
   duplicate_pos_reference:'Duplicate in PoS',
   missing_in_provider_statement:'PoS payment not in statement',
   not_found_in_pos:'Provider statement entry not found in PoS',
   amount_mismatch:'Provider and PoS gross amounts differ',
   invalid_pos_record:'Incomplete PoS reference or amount'
 })[status]||'Needs review';
 return '<div class="hp-ledger-backdrop"><button type="button" class="hp-ledger-dim" data-action="hp-settlement-close" aria-label="Close statement comparison"></button>'+
 '<section class="hp-settlement-dialog" role="dialog" aria-modal="true" aria-label="External terminal statement comparison" tabindex="-1">'+
 '<header><div><span class="hp-ledger-kicker">EXTERNAL TERMINAL / ACCOUNTANT REVIEW</span><h2>Reconcile a payment statement</h2><p>Compare recorded PoS references with your provider’s CSV, privately in this browser. No file upload or provider charge.</p></div><button class="action-btn" data-action="hp-settlement-close" type="button" aria-label="Close comparison">✕ Close</button></header>'+
 '<div class="hp-settlement-scroll">'+
 '<form class="hp-ledger-refund-form" data-form="hp-settlement-import">'+
 '<label>From date (local)<input type="date" name="from" required value="'+esc(p.from||'')+'"></label>'+
 '<label>Through date (local)<input type="date" name="through" required value="'+esc(p.through||'')+'"></label>'+
 '<label>Provider CSV file<input name="statement" type="file" accept=".csv,text/csv,text/plain" required></label>'+
 '<p class="hp-ledger-disclaimer">Required CSV columns: <code>reference,kind,amount,currency</code>; optional <code>fee</code>. Use <code>payment</code> or <code>refund</code>, positive EUR amounts with decimal points, and the exact terminal references. Choose the same date range as the provider report.</p>'+
 '<button class="action-btn primary" type="submit" '+(p.loading?'disabled':'')+'>Compare statement locally</button></form>'+
 (p.error?'<p class="hp-ledger-error" role="alert">'+esc(p.error)+'</p>':'')+
 (p.loading?'<p role="status">Comparing protected PoS evidence to your statement…</p>':'')+
 (result?'<div class="hp-settlement-summary" role="status">'+
 '<div><span>Reference/amount matches</span><strong>'+esc(result.matched_statement_only)+'</strong></div>'+
 '<div><span>Items requiring review</span><strong>'+esc(result.needs_review)+'</strong></div>'+
 '<div><span>Provider CSV expected net, after listed fees</span><strong>'+money(total?.expected_net_from_provider_csv_cents)+'</strong></div>'+
 '<div><span>Provider fees shown in CSV</span><strong>'+money(total?.provider_fees_cents)+'</strong></div></div>'+
 '<p class="hp-ledger-disclaimer">'+esc(result.notice)+'</p>'+
 '<div class="hp-settlement-results" role="list">'+rows.slice(0,200).map(row=>
 '<div role="listitem" class="'+(row.status==='matched_statement_only'?'hp-settlement-matched':'hp-settlement-review')+'">'+
 '<strong>'+esc(row.kind)+' · '+esc(row.reference)+'</strong><span>'+esc(message(row.status))+'</span>'+
 '<small>PoS '+(row.recorded_cents==null?'not found':money(row.recorded_cents))+
 ' · Statement '+(row.statement_cents==null?'not found':money(row.statement_cents))+'</small></div>').join('')+'</div>'+
 (rows.length>200?'<p role="alert">Showing 200 of '+esc(rows.length)+' comparisons. Narrow the period to inspect all entries.</p>':'')+
 (result.unverified_reversal_notes?'<p role="alert">'+esc(result.unverified_reversal_notes)+' manual reversal notes were recorded. These do not establish provider refunds.</p>':'')+
 '<p class="hp-ledger-disclaimer"><strong>Not verified:</strong> bank deposit, actual provider capture/refund, legal invoice or AEAT acknowledgement. The comparison is an accountant review aid, not a settlement certificate.</p>':'')+
 '</div></section></div>';
}

root.AkiPosSettlement=Object.freeze({parseProviderCSV,compare,renderPanel});
})(typeof window==='undefined'?globalThis:window);

/* Spanish invoicing scope and statutory milestones, reviewed 2026-10-31.
 * Sources: RD 1007/2023 as amended by RDL 15/2025, RD 238/2026,
 * Orden HAC/1028/2026, and the AEAT guidance updated October 2026.
 * This is a readiness aid, NOT a fiscal issuer, tax determination or declaration.
 * Product/producer deadlines and supported tax territories must be reviewed separately.
 */
(function(root) {
  'use strict';
  const DATES=Object.freeze({
    sif_corporation_tax:'2027-01-01',
    sif_other:'2027-07-01',
    b2b_large:'2027-10-06',
    b2b_other:'2028-10-06',
    b2b_status_individual:'2029-10-06'
  });
  const SOURCES=Object.freeze({
    sif:'https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html',
    scope:'https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/cuestiones-generales-ambitos-aplicacion.html',
    b2b:'https://sede.agenciatributaria.gob.es/Sede/iva/factura-electronica/calendario-implantacion.html'
  });
  const TERRITORIES=new Set(['common_territory','canary_islands','ceuta','melilla','basque_foral','navarra_foral']);
  const TYPES=new Set(['legal_entity','individual','attribution_entity']);
  const TURNOVER=new Set(['over_8m','not_over_8m','unknown']);
  function classify(input={}) {
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Business profile required');
    const territory=String(input.territory||'unknown');
    const type=String(input.entity_type||'unknown');
    const turnover=String(input.previous_year_iva_turnover||'unknown');
    const corporationTax=input.subject_to_corporation_tax;
    const sii=input.sii;
    if(territory!=='unknown'&&!TERRITORIES.has(territory))throw Error('Unknown tax territory');
    if(type!=='unknown'&&!TYPES.has(type))throw Error('Unknown entity type');
    if(!TURNOVER.has(turnover))throw Error('Turnover band must be confirmed or unknown');
    if(corporationTax!==undefined&&corporationTax!==null&&typeof corporationTax!=='boolean')throw Error('Corporation tax status must be explicit');
    if(sii!==undefined&&sii!==null&&typeof sii!=='boolean')throw Error('SII status must be explicit');
    const outsideStateSif=territory==='basque_foral'||territory==='navarra_foral';
    const stateSifApplies=!outsideStateSif&&territory!=='unknown'&&sii===false;
    const stateSifExcluded=outsideStateSif||sii===true;
    const sifDeadline=stateSifApplies&&typeof corporationTax==='boolean'?
      (corporationTax?DATES.sif_corporation_tax:DATES.sif_other):null;
    const b2bDeadline=turnover==='over_8m'?DATES.b2b_large:
      turnover==='not_over_8m'?DATES.b2b_other:null;
    const statusDeadline=turnover==='over_8m'?DATES.b2b_large:
      turnover==='not_over_8m'&&type==='legal_entity'?DATES.b2b_other:
      turnover==='not_over_8m'&&(type==='individual'||type==='attribution_entity')?DATES.b2b_status_individual:null;
    const requiresSeparateAdapter=outsideStateSif||territory==='canary_islands'||territory==='ceuta'||territory==='melilla'||sii===true;
    const firstReleaseEligible=territory==='common_territory'&&sii===false&&
      input.tax_regime==='general'&&input.currency==='EUR';
    const needsReview=[];
    if(territory==='unknown')needsReview.push('Confirm the issuer’s tax domicile/territory');
    if(sii===undefined||sii===null)needsReview.push('Confirm whether SII applies');
    if(!stateSifExcluded&&(corporationTax===undefined||corporationTax===null))needsReview.push('Confirm Corporation Tax status');
    if(type==='unknown')needsReview.push('Confirm legal entity type');
    if(turnover==='unknown')needsReview.push('Confirm previous-calendar-year VAT turnover against €8 million');
    if(requiresSeparateAdapter)needsReview.push('Different fiscal tax/territory integration required; the common-territory IVA adapter is not suitable');
    if(!firstReleaseEligible)needsReview.push('The current AkiBusiness fiscal adapter does not support this configuration');
    return {
      state_sif_applies:stateSifApplies,
      state_sif_excluded:stateSifExcluded,
      sif_deadline:sifDeadline,
      b2b_issue_deadline:b2bDeadline,
      b2b_payment_status_deadline:statusDeadline,
      first_release_eligible:firstReleaseEligible,
      fiscal_issuance_enabled:false,
      needs_review:[...new Set(needsReview)]
    };
  }
  const api=Object.freeze({DATES,SOURCES,classify});
  root.AkiFiscalCompliance=api;
})(typeof window==='undefined'?globalThis:window);

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import WaterQuality from '@/lib/models/WaterQuality';
import { getUserFromToken } from '@/lib/auth';
import { notifyPropCheckWebhook } from '@/lib/propcheckWebhook';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: any) {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return 'N/A'; }
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function esc(s: any): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── category mapping (identical to B2B) ─────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'Floor Tiles': 'Flooring', 'Floor (Tiles)': 'Flooring', 'Flooring (Tiles)': 'Flooring',
  'Wooden Flooring': 'Flooring', 'Stone Flooring': 'Flooring', 'Marble Flooring': 'Flooring',
  'Vitrified Tiles': 'Flooring', 'Ceramic Tiles': 'Flooring', 'Granite Flooring': 'Flooring',
  'Flooring': 'Flooring',
  'Wall Finish': 'Wall Finish', 'Wall Paint': 'Wall Finish', 'Putty': 'Wall Finish', 'Paint': 'Wall Finish',
  'Ceiling Finish': 'Ceiling Finish', 'Ceiling': 'Ceiling Finish', 'False Ceiling': 'Ceiling Finish', 'POP': 'Ceiling Finish',
  'Doors': 'Doors', 'Door': 'Doors', 'Main Door': 'Doors', 'Internal Door': 'Doors',
  'Balcony Door': 'Doors', 'French Door': 'Doors', 'Internal Doors': 'Doors',
  'Balcony Doors': 'Doors', 'Main Entrance': 'Doors', 'Main Entrance Door': 'Doors',
  'Windows': 'Windows', 'Window': 'Windows', 'Aluminium Window': 'Windows', 'UPVC Window': 'Windows',
  'Aluminium Windows': 'Windows', 'UPVC Windows': 'Windows',
  'Electrical': 'Electrical', 'Electrical Work': 'Electrical', 'Electrical D.B.': 'Electrical',
  'Electrical D.B': 'Electrical', 'Electrical DB': 'Electrical',
  'Switch Board': 'Electrical', 'Switchboard': 'Electrical',
  'Plumbing': 'Plumbing', 'Plumbing Work': 'Plumbing', 'CP Fitting': 'Plumbing', 'CP Fittings': 'Plumbing',
  'Sanitary': 'Sanitary Ware', 'Sanitary Ware': 'Sanitary Ware', 'Sanitary ware': 'Sanitary Ware',
  'Sanitaryware': 'Sanitary Ware', 'Wash Basin': 'Sanitary Ware', 'WC': 'Sanitary Ware',
  'Commode': 'Sanitary Ware', 'Toilet': 'Sanitary Ware',
  'Wall Tiles': 'Wall Tiles', 'Dado Tiles': 'Wall Tiles',
  'Modular Kitchen': 'Modular Kitchen', 'Kitchen': 'Modular Kitchen',
  'Cabinet/Wardrobe': 'Cabinet/Wardrobe', 'Cabinet': 'Cabinet/Wardrobe', 'Wardrobe': 'Cabinet/Wardrobe',
  'Counter Top': 'Counter Top', 'Countertop': 'Counter Top', 'Kitchen Counter': 'Counter Top',
  'Handrails': 'Handrails', 'Handrail': 'Handrails', 'Railing': 'Handrails', 'Railings': 'Handrails',
  'Handrails/ MS grills': 'Handrails', 'MS Grill': 'Handrails', 'MS Grills': 'Handrails', 'Grill': 'Handrails', 'Grills': 'Handrails',
};

const CATEGORY_ORDER = [
  'Flooring', 'Wall Tiles', 'Wall Finish', 'Ceiling Finish',
  'Doors', 'Windows', 'Electrical', 'Plumbing',
  'Sanitary Ware', 'Modular Kitchen', 'Counter Top', 'Cabinet/Wardrobe', 'Handrails',
];

function mapToCategory(raw: string): string {
  if (CATEGORY_MAP[raw]) return CATEGORY_MAP[raw];
  const lower = raw.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_MAP)) {
    if (k.toLowerCase() === lower) return v;
  }
  if (lower.includes('floor') || (lower.includes('tile') && !lower.includes('wall'))) return 'Flooring';
  return raw;
}

function sortByCat(a: string, b: string): number {
  const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

// ─── data extraction ──────────────────────────────────────────────────────────

function isSatisfactory(q: any): boolean {
  const ans = (q.answer || q.selectedAnser || '').toLowerCase();
  return ans === 'satisfactory' || ans === 'not applicable';
}

function extractSpaces(inspectionData: any) {
  const allDetail: any[] = inspectionData?.inspectionDetail || [];

  // Filter out metadata entries that are not physical spaces (e.g. re-inspection tracking entries)
  const NON_SPACE_TYPES = new Set(['reinspection', 're_inspection', 'reinspection_data', 'recheck']);
  const detail = allDetail.filter((sp: any) => {
    const t = (sp.inspectionTypes || '').trim().toLowerCase().replace(/[-\s]/g, '_');
    if (NON_SPACE_TYPES.has(t)) {
      const hasData = !!(sp.quality?.length || sp.brand?.length || sp.dimension?.length ||
        sp.inspection?.quality?.length || sp.inspection?.brand?.length || sp.spaceName);
      return hasData;
    }
    return true;
  });

  const rawNames = detail.map((sp: any) => {
    const t = sp.inspectionTypes || '';
    return (t === 'COMMON_AREA' && sp.otherSpaceName) ? sp.otherSpaceName
      : sp.spaceName || sp.type || sp.Type || t || 'Unknown Space';
  });
  const nameCount: Record<string, number> = {};
  rawNames.forEach((n: string) => { nameCount[n] = (nameCount[n] || 0) + 1; });
  const nameIndex: Record<string, number> = {};

  return detail.map((sp: any) => {
    const insp = sp.inspection || {};
    const quality: any[] = (insp.quality || sp.quality || []).filter(
      (q: any) => !q.inspectionFor || q.inspectionFor === 'quality'
    );
    const brand: any[] = insp.brand || sp.brand || [];
    const dimension: any[] = (insp.dimension && insp.dimension.length > 0)
      ? insp.dimension
      : (sp.dimension && sp.dimension.length > 0 ? sp.dimension : []);
    const measurement: any[] = insp.measurement || sp.measurement || [];
    const images: string[] = (insp.images || sp.images || []).map(
      (img: string) => typeof img === 'string' ? img.replace(/#/g, '%23') : img
    );
    const materialItems: any[] = insp.material || sp.material || [];

    // Space name
    const t = sp.inspectionTypes || '';
    const rawName = (t === 'COMMON_AREA' && sp.otherSpaceName) ? sp.otherSpaceName
      : sp.spaceName || sp.type || sp.Type || t || 'Unknown Space';
    let spaceName: string;
    if (nameCount[rawName] > 1) {
      nameIndex[rawName] = (nameIndex[rawName] || 0) + 1;
      spaceName = `${rawName} ${nameIndex[rawName]}`.toUpperCase();
    } else {
      spaceName = rawName.toUpperCase();
    }

    // Weighted health (major=60, minor=30, cosmetic=10)
    const majorItems = quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'MAJOR');
    const minorItems = quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'MINOR');
    const cosmeticItems = quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'COSMETIC');
    const mSat = majorItems.filter(isSatisfactory).length;
    const nSat = minorItems.filter(isSatisfactory).length;
    const cSat = cosmeticItems.filter(isSatisfactory).length;
    const totalAvg = majorItems.length * 0.6 + minorItems.length * 0.3 + cosmeticItems.length * 0.1;
    const score = mSat * 0.6 + nSat * 0.3 + cSat * 0.1;
    const health = totalAvg > 0 ? Math.round((score / totalAvg) * 100) : 100;

    // Defects
    const major = quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'MAJOR' && !isSatisfactory(q));
    const minor = quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'MINOR' && !isSatisfactory(q));
    const cosmetic = quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'COSMETIC' && !isSatisfactory(q));

    // Issues by category (for per-space pages)
    const allDefects = [...major, ...minor, ...cosmetic];
    const issuesByCategoryMap = new Map<string, any[]>();
    allDefects.forEach((q: any, idx: number) => {
      let rawCat = q.sideBand || q.element || 'Other';
      if (!rawCat || rawCat === 'Other') {
        const nm = q.item || '';
        rawCat = nm.includes(':') ? nm.split(':')[0].trim() : 'Other';
      }
      const cat = mapToCategory(rawCat);
      if (!issuesByCategoryMap.has(cat)) issuesByCategoryMap.set(cat, []);
      issuesByCategoryMap.get(cat)!.push({
        serialNo: idx + 1,
        item: q.item || '',
        issueType: (q.issueType || 'MINOR').toUpperCase(),
        remarks: q.issue || q.remarks || '',
        images: (q.pictures || q.images || q.defectImages || q.issueImages || []).map((img: string) => typeof img === 'string' ? img.replace(/#/g, '%23') : img),
      });
    });
    const issuesByCategory = Array.from(issuesByCategoryMap.entries())
      .sort(([a], [b]) => sortByCat(a, b))
      .map(([category, items]) => ({ category, items, spaceName }));

    // Item wise summary
    const catStats = new Map<string, { tM: number; sM: number; tN: number; sN: number; tC: number; sC: number }>();
    quality.forEach((q: any) => {
      let rc = q.sideBand || q.element || 'Other';
      if (!rc || rc === 'Other') {
        const nm = q.item || '';
        rc = nm.includes(':') ? nm.split(':')[0].trim() : 'Other';
      }
      const cat = mapToCategory(rc);
      const sev = (q.issueType || 'MINOR').toUpperCase();
      const ans = (q.answer || q.selectedAnser || '').toLowerCase();
      if (ans === 'not applicable' || ans === 'n/a' || ans === 'na') return;
      const sat = ans === 'satisfactory';
      const s = catStats.get(cat) || { tM: 0, sM: 0, tN: 0, sN: 0, tC: 0, sC: 0 };
      if (sev === 'MAJOR') { s.tM++; if (sat) s.sM++; }
      else if (sev === 'MINOR') { s.tN++; if (sat) s.sN++; }
      else if (sev === 'COSMETIC') { s.tC++; if (sat) s.sC++; }
      catStats.set(cat, s);
    });
    const itemWiseSummary = Array.from(catStats.entries())
      .map(([item, s]) => ({
        item,
        majorPercent: s.tM > 0 ? Math.round((s.sM / s.tM) * 100) : 100,
        minorPercent: s.tN > 0 ? Math.round((s.sN / s.tN) * 100) : 100,
        cosmeticPercent: s.tC > 0 ? Math.round((s.sC / s.tC) * 100) : 100,
        totalCount: s.tM + s.tN + s.tC,
      }))
      .filter(x => x.totalCount > 0 && x.item !== 'Other')
      .sort((a, b) => sortByCat(a.item, b.item))
      .slice(0, 12);

    // Dimensions
    const dimensions = dimension.map((d: any) => ({
      item: d.item || '',
      length: d.length || '',
      breadth: d.bredth || d.breadth || '',
      singleField: d.singleField || '',
    }));

    // Material checks
    const materialChecks = materialItems.map((m: any) => ({
      item: m.item || '',
      answer: m.selectedMaterial || m.answer || 'N/A',
    }));

    // Brand checks
    const brandChecks = brand.map((b: any) => ({
      item: b.item || '',
      answer: b.selectedBrand || b.answer || 'N/A',
    }));

    return {
      name: spaceName,
      health,
      healthDisplay: (health / 10).toFixed(1),
      quality,
      major,
      minor,
      cosmetic,
      allDefects,
      issuesByCategory,
      images,
      dimensions,
      measurement,
      materialChecks,
      brandChecks,
      itemWiseSummary,
      itemWiseCategories: itemWiseSummary.map(s => s.item).join(','),
      itemWiseMajorData: itemWiseSummary.map(s => s.majorPercent).join(','),
      itemWiseMinorData: itemWiseSummary.map(s => s.minorPercent).join(','),
      itemWiseCosmeticData: itemWiseSummary.map(s => s.cosmeticPercent).join(','),
    };
  });
}

function overallHealthFromSpaces(spaces: any[]): number {
  let totalAvg = 0, totalScore = 0;
  spaces.forEach(s => {
    const majorItems = s.quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'MAJOR');
    const minorItems = s.quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'MINOR');
    const cosItems = s.quality.filter((q: any) => (q.issueType || '').toUpperCase() === 'COSMETIC');
    const mS = majorItems.filter(isSatisfactory).length;
    const nS = minorItems.filter(isSatisfactory).length;
    const cS = cosItems.filter(isSatisfactory).length;
    totalAvg += majorItems.length * 0.6 + minorItems.length * 0.3 + cosItems.length * 0.1;
    totalScore += mS * 0.6 + nS * 0.3 + cS * 0.1;
  });
  return totalAvg > 0 ? Math.round((totalScore / totalAvg) * 100) : 100;
}

function qualitySummary(spaces: any[]) {
  const all = spaces.flatMap((s: any) => s.quality);
  const majors = all.filter((q: any) => (q.issueType || '').toUpperCase() === 'MAJOR');
  const minors = all.filter((q: any) => (q.issueType || '').toUpperCase() === 'MINOR');
  const cos = all.filter((q: any) => (q.issueType || '').toUpperCase() === 'COSMETIC');
  const mSat = majors.filter(isSatisfactory).length;
  const nSat = minors.filter(isSatisfactory).length;
  const cSat = cos.filter(isSatisfactory).length;
  return {
    majorSatPct: pct(mSat, majors.length),
    majorUnsatPct: pct(majors.length - mSat, majors.length),
    minorSatPct: pct(nSat, minors.length),
    minorUnsatPct: pct(minors.length - nSat, minors.length),
    cosmeticSatPct: pct(cSat, cos.length),
    cosmeticUnsatPct: pct(cos.length - cSat, cos.length),
  };
}

function buildDimTable(spaces: any[]) {
  return spaces.filter(s => s.dimensions.length > 0).map(s => {
    const row: any = { space: s.name, flooring: 'NA', doorHeight: 'NA', ceilingHeight: 'NA', windowDimension: 'NA', heightWallTiles: 'NA', railing: 'NA' };
    s.dimensions.forEach((d: any) => {
      const val = d.singleField
        ? `${parseFloat(d.singleField || '0').toFixed(1)} ft`
        : `${parseFloat(d.length || '0').toFixed(1)} X ${parseFloat(d.breadth || '0').toFixed(1)} ft`;
      const app = (cur: string, v: string) => cur === 'NA' ? v : `${cur}<br>${v}`;
      const il = (d.item || '').toLowerCase();
      if (il.includes('floor') || (il.includes('tile') && !il.includes('wall') && !il.includes('dado'))) row.flooring = app(row.flooring, val);
      else if (il.includes('door')) row.doorHeight = app(row.doorHeight, val);
      else if (il.includes('ceiling')) row.ceilingHeight = app(row.ceilingHeight, val);
      else if (il.includes('window')) row.windowDimension = app(row.windowDimension, val);
      else if ((il.includes('wall') && il.includes('tile')) || il.includes('dado')) row.heightWallTiles = app(row.heightWallTiles, val);
      else if (il.includes('railing')) row.railing = app(row.railing, val);
    });
    return row;
  });
}

function buildMatTable(spaces: any[]) {
  return spaces.filter(s => s.materialChecks.length > 0).map(s => {
    const row: any = { space: s.name, flooring: 'NA', wallFinish: 'NA', door: 'NA', windows: 'NA', railing: 'NA' };
    s.materialChecks.forEach((m: any) => {
      const il = (m.item || '').toLowerCase();
      if (il.includes('flooring')) row.flooring = m.answer;
      else if (il.includes('wall') && il.includes('finish')) row.wallFinish = m.answer;
      else if (il.includes('door')) row.door = m.answer;
      else if (il.includes('window')) row.windows = m.answer;
      else if (il.includes('railing')) row.railing = m.answer;
    });
    return [row.flooring, row.wallFinish, row.door, row.windows, row.railing].some(v => v !== 'NA') ? row : null;
  }).filter(Boolean);
}

function buildBrandTables(spaces: any[]) {
  const regular: any[] = [], bathroom: any[] = [], kitchen: any[] = [];
  spaces.forEach(s => {
    if (!s.brandChecks.length) return;
    const sn = s.name.toLowerCase();
    if (sn.includes('bathroom') || sn.includes('toilet') || sn.includes('washroom')) {
      const r: any = { space: s.name, switchboard: 'NA', wc: 'NA', faucets: 'NA', light: 'NA', exhaustFan: 'NA', counterTop: 'NA', waterHeater: 'NA' };
      s.brandChecks.forEach((b: any) => {
        const il = (b.item || '').toLowerCase();
        if (il.includes('switch')) r.switchboard = b.answer;
        else if (il.includes('wc') || il.includes('toilet')) r.wc = b.answer;
        else if (il.includes('faucet') || il.includes('tap')) r.faucets = b.answer;
        else if (il.includes('light')) r.light = b.answer;
        else if (il.includes('exhaust')) r.exhaustFan = b.answer;
        else if (il.includes('counter')) r.counterTop = b.answer;
        else if (il.includes('water') && il.includes('heater')) r.waterHeater = b.answer;
      });
      if ([r.wc, r.faucets, r.light, r.exhaustFan, r.counterTop, r.waterHeater, r.switchboard].some(v => v !== 'NA')) bathroom.push(r);
    } else if (sn.includes('kitchen')) {
      const r: any = { space: s.name, switchboard: 'NA', light: 'NA', waterHeater: 'NA', exhaustFan: 'NA' };
      s.brandChecks.forEach((b: any) => {
        const il = (b.item || '').toLowerCase();
        if (il.includes('switch')) r.switchboard = b.answer;
        else if (il.includes('light')) r.light = b.answer;
        else if (il.includes('water') && il.includes('heater')) r.waterHeater = b.answer;
        else if (il.includes('exhaust')) r.exhaustFan = b.answer;
      });
      if ([r.switchboard, r.light, r.waterHeater, r.exhaustFan].some(v => v !== 'NA')) kitchen.push(r);
    } else {
      const r: any = { space: s.name, switchboard: 'NA', fan: 'NA', light: 'NA', windows: 'NA', ac: 'NA' };
      s.brandChecks.forEach((b: any) => {
        const il = (b.item || '').toLowerCase();
        if (il.includes('switch')) r.switchboard = b.answer;
        else if (il.includes('fan') && !il.includes('exhaust')) r.fan = b.answer;
        else if (il.includes('light')) r.light = b.answer;
        else if (il.includes('window')) r.windows = b.answer;
        else if (il.includes('ac') || (il.includes('air') && il.includes('condition'))) r.ac = b.answer;
      });
      if ([r.switchboard, r.fan, r.light, r.windows, r.ac].some(v => v !== 'NA')) regular.push(r);
    }
  });
  return { regular, bathroom, kitchen };
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function pageHeader(unitNo: string, projectName: string, logoUrl: string) {
  return `
  <div class="page-header">
    <div class="container-fluid d-flex my-2">
      <span class="header-addr">Home Inspection Report - ${esc(unitNo)}, ${esc(projectName)}</span>
      <img src="${logoUrl}" class="header-logo">
    </div>
    <div class="header-lines">
      <table style="width:100%"><tr>
        <td class="orange-line"></td>
        <td class="white-line"></td>
        <td class="blue-line"></td>
      </tr></table>
    </div>
  </div>`;
}

// ─── main report builder ──────────────────────────────────────────────────────

function buildReport(property: any, waterQuality: any, assetBase: string): string {
  const logoUrl = `${assetBase}/report-assets/prop-header-logo.png`;
  const iconUrl = (name: string) => `${assetBase}/report-assets/icons/${name}`;
  const spaces = extractSpaces(property.inspectionData);
  const health = overallHealthFromSpaces(spaces);
  const qs = qualitySummary(spaces);
  const inspName = (property.inspectorId as any)?.name || (property.inspectorId as any)?.userName || 'PropChk Inspector';
  const validName = (property.validatorId as any)?.name || (property.validatorId as any)?.userName || 'PropChk Validator';
  const unitNo = property.unitNo || '';
  const projectName = property.projectName || property.address || '';
  const propAddr = [property.address, unitNo && `Unit ${unitNo}`, property.city, property.state, property.pincode].filter(Boolean).join(', ');
  const dimTable = buildDimTable(spaces);
  const matTable = buildMatTable(spaces);
  const brandTables = buildBrandTables(spaces);

  // Water quality: dedicated collection first, then embedded in inspectionData
  const wqSource = waterQuality
    || property.inspectionData?.waterQuality
    || property.inspectionData?.waterQualityData
    || null;
  const wqPh = wqSource ? (wqSource.phLevel ?? wqSource.ph ?? null) : null;
  const wqTds = wqSource ? (wqSource.tdsLevel ?? wqSource.tds ?? null) : null;
  const wqImgs: string[] = wqSource?.images || [];
  const phImages: string[] = wqSource?.phImages || wqImgs.slice(0, Math.ceil(wqImgs.length / 2));
  const tdsImages: string[] = wqSource?.tdsImages || wqImgs.slice(Math.ceil(wqImgs.length / 2));

  // Chart data strings
  const spacesNameList = spaces.map(s => s.name).join(',');
  const spacesHealthList = spaces.map(s => (s.health / 10).toFixed(1)).join(',');

  // Area check
  const totalArea = spaces.flatMap(s => s.measurement).reduce((sum: number, m: any) => sum + parseFloat(m.total || '0'), 0);
  const areaRows = spaces.map(s => {
    if (!s.measurement.length) return `<tr><td class="tbl-blue-1" style="font-size:20px;font-weight:600;padding:10px 5px;">${esc(s.name)}</td><td style="text-align:center;font-size:20px;padding:10px 5px;">-</td><td style="text-align:center;font-size:20px;padding:10px 5px;">-</td></tr>`;
    return s.measurement.map((m: any, idx: number) => `
      <tr>
        ${idx === 0 ? `<td class="tbl-blue-1" rowspan="${s.measurement.length}" style="font-size:20px;font-weight:600;vertical-align:middle;padding:10px 5px;">${esc(s.name)}</td>` : ''}
        <td style="text-align:center;font-size:20px;padding:10px 5px;">${parseFloat(m.length || '0').toFixed(2)} X ${parseFloat(m.breadth || '0').toFixed(2)}</td>
        <td style="text-align:center;font-size:20px;padding:10px 5px;">${parseFloat(m.total || '0').toFixed(2)}</td>
      </tr>`).join('');
  }).join('');

  // Space wise health bars (for summary page)
  const healthBars = spaces.map(s => `
    <tr>
      <td style="font-size:16px;font-weight:600;padding:4px 8px 4px 0;white-space:nowrap;width:120px;">${esc(s.name)}</td>
      <td style="padding:4px 0;">
        <div style="background:#e8e8e8;border-radius:3px;overflow:hidden;height:22px;width:100%;position:relative;">
          <div style="background:#0655a2;height:100%;width:${s.health}%;"></div>
        </div>
      </td>
      <td style="font-size:14px;font-weight:700;padding:4px 0 4px 8px;white-space:nowrap;color:#0655a2;">${s.health}%</td>
    </tr>`).join('');

  // Per-space quality check pages
  const spacePages = spaces.map((s: any, idx: number) => {
    const hasImages = s.images.length > 0;
    const hasIssues = s.issuesByCategory.length > 0;

    // Chunked images (4 per page, 2×2 grid)
    const imageChunks: string[][] = [];
    for (let i = 0; i < s.images.length; i += 4) imageChunks.push(s.images.slice(i, i + 4));

    return `
    <div class="page-break-after"></div>
    <section class="page-space-detail">
      ${pageHeader(unitNo, projectName, logoUrl)}
      <div class="page-body">
        <div id="arrowHeader">
          <div class="arrowHeaderTitle" id="${esc(s.name)}" style="font-family:'Quicksand';">QUALITY CHECK: ${esc(s.name)}</div>
        </div>
        ${s.itemWiseSummary.length > 0 ? `
        <div class="text-center">
          <h4 class="space-wise my-4" id="ItemWiseSummary${idx}" style="font-family:'Quicksand';">ITEM WISE SUMMARY</h4>
          <div style="padding:0 4%;">
            <div style="width:100%;">
              <div id="chart-space-${idx}"></div>
            </div>
          </div>
        </div>` : ''}
      </div>
    </section>
    ${hasImages ? imageChunks.map(chunk => `
    <div class="page-break-after"></div>
    <section style="display:flex;flex-direction:column;min-height:297mm;box-sizing:border-box;">
      ${pageHeader(unitNo, projectName, logoUrl)}
      <div style="flex:1;display:flex;flex-direction:column;padding:0 4%;">
        <div class="text-center">
          <h4 class="space-wise my-4" style="font-family:'Quicksand';">GENERAL PICTURES</h4>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px;padding-bottom:16px;min-height:0;">
          ${chunk.map(url => `<div style="position:relative;overflow:hidden;"><img src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;"></div>`).join('')}
        </div>
      </div>
    </section>`).join('') : ''}
    ${hasIssues ? s.issuesByCategory.map((group: any) => `
    <div class="page-break-after"></div>
    <div class="qc-section">
      ${pageHeader(unitNo, projectName, logoUrl)}
      <div class="page-body">
        <div class="arrowHeader">
          <div class="arrowHeaderTitle" style="font-family:'Quicksand';">QUALITY CHECK: ${esc(group.spaceName)}</div>
        </div>
        <div class="flooringHeading">
          <div class="titleDiv" style="font-family:'Quicksand';">${esc(group.category)}</div>
        </div>
        <div class="prop-check-tbl-border" style="padding:30px 4% 0;font-family:'Quicksand';">
          <table width="100%" class="qc-issues-table">
            <thead>
              <tr>
                <th>S. NO.</th>
                <th>ISSUE</th>
                <th>PICTURE</th>
              </tr>
            </thead>
            <tbody>
              ${group.items.map((issue: any) => `
              <tr>
                <td class="propNo" width="50px" bgcolor="${issue.issueType === 'MAJOR' ? '#086ed1' : issue.issueType === 'MINOR' ? '#6b97c0' : '#ceddea'}"
                    style="vertical-align:middle;text-align:center;color:${issue.issueType === 'COSMETIC' ? '#333' : '#fff'};font-weight:700;">
                  <span>${issue.serialNo}</span>
                </td>
                <td class="propIssues" width="180px" style="background:white;vertical-align:middle;text-align:center;">
                  <span>${esc(issue.remarks || issue.item)}</span>
                </td>
                <td class="propImgs" width="220px" style="background:white;">
                  ${issue.images.map((img: string) => `<img src="${img}" class="qulty_checked_img">`).join('')}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <br>
        <div style="text-align:center;padding:8px 0;font-family:'Quicksand';color:#333;">
          <span style="display:inline-block;font-weight:600;margin:0 20px;"><span class="MajorIssues" style="vertical-align:middle;"></span>&nbsp;Major</span>
          <span style="display:inline-block;font-weight:600;margin:0 20px;"><span class="MinorIssues" style="vertical-align:middle;"></span>&nbsp;Minor</span>
          <span style="display:inline-block;font-weight:600;margin:0 20px;"><span class="CosmeticIssues" style="vertical-align:middle;border:1px solid #aab8c8;"></span>&nbsp;Cosmetic</span>
        </div>
      </div>
    </div>`).join('') : ''}`;
  }).join('');

  // Dimension check HTML
  const dimHTML = dimTable.length > 0 ? `
  <div class="page-break-after"></div>
  <section class="page-dimension-check">
    ${pageHeader(unitNo, projectName, logoUrl)}
    <div class="container-main" style="padding:0 4.5%;">
      <div class="summary-block"><h3 class="summary-heading" id="DimensionCheck">IV. DIMENSIONS CHECK</h3></div>
      <style>.dim-check-tbody tr:nth-child(odd) td.dim-data{background-color:#c8ddf0!important}.dim-check-tbody tr:nth-child(even) td.dim-data{background-color:#ddeef8!important}</style>
      <div class="prop-check-tbl-border">
        <table width="100%" style="border-collapse:collapse;">
          <thead><tr>
            <th style="background-color:#0655a2!important;width:16%;border:2px solid #fff;"></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Flooring.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">FLOORING</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Doors.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">DOOR HEIGHT</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('CeilingHeight.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">CEILING HEIGHT</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('window.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WINDOW DIMENSION</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('WallFinish.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">HEIGHT OF WALL TILES</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Railing.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">RAILING HEIGHT</span></div></th>
          </tr></thead>
          <tbody class="dim-check-tbody">
            ${dimTable.map(r => `<tr>
              <td style="background-color:#3d85c8!important;color:white;font-weight:800;font-size:16px;padding:20px 16px;vertical-align:middle;text-align:center;border:2px solid #fff;">${esc(r.space)}</td>
              <td class="dim-data" style="text-align:center;font-size:17px;font-weight:800;padding:20px 15px;vertical-align:middle;border:2px solid #fff;">${r.flooring}</td>
              <td class="dim-data" style="text-align:center;font-size:17px;font-weight:800;padding:20px 15px;vertical-align:middle;border:2px solid #fff;">${r.doorHeight}</td>
              <td class="dim-data" style="text-align:center;font-size:17px;font-weight:800;padding:20px 15px;vertical-align:middle;border:2px solid #fff;">${r.ceilingHeight}</td>
              <td class="dim-data" style="text-align:center;font-size:17px;font-weight:800;padding:20px 15px;vertical-align:middle;border:2px solid #fff;">${r.windowDimension}</td>
              <td class="dim-data" style="text-align:center;font-size:17px;font-weight:800;padding:20px 15px;vertical-align:middle;border:2px solid #fff;">${r.heightWallTiles}</td>
              <td class="dim-data" style="text-align:center;font-size:17px;font-weight:800;padding:20px 15px;vertical-align:middle;border:2px solid #fff;">${r.railing}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </section>` : '';

  // Material check HTML
  const matHTML = matTable.length > 0 ? `
  <div class="page-break-after"></div>
  <section class="page-material-check">
    ${pageHeader(unitNo, projectName, logoUrl)}
    <div class="container-main" style="padding:0 4.5%;">
      <div class="summary-block"><h3 class="summary-heading" id="MaterialCheck">V. MATERIAL CHECK</h3></div>
      <style>.mat-check-tbody tr:nth-child(odd) td.mat-data{background-color:#c8ddf0!important}.mat-check-tbody tr:nth-child(even) td.mat-data{background-color:#ddeef8!important}</style>
      <div class="prop-check-tbl-border">
        <table width="100%" style="border-collapse:collapse;">
          <thead><tr>
            <th style="background-color:#0655a2!important;width:18%;border:2px solid #fff;"></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Flooring.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">FLOORING</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('WallFinish.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WALL FINISH</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Doors.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">DOOR</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('window.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WINDOWS</span></div></th>
            <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Railing.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">RAILING</span></div></th>
          </tr></thead>
          <tbody class="mat-check-tbody">
            ${matTable.map((r: any) => `<tr>
              <td style="background-color:#3d85c8!important;color:white;font-weight:800;font-size:16px;padding:20px 16px;vertical-align:middle;text-align:center;border:2px solid #fff;">${esc(r.space)}</td>
              <td class="mat-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.flooring)}</td>
              <td class="mat-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.wallFinish)}</td>
              <td class="mat-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.door)}</td>
              <td class="mat-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.windows)}</td>
              <td class="mat-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.railing)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </section>` : '';

  // Brand check HTML
  function brandPageHeader(title: string) {
    return `
    <div class="page-break-after"></div>
    <section class="page-brand-check">
      ${pageHeader(unitNo, projectName, logoUrl)}
      <div class="container-main" style="padding:0 4.5%;">
        <div class="summary-block"><h3 class="summary-heading" id="BrandCheck">${title}</h3></div>
        <style>.brand-check-tbody tr:nth-child(odd) td.brand-data{background-color:#c8ddf0!important}.brand-check-tbody tr:nth-child(even) td.brand-data{background-color:#ddeef8!important}</style>
        <div class="prop-check-tbl-border">`;
  }
  const brandRegularHTML = brandTables.regular.length > 0 ? `
    ${brandPageHeader('VI. BRAND CHECK')}
          <table width="100%" style="border-collapse:collapse;">
            <thead><tr>
              <th style="background-color:#0655a2!important;width:18%;border:2px solid #fff;"></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('SwitchBoard.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">SWITCHBOARD</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Fan.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">FAN</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Lights.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">LIGHT</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('window.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WINDOWS</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('AC.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">AC</span></div></th>
            </tr></thead>
            <tbody class="brand-check-tbody">
              ${brandTables.regular.map((r: any) => `<tr>
                <td style="background-color:#3d85c8!important;color:white;font-weight:800;font-size:16px;padding:20px 16px;vertical-align:middle;text-align:center;border:2px solid #fff;">${esc(r.space)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.switchboard)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.fan)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.light)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.windows)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.ac)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>` : '';

  const brandBathHTML = brandTables.bathroom.length > 0 ? `
    ${brandPageHeader('VI. BRAND CHECK - BATHROOM')}
          <table width="100%" style="border-collapse:collapse;">
            <thead><tr>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('SwitchBoard.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">SWITCHBOARD</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('WC.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WC</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Faucets.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">FAUCETS</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Lights.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">LIGHT</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('ExhaustFan.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">EXHAUST FAN</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('CounterTop.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">COUNTER TOP</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('waterheater.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WATER HEATER</span></div></th>
            </tr></thead>
            <tbody class="brand-check-tbody">
              ${brandTables.bathroom.map((r: any) => `<tr>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.switchboard)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.wc)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.faucets)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.light)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.exhaustFan)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.counterTop)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.waterHeater)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>` : '';

  const brandKitHTML = brandTables.kitchen.length > 0 ? `
    ${brandPageHeader('VI. BRAND CHECK - KITCHEN')}
          <table width="100%" style="border-collapse:collapse;">
            <thead><tr>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('SwitchBoard.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">SWITCHBOARD</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('Lights.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">LIGHT</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('waterheater.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">WATER HEATER</span></div></th>
              <th style="background-color:#0655a2!important;color:white;border:2px solid #fff;padding:20px 10px;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="${iconUrl('ExhaustFan.png')}" style="width:84px;height:auto;mix-blend-mode:screen;"><span style="font-size:15px;font-weight:800;">EXHAUST FAN</span></div></th>
            </tr></thead>
            <tbody class="brand-check-tbody">
              ${brandTables.kitchen.map((r: any) => `<tr>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.switchboard)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.light)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.waterHeater)}</td>
                <td class="brand-data" style="text-align:center;font-size:17px;font-weight:700;padding:10px 8px;vertical-align:middle;border:2px solid #fff;">${esc(r.exhaustFan)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>` : '';

  // Water quality section HTML
  const waterQualitySection = (wqSource && (wqPh != null || wqTds != null)) ? `
  <div class="row">
    <div class="col-lg-8 offset-lg-2">
      <h4 class="space-wise my-4" id="WaterQuality" style="font-family:'Quicksand';font-weight:600;font-size:1.7rem;">WATER QUALITY</h4>
      <div class="table-responsive prop-check-tbl" style="font-family:'Quicksand';font-size:1.2rem;">
        <table class="table table-bordered border-primary">
          <thead class="base-blue text-white text-center">
            <tr class="base-blue">
              <th>Parameter</th><th>Value</th><th>Range*</th>
            </tr>
          </thead>
          <tbody>
            ${wqPh != null ? `<tr><td class="base-blue text-white">PH value of Water</td><td>${esc(wqPh)}</td><td>6.5 - 8.5</td></tr>` : ''}
            ${wqTds != null ? `<tr><td class="base-blue text-white">TDS (Total Dissolved Solids) of Water</td><td>${esc(wqTds)} mg/L</td><td>Less than 500 mg/L (desirable)</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      <p class="text-end mt-5 mb-4 text-gray"><i>* As per Bureau of Indian Standards</i></p>
    </div>
  </div>` : '';

  // PH / TDS picture pages
  const wqPicPages = [
    phImages.length > 0 ? { title: 'PH PICTURES', images: phImages } : null,
    tdsImages.length > 0 ? { title: 'TDS PICTURES', images: tdsImages } : null,
  ].filter(Boolean).map((pg: any) => `
  <div class="page-break-after"></div>
  <section>
    ${pageHeader(unitNo, projectName, logoUrl)}
    <div class="container-main">
      <h4 class="space-wise my-4" style="font-family:'Quicksand';">${pg.title}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0;">
        ${pg.images.slice(0, 4).map((u: string) => `<img src="${u}" style="width:100%;max-height:220px;object-fit:cover;border-radius:4px;">`).join('')}
      </div>
    </div>
  </section>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Home Inspection Report - ${esc(unitNo)}, ${esc(projectName)}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css?family=Quicksand:300,400,600,700" rel="stylesheet">
  <style>
    :root{--base-blue:#0655a2;--orange-c:#f8b516;--white-c:white;--black-c:#333;--tbl-blue-1:#bed7ef;--tbl-blue-2:#dce8f4;}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Quicksand','Helvetica Neue',Arial,sans-serif;color:#333;line-height:1.6;background:#d0d0d0;}
    /* Constrain to A4-like width, centered, white pages on gray background */
    .report-wrap{max-width:900px;margin:0 auto;background:#fff;box-shadow:0 0 20px rgba(0,0,0,.25);}
    /* Sticky print bar outside the wrap */
    .print-bar{position:sticky;top:0;z-index:9999;background:#0655a2;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;max-width:900px;margin:0 auto;}
    .print-bar-title{color:#fff;font-weight:700;font-size:16px;font-family:'Quicksand';}
    .print-btn{background:#f8b516;color:#333;border:none;padding:8px 22px;border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Quicksand';}
    @media print{.print-bar{display:none!important;}.report-wrap{max-width:100%;box-shadow:none;}}
    .table-responsive{overflow:visible!important;}
    .landing-page{background-color:#0655a2!important;width:100%;min-height:100vh;height:auto;margin:0;page-break-after:always;display:flex;flex-direction:column;}
    .page-break-after{page-break-after:always;}
    .container-main{padding:0 4%;}
    .header-lines{display:flex;align-items:center;}
    .orange-line{width:10%;height:4px;background-color:#f8b516;}
    .white-line{width:2%;height:4px;background-color:white;}
    .blue-line{width:88%;height:4px;background-color:#0655a2;}
    .header-logo{width:55px;height:auto;margin-left:auto;text-align:right;margin-bottom:5px;}
    .header-addr{margin:0.6rem;font-weight:800;color:#333;}
    .summary-heading{font-family:'Quicksand';margin:3rem 0 1rem 0;font-weight:700;color:#0655a2;font-size:1.7rem;}
    .summary-sub-headng,.summary-sb-headng,.space-wise{margin:1rem;font-weight:700;color:#0655a2;}
    .contents-heading{color:#0655a2;font-family:'Quicksand';font-weight:600;}
    .disclaimer-heading{font-family:'Quicksand';font-weight:600;margin-bottom:1rem;}
    .container-main.disclaimer-page{padding:0 4%;}
    .disclaimer-page p,.disclaimer-page ul li{font-weight:600;line-height:1.4;margin-bottom:8px;text-align:justify;font-size:16px;}
    .base-blue{background-color:#0655a2!important;}
    .base-blue-color{color:#0655a2!important;}
    .orange-c{background-color:#f8b516!important;}
    .tbl-blue-1{background-color:#bed7ef!important;}
    .tbl-blue-2{background-color:#dce8f4!important;}
    table{width:100%;border-collapse:collapse;font-family:'Quicksand';}
    table thead th{font-family:'Quicksand';font-weight:600;}
    .prop-check-tbl table th,.prop-check-tbl table td{padding:10px 5px;border:solid 2px white;}
    .prop-check-tbl table th{font-size:19px;letter-spacing:.5px;}
    .prop-check-tbl tbody tr:nth-child(odd){background-color:#bed7ef;}
    .prop-check-tbl tbody tr:nth-child(even){background-color:#dce8f4;}
    .prop-check-tbl-border table{background-color:#ffffff;}
    .prop-check-tbl-border table th{background-color:#595959;color:white;text-align:center;}
    .prop-check-tbl-border table th,.prop-check-tbl-border table td{padding:10px 5px;border:solid 1px #7f7f7f;}
    .prop-check-tbl-border tbody tr:nth-child(odd){background-color:#bed7ef;}
    .prop-check-tbl-border tbody tr:nth-child(even){background-color:#dce8f4;}
    .table-content,.table-content a{font-family:'Quicksand';text-decoration:none;color:#333;line-height:2.2rem;}
    .table-links li{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .table-links li a{text-decoration:none;}
    .MajorIssues{width:14px;height:14px;display:inline-block;background-color:#0655a2;}
    .MinorIssues{width:14px;height:14px;display:inline-block;background-color:#6b97c0;}
    .CosmeticIssues{width:14px;height:14px;display:inline-block;background-color:#ceddea;}
    .propIssues{vertical-align:middle;font-size:24px;font-weight:600;padding:5px;}
    .padding-issue{vertical-align:middle;padding:10px;}
    #arrowHeader,.arrowHeader{background-color:#0655a2;width:430px;height:50px;display:block;color:#333;font-family:'Quicksand';margin-top:3rem;position:relative;}
    #arrowHeader::after,.arrowHeader::after{content:'';position:absolute;right:-60px;top:0;border-bottom:50px solid #0655a2;border-right:60px solid transparent;}
    .arrowHeaderTitle{width:400px;padding:15px 0 0 1rem;font-weight:800;color:white;font-size:18px;}
    #flooringHeading,.flooringHeading{background-color:#f8b516;width:572px;height:50px;display:block;color:#333;font-family:'Quicksand';position:relative;margin-top:-1px;}
    #flooringHeading::after,.flooringHeading::after{content:'';position:absolute;right:-60px;top:0;border-bottom:50px solid #f8b516;border-right:60px solid transparent;}
    .titleDiv{width:500px;padding:15px 0 0 5rem;font-weight:800;font-size:16px;}
    .qulty_checked_img{width:100%;aspect-ratio:1/1;object-fit:cover;object-position:center;padding:4px;display:block;margin:0 auto;}
    .qc-issues-table{table-layout:fixed;}
    .qc-issues-table thead th:nth-child(1){width:10%;}
    .qc-issues-table thead th:nth-child(2){width:40%;}
    .qc-issues-table thead th:nth-child(3){width:50%;}
    .circle-box{position:relative;display:inline-block;}
    .percentage{color:#0655a2;position:absolute;font-size:32px;font-weight:700;margin:0;top:50%;left:50%;transform:translate(-50%,-50%);}
    .page-dimension-check table,.page-material-check table,.page-brand-check table{table-layout:fixed;width:100%;}
    .dim-data,.mat-data,.brand-data{word-wrap:break-word;overflow-wrap:break-word;}
    .page-dimension-check thead,.page-material-check thead,.page-brand-check thead,.qc-issues-table thead{display:table-header-group;}
    .prop-check-featurs{color:white;font-weight:600;page-break-inside:avoid;}
    .prop-icon{width:70px;height:auto;}
    .prop-content{padding-left:0.5rem;}
    #chart-1,#chart-overall,[id^="chart-space-"]{max-width:850px;margin:35px auto;}
    span.legend-section{font-size:14px;}
    .print-page-header{display:none;}
    @media print{
      @page{margin:0;size:A4 portrait;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding-top:0;}
      .print-bar{display:none!important;}
      .print-page-header{display:none!important;}
      .page-header{display:block!important;}
      .landing-page{height:297mm!important;min-height:0!important;overflow:hidden;}
    }
  </style>
</head>
<body>

<!-- PRINT BAR (outside wrap, stays sticky at top) -->
<div class="print-bar">
  <span class="print-bar-title">PropChk Home Inspection Report</span>
  <button class="print-btn" onclick="window.print()">&#8595; Save / Print PDF</button>
</div>

<!-- Fixed header that repeats on every printed page -->
<div class="print-page-header">
  <div class="container-fluid d-flex my-2">
    <span class="header-addr">Home Inspection Report - ${esc(unitNo)}, ${esc(projectName)}</span>
    <img src="${logoUrl}" class="header-logo">
  </div>
  <div class="header-lines">
    <table style="width:100%"><tr>
      <td class="orange-line"></td>
      <td class="white-line"></td>
      <td class="blue-line"></td>
    </tr></table>
  </div>
</div>

<div class="report-wrap">

<!-- PAGE 1: COVER -->
<section class="page_1 base-blue landing-page">
  <div style="background-color:#ffffff;width:100%;">
    <div style="margin-top:60px;line-height:0;">
      <img style="width:100%;display:block;" src="${assetBase}/report-assets/cover-banner.jpg" alt="PropChk Cover">
    </div>
  </div>
  <div style="flex:1;background-color:#0655a2;"></div>
  <div class="prop-check-featurs pb-1" style="padding-bottom:80px;">
    <div class="container-main">
      <table bgcolor="#0655a2" width="100%" style="background-color:#0655a2!important;table-layout:fixed;word-break:break-word;overflow:hidden;">
        <tbody bgcolor="#0655a2" style="background-color:#0655a2!important;">
          <tr bgcolor="#0655a2" style="background-color:#0655a2!important;">
            <td style="width:25%;background-color:#0655a2!important;vertical-align:baseline;padding:6px 4px;">
              <div class="text-center"><img src="${assetBase}/report-assets/icon_prop_addr.jpg" class="prop-icon"></div>
              <div class="prop-content">
                <p style="font-size:15px;color:#fff;font-weight:700;">PROPERTY ADDRESS</p>
                <p style="line-height:22px;font-size:15px;color:#fff;font-weight:700;">${esc(propAddr)}</p>
              </div>
            </td>
            <td style="width:25%;background-color:#0655a2!important;vertical-align:baseline;padding:6px 4px;">
              <div class="text-center"><img src="${assetBase}/report-assets/icon_prep_for.jpg" class="prop-icon"></div>
              <div class="prop-content">
                <p style="font-size:15px;color:#fff;font-weight:700;">PREPARED FOR</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">${esc(property.ownerName || projectName)}</p>
              </div>
            </td>
            <td style="width:25%;background-color:#0655a2!important;vertical-align:baseline;padding:6px 4px;">
              <div class="text-center"><img src="${assetBase}/report-assets/icon_inspect_date.jpg" class="prop-icon"></div>
              <div class="prop-content">
                <p style="font-size:15px;color:#fff;font-weight:700;">INSPECTION DATE</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">${fmtDate(property.inspectionDate)}</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">REPORT ID</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">${esc(property.inspectionNumber || 'N/A')}</p>
              </div>
            </td>
            <td style="width:25%;background-color:#0655a2!important;vertical-align:baseline;padding:6px 4px;">
              <div class="text-center"><img src="${assetBase}/report-assets/icon_inspec_by.jpg" class="prop-icon"></div>
              <div class="prop-content">
                <p style="font-size:15px;color:#fff;font-weight:700;">INSPECTED BY</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">${esc(inspName)}</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">VERIFIED BY</p>
                <p style="font-size:15px;color:#fff;font-weight:700;">${esc(validName)}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- PAGE 2: DISCLAIMER -->
<section class="page_2">
  ${pageHeader(unitNo, projectName, logoUrl)}
  <div class="page-body">
    <div class="container-main disclaimer-page">
      <div class="text-center mt-3 mb-2"><h2 class="disclaimer-heading">DISCLAIMER</h2></div>
      <p>PropChk is a brand of NS Property Guide Advisors Private Limited (hereinafter referred to as "PropChk") which is a company incorporated under the laws of India that provides the property inspection services.</p>
      <p>Please note that while rendering its services PropChk engages in visual inspection merely to determine the viability of a property vis-à-vis the particular use case of the client in need of PropChk's services. The use cases vary from purchase of property to lease of property</p>
      <p>The results of the inspection undertaken by PropChk are reduced into a written report which is made available to the client after conclusion of the inspection. The inspection undertaken by PropChk and the report prepared on the basis of the same is restricted solely to visual inspection of the property and is not technically exhaustive. Defects requiring invasive means or destructive testing do not fall under the purview of PropChk's inspection methods and services. The purpose of this inspection is to provide the client with a general overview of the build of the property being inspected. It is to be noted that PropChk only conducts a preliminary inspection and the same can be subject to supervision by a specialist at the discretion of the client on their own accord. PropChk defers liability for any defects that surface in the inspection by the specialist.</p>
      <p>The services offered by PropChk and the report prepared and shared by PropChk are limited to the cosmetics &amp; general functionality of the premises thereby excluding the following-</p>
      <ul>
        <li>Geologic, site and soil analysis, slide, tremor, wind, flood, noise [cars, planes, etc.]</li>
        <li>Indoor Air Quality, Mold Presence &amp; Testing</li>
        <li>Heat exchanger testing; smoke, salt, gas, odor. Heat/cooling load surveys. Air/velocity measurements, etc.</li>
        <li>Electrical circuitry, impedance, capacity, or compliance with national or local codes</li>
        <li>Plumbing/gas pressure, leakage, venting, and materials tests.</li>
        <li>Underground piping or utilities or locations, impediments, electrical fields, septic systems, water wells, etc.</li>
        <li>Easements, covenants, restrictions, right of ways, etc. By City, Community or Homes Association.</li>
        <li>Conformance to statutes, laws, codes, regulations, occupancy, suitability for a specific use, other property influences.</li>
        <li>Structural/durability analysis, wood destroying insects, pests, etc.</li>
        <li>Water leakage and drainage test of any type. Roof, siding, outside faucets. Underground &amp; site drainage, etc.</li>
        <li>Land, boundary surveys, site hazards, insurability, development potential, etc.</li>
        <li>Firefighting</li>
        <li>Grade/quality of the material fixed such as quality of tiles or ceramic/CP fitting.</li>
        <li>The inspection covers only those items listed on the report for function and safety, and not for code or statutory compliance. Please note the following regarding the report(s) shared after inspection:</li>
        <li>The report shall not be shared or reproduced by the client, except to the extent of enabling the client to carry out rectification of the defects and issues identified in the report.</li>
        <li>The status captured in the report is as on the inspection date To avoid confusion, the inspection date shall mean the date on which the property was inspected by PropChk or its agent.</li>
        <li>The report does not cover any of the aspects that have been expressly excluded in this Disclaimer.</li>
        <li>The report is not intended to be a general verdict on the quality of construction/reputation of the person/company/any other entity who constructed the property and shall only be a report intended to provide the client with on-ground information with respect to the property on an as is-where is basis.</li>
      </ul>
      <p>PropChk makes no representation or warranty as to the completeness of any information contained in the report(s). This report is intended for the sole use of the client and is not to be relied upon or shared wholly and solely, except for the purposes provided herein. It is clarified that the report is intended to operate as a visual aid to the client and as such cannot be given unqualified reliance.</p>
      <p>The report shared is solely intended for use by the client for rectifications of the snags reported and is the property of PropChk. The report is not an opinion but a factual report limited to the findings made by PropChk at the time of the visual inspection. The report is shared in good faith with the client and the client is entitled to use the report in support of their claims with respect to carrying out any alterations or rectification or renovations to the property. The professional fee paid by the client at the time of engagement is only for the purpose of the inspection and reporting at the subject property.</p>
      <p>Notwithstanding anything contained herein, the client's reliance upon those report(s) shall not create any liability (direct, indirect, consequential or special etc.) against PropChk except for those expressly consented to.</p>
      <p>Though every effort is made to cover all the quality issues during inspection, PropChk shall not be liable for any financial compensation &amp; legal action for any missed issues or the issues not apparent on the date of inspection and may surface in future. Further, PropChk does not provide any indemnification whatsoever, neither does it undertake any responsibility of any occurrences of malfunctioning of the inspected property and its components in the future. PropChk does not undertake responsibility for the lack of discovery of any defect which shall arise during or subsequent to the inspection.</p>
      <p>The maximum liability incurred by PropChk in the process of inspection of the property shall be limited to the inspection fee and only pertaining to those services included in the report provided to the client.</p>
    </div>
  </div>
</section>
<div class="page-break-after"></div>

<!-- PAGE 3: TABLE OF CONTENTS -->
<section class="page_3">
  ${pageHeader(unitNo, projectName, logoUrl)}
  <div class="page-body">
    <div class="container-main">
      <div class="text-center my-5"><h2 class="contents-heading">TABLE OF CONTENTS</h2></div>
      <div class="table-content">
        <div class="row">
          <div class="col-md-10 offset-md-1 table-links" style="text-align:auto;">
            <ol type="I" style="list-style-type:upper-roman;list-style-position:inside;padding-left:0;">
              <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#Summary-1">Summary............................................................................................................................................................................................................................................................................................................................</a>
                <ol type="A" style="list-style-type:upper-alpha;list-style-position:inside;padding-left:2rem;">
                  <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#OverallUnitHealth">Overall Unit Health........................................................................................................................................................................................................................................................................................</a></li>
                  <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#PropertyWalkthrough">360° Property Walkthrough.................................................................................................................................................................................................................................................................</a></li>
                  <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#SpaceWiseHealth">Space Wise Health.........................................................................................................................................................................................................................................................................................</a></li>
                </ol>
              </li>
              <li class="mb-3 mt-2" style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#AreaCheck">Area Check.......................................................................................................................................................................................................................................................................................................................</a></li>
              <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#QualityCheck">Quality Check.................................................................................................................................................................................................................................................................................................................</a>
                <ol type="A" style="list-style-type:upper-alpha;list-style-position:inside;padding-left:2rem;">
                  <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#OverallSummary">Overall Summary............................................................................................................................................................................................................................................................................................</a></li>
                  ${wqSource && (wqPh != null || wqTds != null) ? `<li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#WaterQuality">Water Quality.....................................................................................................................................................................................................................................................................................................</a></li>` : ''}
                  ${spaces.map((s: any, idx: number) => `<li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#${esc(s.name)}">${esc(s.name)}..........................................................................................................................................................................................................................................................................................................</a>
                    <ol style="list-style-type:decimal;list-style-position:inside;padding-left:2rem;">
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#ItemWiseSummary${idx}">Item Wise Summary.........................................................................................................................................................................................................................................................................</a></li>
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#GeneralPictures${idx}">General Pictures....................................................................................................................................................................................................................................................................................</a></li>
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#${esc(s.name)}Flooring">Flooring..........................................................................................................................................................................................................................................................................................................</a></li>
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#${esc(s.name)}Doors">Doors................................................................................................................................................................................................................................................................................................................</a></li>
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#${esc(s.name)}Windows">Windows.........................................................................................................................................................................................................................................................................................................</a></li>
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#${esc(s.name)}WallFinish">Wall Finish.......................................................................................................................................................................................................................................................................................................</a></li>
                      <li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#${esc(s.name)}ElectricalWork">Electrical Work.........................................................................................................................................................................................................................................................................................</a></li>
                    </ol>
                  </li>`).join('')}
                </ol>
              </li>
              ${dimTable.length > 0 ? `<li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#DimensionCheck">Dimension Check........................................................................................................................................................................................................................................................................................................</a></li>` : ''}
              ${matTable.length > 0 ? `<li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#MaterialCheck">Material Check...............................................................................................................................................................................................................................................................................................................</a></li>` : ''}
              ${(brandTables.regular.length + brandTables.bathroom.length + brandTables.kitchen.length) > 0 ? `<li style="font-size:18px;line-height:1.5cm;font-weight:800;"><a href="#BrandCheck">Brand Check....................................................................................................................................................................................................................................................................................................................</a></li>` : ''}
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<div class="page-break-after"></div>

<!-- PAGE 4: I. SUMMARY -->
<section class="page_4">
  ${pageHeader(unitNo, projectName, logoUrl)}
  <div class="container-main">
    <div class="summary-block"><h3 class="summary-heading" id="Summary-1">I. SUMMARY</h3></div>
    <table style="width:100%;background-color:white;" bgColor="#ffffff">
      <tbody>
        <tr>
          <td style="width:50%;vertical-align:top;text-align:center;" bgColor="#ffffff">
            <h4 class="summary-sub-headng" id="OverallUnitHealth" style="text-align:center;margin-left:0;">OVERALL UNIT HEALTH</h4>
            <div style="text-align:center;margin-top:2rem;">
              <div class="circle-box" style="width:200px;height:200px;display:inline-block;position:relative;">
                <h3 class="percentage" style="font-size:32px;font-weight:700;color:#0655a2;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);margin:0;">${health}%</h3>
                <svg width="200" height="200" viewBox="0 0 42 42" class="donut" style="display:block;">
                  <circle class="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="#fff"></circle>
                  <circle class="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f8b516" stroke-width="7"></circle>
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0655a2" stroke-width="7" stroke-dasharray="${health} ${100 - health}" stroke-dashoffset="26"></circle>
                </svg>
              </div>
            </div>
          </td>
          <td style="width:50%;vertical-align:top;text-align:center;" bgColor="#ffffff">
            <div class="text-center">
              <div class="video-plyr">
                <h4 class="summary-sb-headng" id="PropertyWalkthrough">360° PROPERTY WALKTHROUGH</h4>
                ${property.videoUrl ? `
                <a href="${esc(property.videoUrl)}" target="_blank">
                  <img src="${esc(property.videoThumbnail || '')}" width="auto" height="170px" style="max-width:100%;">
                  <div class="clearfix"></div>
                  <div class="summary-sb-headng fs-5" style="font-size:20px;">Click on icon to view</div>
                </a>` : `
                <a href="" target="_blank">
                  <img src="https://d33v4339jhl8k0.cloudfront.net/docs/assets/591c8a010428634b4a33375c/images/5ab4866b2c7d3a56d8873f4c/file-MrylO8jADD.png" width="auto" height="170px" style="max-width:100%;">
                  <div class="clearfix"></div>
                  <div class="summary-sb-headng fs-5" style="font-size:20px;">Click on icon to view</div>
                </a>`}
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div style="text-align:center;margin:0 auto;max-width:700px;">
      <h4 class="space-wise my-2" id="SpaceWiseHealth" style="font-size:24px;text-align:center;">SPACE WISE HEALTH</h4>
      <div style="width:100%;">
        <div id="chart-1"></div>
      </div>
    </div>
  </div>
</section>
<div class="page-break-after"></div>

<!-- PAGE 5: SPACE-WISE BREAKDOWN TABLE -->
${spaces.length > 0 ? `
<section class="page_5" style="page-break-inside:avoid;">
  ${pageHeader(unitNo, projectName, logoUrl)}
  <div class="container-main">
    <div class="summary-block"><h3 class="summary-heading">Space-wise Health Rating</h3></div>
    <div class="table-responsive prop-check-tbl-border" style="page-break-inside:avoid;">
      <table width="100%">
        <thead>
          <tr class="base-blue" bgcolor="#0655a2">
            <th>Space Name</th><th>Health Rating</th><th>Major</th><th>Minor</th><th>Cosmetic</th>
          </tr>
        </thead>
        <tbody>
          ${spaces.map((s: any) => `
          <tr>
            <td class="tbl-blue-1" style="vertical-align:middle;font-size:20px;">${esc(s.name)}</td>
            <td style="text-align:center;font-size:20px;font-weight:700;color:#0655a2;">${s.healthDisplay}</td>
            <td style="text-align:center;font-size:20px;">${s.major.length}</td>
            <td style="text-align:center;font-size:20px;">${s.minor.length}</td>
            <td style="text-align:center;font-size:20px;">${s.cosmetic.length}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
</section>
<div class="page-break-after"></div>` : ''}

<!-- AREA CHECK -->
${spaces.length > 0 ? `
<div class="page-header">
  <div class="container-fluid d-flex my-2">
    <span class="header-addr">Home Inspection Report - ${esc(unitNo)}, ${esc(projectName)}</span>
    <img src="${logoUrl}" class="header-logo">
  </div>
  <div class="header-lines">
    <table style="width:100%;"><tr><td class="orange-line"></td><td class="white-line"></td><td class="blue-line"></td></tr></table>
  </div>
</div>
<div class="container-main">
  <div class="summary-block"><h3 class="summary-heading" id="AreaCheck">II. AREA CHECK</h3></div>
  <div class="prop-check-tbl">
    <table border="2" bordercolor="#ffffff" width="100%">
      <thead class="base-blue text-white text-center">
        <tr class="base-blue" bgcolor="#0655a2">
          <th style="color:white;">SPACE</th>
          <th style="color:white;">DIMENSION (ft x ft)</th>
          <th style="color:white;">AREA (sq ft)</th>
        </tr>
      </thead>
      <tbody>
        ${areaRows}
        <tr class="orange-c">
          <td colspan="2" class="text-center" style="font-size:20px;">Total</td>
          <td style="font-size:20px;">${totalArea.toFixed(2)} sq ft</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
<div class="page-break-after"></div>` : ''}

<!-- III. QUALITY CHECK - OVERALL SUMMARY -->
<section class="page-quality-summary">
  ${pageHeader(unitNo, projectName, logoUrl)}
  <div class="container-main overall-summary-container">
    <div class="summary-block"><h3 class="summary-heading" id="QualityCheck">III. QUALITY CHECK</h3></div>
    <div style="max-width:700px;margin:0 auto;">
      <h4 class="space-wise my-4" id="OverallSummary" style="font-family:'Quicksand';text-align:center;">OVERALL SUMMARY</h4>
      <div class="barChart">
        <div style="width:100%"><div id="chart-overall"></div></div>
        <br>
        <div class="barChart-legend text-center">
          <span class="legend-section">
            <span style="width:10px;height:10px;background:#203864;display:inline-block;"></span> Satisfactory
            <span style="width:12px;height:12px;background:#ffc000;display:inline-block;margin-left:20px;"></span> Unsatisfactory
          </span>
        </div>
      </div>
    </div>
    ${waterQualitySection}
  </div>
</section>
<div class="page-break-after"></div>
${wqPicPages}

<!-- PER-SPACE QUALITY CHECK PAGES -->
${spacePages}

<!-- IV. DIMENSION CHECK -->
${dimHTML}

<!-- V. MATERIAL CHECK -->
${matHTML}

<!-- VI. BRAND CHECK -->
${brandRegularHTML}
${brandBathHTML}
${brandKitHTML}

<!-- FINAL FOOTER PAGE -->
<div class="page-break-after"></div>
<section class="final-footer-page" style="background-color:#f8b516;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4rem 2rem;">
  <div style="max-width:1000px;margin:0 auto;">
    <div style="margin-bottom:3rem;">
      <h2 style="margin:0 0 2rem 0;font-size:2.5rem;font-weight:700;color:#0655a2;font-family:'Quicksand';">Contact Us</h2>
      <p style="margin:0 0 1.5rem 0;font-size:1.8rem;font-weight:600;color:#333;"><a href="https://propcheck.in/" target="_blank" style="color:#0655a2;text-decoration:none;">www.propcheck.in</a></p>
      <p style="margin:0 0 1.5rem 0;font-size:1.5rem;font-weight:600;color:#333;">+91 8822 22 8822</p>
      <p style="margin:0;font-size:1.3rem;font-weight:600;color:#333;"><a href="mailto:support@propcheck.in" style="color:#0655a2;text-decoration:none;">support@propcheck.in</a></p>
    </div>
    <div style="margin-bottom:3rem;">
      <h3 style="margin:0 0 1.5rem 0;font-size:1.8rem;font-weight:700;color:#0655a2;font-family:'Quicksand';">Our Presence</h3>
      <p style="margin:0;font-size:1.2rem;font-weight:600;color:#333;line-height:2;">DELHI NCR | MUMBAI | PUNE | HYDERABAD<br>BANGALORE | CHENNAI | KOLKATA</p>
    </div>
    <div style="margin-top:4rem;padding-top:2rem;border-top:2px solid #0655a2;">
      <p style="margin:0 0 1rem 0;font-size:1.5rem;font-weight:700;color:#0655a2;">PropChk</p>
      <p style="margin:1rem 0 0 0;font-size:0.9rem;font-weight:500;color:#666;">Report Generated: ${fmtDate(property.inspectionDate)} | Report ID: ${esc(property.inspectionNumber || 'N/A')}</p>
    </div>
  </div>
</section>

<!-- Hidden chart data -->
<p id="getspacesArr" style="display:none;">${spacesNameList}</p>
<p id="spaceshealthArr" style="display:none;">${spacesHealthList}</p>
<p id="majorSatisfactoryPercentage" style="display:none;">${qs.majorSatPct}</p>
<p id="minorSatisfactoryPercentage" style="display:none;">${qs.minorSatPct}</p>
<p id="cosmeticSatisfactoryPercentage" style="display:none;">${qs.cosmeticSatPct}</p>
<p id="majorUnSatisfactoryPercentage" style="display:none;">${qs.majorUnsatPct}</p>
<p id="minorUnSatisfactoryPercentage" style="display:none;">${qs.minorUnsatPct}</p>
<p id="cosmeticUnSatisfactoryPercentage" style="display:none;">${qs.cosmeticUnsatPct}</p>
${spaces.map((s: any, i: number) => `
<p id="spaceCategories${i}" style="display:none;">${s.itemWiseCategories}</p>
<p id="spaceMajorData${i}" style="display:none;">${s.itemWiseMajorData}</p>
<p id="spaceMinorData${i}" style="display:none;">${s.itemWiseMinorData}</p>
<p id="spaceCosmeticData${i}" style="display:none;">${s.itemWiseCosmeticData}</p>`).join('')}

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
<script>
$(document).ready(function(){
  // Space Wise Health Chart
  var spacesArr = ($("#getspacesArr").text()||"").split(",").filter(Boolean);
  var healthArr = ($("#spaceshealthArr").text()||"").split(",").filter(Boolean);
  if(spacesArr.length>0 && document.querySelector("#chart-1")){
    var c1=new ApexCharts(document.querySelector("#chart-1"),{
      series:[{data:healthArr,color:"#1f497d"}],
      chart:{type:'bar',height:Math.max(200,spacesArr.length*60),toolbar:{show:false}},
      plotOptions:{bar:{barHeight:'75%',horizontal:true,dataLabels:{position:'center'}}},
      dataLabels:{enabled:true,style:{fontSize:'16px',colors:['#fff']}},
      stroke:{show:true,width:1,colors:['#fff']},
      xaxis:{categories:spacesArr},
      yaxis:{min:0,max:10,tickAmount:1,labels:{style:{fontSize:'16px'}}}
    });
    c1.render();
  }
  // Overall Summary Chart
  if(document.querySelector("#chart-overall")){
    var mS=$("#majorSatisfactoryPercentage").text(),nS=$("#minorSatisfactoryPercentage").text(),cS=$("#cosmeticSatisfactoryPercentage").text();
    var mU=$("#majorUnSatisfactoryPercentage").text(),nU=$("#minorUnSatisfactoryPercentage").text(),cU=$("#cosmeticUnSatisfactoryPercentage").text();
    var co=new ApexCharts(document.querySelector("#chart-overall"),{
      series:[{name:'Satisfactory',data:[mS,nS,cS],color:"#203864"},{name:'Unsatisfactory',data:[mU,nU,cU],color:"#ffc000"}],
      chart:{toolbar:{show:false},type:'bar',height:500,stacked:true,stackType:'100%'},
      plotOptions:{bar:{barHeight:'40%',horizontal:true,dataLabels:{style:{fontSize:'22px'}},distributed:false}},
      stroke:{width:1,colors:['#fff']},
      xaxis:{categories:['Major','Minor','Cosmetic'],labels:{formatter:function(v){return v+"%"}}},
      yaxis:{min:0,max:100,tickAmount:1,labels:{style:{fontSize:'15px'}}},
      dataLabels:{formatter:function(v){return Math.round(v)+'%'}},
      fill:{opacity:1},legend:{show:false}
    });
    co.render();
  }
  // Per-space Item Wise Summary Charts
  var si=0;
  while(document.querySelector("#chart-space-"+si)){
    (function(idx){
      var cats=$("#spaceCategories"+idx).text();
      var mD=$("#spaceMajorData"+idx).text();
      var nD=$("#spaceMinorData"+idx).text();
      var cD=$("#spaceCosmeticData"+idx).text();
      if(!cats) return;
      var parse=function(s){return s?s.split(",").map(function(v){if(v===''||v==='null')return null;var n=Number(v);return n===0?0.5:n;}):[]};
      var sc=new ApexCharts(document.querySelector("#chart-space-"+idx),{
        chart:{height:600,type:'bar',animations:{enabled:false},toolbar:{show:false}},
        plotOptions:{bar:{horizontal:false,columnWidth:'75%',endingShape:'rounded',dataLabels:{position:'center'}}},
        dataLabels:{enabled:true,formatter:function(v){if(v===null||v===undefined)return'';return(v<1?0:Math.round(v))+"%"},style:{fontSize:'11px',fontWeight:'bold',colors:['#fff']},offsetY:0},
        colors:['#1f4e79','#2e75b6','#9dc3e6'],
        stroke:{show:true,width:2,colors:['transparent']},
        series:[{name:'Major',data:parse(mD)},{name:'Minor',data:parse(nD)},{name:'Cosmetic',data:parse(cD)}],
        xaxis:{categories:cats.split(","),labels:{style:{fontSize:'12px'}}},
        yaxis:{min:0,max:100,tickAmount:10,title:{text:'(satisfactory percentage) %',style:{fontSize:'14px'}},labels:{style:{fontSize:'14px'},formatter:function(v){return v+"%"}}},
        fill:{opacity:1},
        legend:{position:'bottom',horizontalAlign:'center'}
      });
      sc.render();
    })(si);
    si++;
  }
});
</script>

</div><!-- /report-wrap -->
</body>
</html>`;
}

// ─── route handlers ───────────────────────────────────────────────────────────

async function handleGenerateReport(id: string, req: NextRequest) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const [property, waterQuality] = await Promise.all([
    Property.findById(id)
      .populate('inspectorId', 'name userName')
      .populate('validatorId', 'name userName')
      .lean() as any,
    WaterQuality.findOne({ propertyId: id }).lean() as any,
  ]);

  if (!property) return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });

  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:4000';
  const assetBase = `${proto}://${host}`;
  const html = buildReport(property, waterQuality, assetBase);

  // Sync inspection completion with PropCheck portal
  notifyPropCheckWebhook({
    ...property,
    overallhealthrating: property.overallhealthrating || null
  }).catch((err) => console.warn('[PropCheck Webhook] Async sync error:', err?.message));

  return NextResponse.json({ status: true, message: 'Report generated', data: { reportHtml: html } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try { return await handleGenerateReport(params.id, req); }
  catch (e: any) {
    console.error('[generate-report]', e.message);
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { return await handleGenerateReport(params.id, req); }
  catch (e: any) {
    console.error('[generate-report]', e.message);
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}

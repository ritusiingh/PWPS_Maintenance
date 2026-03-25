const { db } = require('../models/database');

async function calculateAll() {
  const charges = await db.all('SELECT * FROM service_charges WHERE is_active = 1');
  const flats = await db.all('SELECT * FROM flats');
  const totalSqftRow = await db.get('SELECT SUM(super_buildup_sqft) as total FROM flats');
  const totalUDSRow = await db.get('SELECT SUM(uds_area_sqft) as total FROM flats');
  const flatCountRow = await db.get('SELECT COUNT(*) as count FROM flats');

  const totalSqft = totalSqftRow?.total || 0;
  const totalUDS = totalUDSRow?.total || 0;
  const flatCount = flatCountRow?.count || 0;
  const totalCost = charges.reduce((s, c) => s + c.monthly_total_cost, 0);

  if (!flats.length || !charges.length) return { results: [], summary: null };

  const results = flats.map(flat => {
    const sqftRatio = flat.super_buildup_sqft / totalSqft;
    const udsRatio = flat.uds_area_sqft / totalUDS;
    const sqftAmount = totalCost * sqftRatio;
    const udsAmount = totalCost * udsRatio;

    const sqftBreakdown = charges.map(c => ({ service: c.service_name, category: c.category, totalCost: c.monthly_total_cost, share: c.monthly_total_cost * sqftRatio, method: 'sqft' }));
    const udsBreakdown = charges.map(c => ({ service: c.service_name, category: c.category, totalCost: c.monthly_total_cost, share: c.monthly_total_cost * udsRatio, method: 'uds' }));

    const hybridAmount = charges.reduce((s, c) => {
      return s + (c.monthly_total_cost / flatCount) * 0.4 + (c.monthly_total_cost * sqftRatio) * 0.3 + (c.monthly_total_cost * udsRatio) * 0.3;
    }, 0);

    const hybridBreakdown = charges.map(c => {
      const eq = (c.monthly_total_cost / flatCount) * 0.4;
      const sq = (c.monthly_total_cost * sqftRatio) * 0.3;
      const ud = (c.monthly_total_cost * udsRatio) * 0.3;
      return { service: c.service_name, category: c.category, totalCost: c.monthly_total_cost, equalComponent: eq, sqftComponent: sq, udsComponent: ud, share: eq + sq + ud, method: 'hybrid' };
    });

    return {
      flat_id: flat.id, flat_number: flat.flat_number, block: flat.block, bhk_type: flat.bhk_type,
      owner_name: flat.owner_name, carpet_area: flat.carpet_area_sqft, super_buildup: flat.super_buildup_sqft, uds_area: flat.uds_area_sqft,
      sqft: { total: Math.round(sqftAmount * 100) / 100, perSqft: Math.round((sqftAmount / flat.super_buildup_sqft) * 100) / 100, breakdown: sqftBreakdown },
      uds: { total: Math.round(udsAmount * 100) / 100, perUds: Math.round((udsAmount / flat.uds_area_sqft) * 100) / 100, breakdown: udsBreakdown },
      hybrid: { total: Math.round(hybridAmount * 100) / 100, breakdown: hybridBreakdown },
    };
  });

  const summary = { totalFlats: flats.length, totalMonthlyCharges: totalCost, totalSqft, totalUDS, charges, byBHK: {},
    methods: { sqft: { min: Infinity, max: -Infinity, avg: 0, total: 0 }, uds: { min: Infinity, max: -Infinity, avg: 0, total: 0 }, hybrid: { min: Infinity, max: -Infinity, avg: 0, total: 0 } } };

  results.forEach(r => {
    ['sqft', 'uds', 'hybrid'].forEach(m => {
      const a = r[m].total;
      summary.methods[m].total += a;
      summary.methods[m].min = Math.min(summary.methods[m].min, a);
      summary.methods[m].max = Math.max(summary.methods[m].max, a);
    });
    if (!summary.byBHK[r.bhk_type]) summary.byBHK[r.bhk_type] = { count: 0, sqft: 0, uds: 0, hybrid: 0 };
    summary.byBHK[r.bhk_type].count++;
    summary.byBHK[r.bhk_type].sqft += r.sqft.total;
    summary.byBHK[r.bhk_type].uds += r.uds.total;
    summary.byBHK[r.bhk_type].hybrid += r.hybrid.total;
  });

  ['sqft', 'uds', 'hybrid'].forEach(m => {
    summary.methods[m].avg = Math.round((summary.methods[m].total / flats.length) * 100) / 100;
    summary.methods[m].total = Math.round(summary.methods[m].total * 100) / 100;
    summary.methods[m].min = Math.round(summary.methods[m].min * 100) / 100;
    summary.methods[m].max = Math.round(summary.methods[m].max * 100) / 100;
  });

  Object.keys(summary.byBHK).forEach(bhk => {
    const c = summary.byBHK[bhk].count;
    summary.byBHK[bhk].avgSqft = Math.round((summary.byBHK[bhk].sqft / c) * 100) / 100;
    summary.byBHK[bhk].avgUds = Math.round((summary.byBHK[bhk].uds / c) * 100) / 100;
    summary.byBHK[bhk].avgHybrid = Math.round((summary.byBHK[bhk].hybrid / c) * 100) / 100;
  });

  return { results, summary };
}

async function saveSnapshot(month, year) {
  const { results } = await calculateAll();
  for (const r of results) {
    await db.run('INSERT INTO calculation_snapshots (flat_id, month, year, sqft_amount, uds_amount, hybrid_amount, breakdown_json) VALUES (?,?,?,?,?,?,?)',
      r.flat_id, month, year, r.sqft.total, r.uds.total, r.hybrid.total, JSON.stringify(r));
  }
  return results.length;
}

module.exports = { calculateAll, saveSnapshot };

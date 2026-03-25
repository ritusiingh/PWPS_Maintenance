require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { db, initializeAsync } = require('../server/models/database');

const FLATS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'flats_data.json'), 'utf8'));
const FLOOR_MAP = { 'Ground': 0, '1st': 1, '2nd': 2, '3rd': 3 };

async function seed() {
  await initializeAsync();
  console.log('\ud83c\udf31 Seeding database with real PWPS flat data...');

  const tables = ['calculation_snapshots','email_logs','payments','maintenance_bills','expenses','service_charges','users','flats','settings'];
  for (const t of tables) { await db.run(`DELETE FROM ${t}`); }

  const adminHash = bcrypt.hashSync('admin123', 10);
  await db.run('INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)',
    'admin@apartment.com', adminHash, 'Society Admin', '9876543210', 'admin');
  console.log('\u2705 Admin user created');

  const firstNames = ['Rajesh','Priya','Amit','Sunita','Vikram','Anita','Suresh','Kavita','Ramesh','Deepa','Arun','Meera','Sanjay','Lakshmi','Nitin','Pooja','Kiran','Revathi','Ganesh','Swathi','Harish','Divya','Mahesh','Asha','Naveen','Rekha','Prasad','Geetha','Venkat','Shilpa'];
  const lastNames = ['Kumar','Sharma','Reddy','Rao','Nair','Gowda','Hegde','Patil','Iyer','Menon','Pai','Kamath','Shetty','Bhat','Acharya','Kulkarni','Desai','Joshi','Patel','Gupta'];
  const residentHash = bcrypt.hashSync('resident123', 10);

  let flatCount = 0;
  for (const flat of FLATS_DATA) {
    flatCount++;
    const flatNumber = `${flat.block}-${flat.flat_no}`;
    const bhkType = flat.bhk === '2 BHK' ? '2BHK' : '3BHK';
    const floorNum = FLOOR_MAP[flat.floor] ?? 0;
    const fn = firstNames[flatCount % firstNames.length];
    const ln = lastNames[flatCount % lastNames.length];
    const ownerName = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${flat.flat_no}@email.com`;
    const phone = `98${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

    const result = await db.run(
      'INSERT INTO flats (flat_number,block,floor,bhk_type,carpet_area_sqft,super_buildup_sqft,uds_area_sqft,owner_name,owner_email,owner_phone) VALUES (?,?,?,?,?,?,?,?,?,?)',
      flatNumber, flat.block, floorNum, bhkType, flat.carpet, flat.sba, flat.uds, ownerName, email, phone
    );

    if (flatCount <= 10) {
      await db.run('INSERT INTO users (email, password, name, phone, role, flat_id) VALUES (?,?,?,?,?,?)',
        email, residentHash, ownerName, phone, 'resident', result.lastInsertRowid);
    }
  }

  const blockCounts = {};
  FLATS_DATA.forEach(f => { blockCounts[f.block] = (blockCounts[f.block] || 0) + 1; });
  const blockSummary = Object.entries(blockCounts).sort((a,b) => a[0].localeCompare(b[0]))
    .map(([b,c]) => `${b}:${c}`).join(', ');
  console.log(`\u2705 ${flatCount} flats created across 9 blocks (${blockSummary})`);

  const charges = [
    { name: 'Security Services', desc: '24x7 security guards, CCTV monitoring', cost: 280000, cat: 'security' },
    { name: 'Housekeeping', desc: 'Common area cleaning, waste management', cost: 180000, cat: 'housekeeping' },
    { name: 'Common Area Electricity', desc: 'Lobby, corridor, parking lighting, elevators', cost: 220000, cat: 'electricity' },
    { name: 'Lift Maintenance', desc: 'Elevator AMC and repairs', cost: 120000, cat: 'lift' },
    { name: 'Garden & Landscaping', desc: 'Garden maintenance, plant care', cost: 85000, cat: 'garden' },
    { name: 'Water Charges', desc: 'Tanker water, borewell, STP', cost: 150000, cat: 'water' },
    { name: 'Swimming Pool', desc: 'Pool maintenance, chemicals', cost: 65000, cat: 'amenity' },
    { name: 'Clubhouse Maintenance', desc: 'Gym, community hall', cost: 55000, cat: 'amenity' },
    { name: 'Sinking Fund', desc: 'Reserve for major repairs', cost: 100000, cat: 'other' },
    { name: 'Insurance', desc: 'Building insurance premium', cost: 45000, cat: 'other' },
  ];
  for (const c of charges) {
    await db.run('INSERT INTO service_charges (service_name, description, monthly_total_cost, category) VALUES (?,?,?,?)',
      c.name, c.desc, c.cost, c.cat);
  }
  console.log(`\u2705 ${charges.length} service charges configured`);

  const settings = [
    ['society_name', 'Pariwar Wise Palm Springs'],
    ['society_address', 'Sy. No. 68/2, Haralur Village, Varthur Hobli, Bangalore'],
    ['society_tagline', 'Inspired by mother nature'],
    ['total_blocks', '9'],
    ['total_flats', '328'],
    ['active_calculation_method', 'hybrid'],
    ['hybrid_equal_share', '0.4'],
    ['hybrid_sqft_share', '0.3'],
    ['hybrid_uds_share', '0.3'],
    ['gst_percentage', '18'],
    ['apply_gst', 'false'],
    ['due_day', '15'],
    ['currency', 'INR'],
  ];
  for (const [k, v] of settings) {
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', k, v);
  }
  console.log('\u2705 Settings configured');
  console.log('\n\ud83c\udf89 Seed complete! 328 flats | 9 blocks (A-I) | 2 BHK & 3 BHK');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

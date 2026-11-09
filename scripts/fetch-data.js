// scripts/fetch-data.js
// Dohvata podatke iz GAS API-ja i sprema ih u data/utakmice.json

const fs = require('fs');
const path = require('path');

const API_URLS = {
  aktivna: 'https://script.google.com/macros/s/AKfycbzA4T8Nt1bfqBIrjT4JV9KMFtQRe8ErwpqUOwN6qA3bFdmBBzJeC2B13byrDZC26OfdYg/exec',
  '2025-26': 'https://script.google.com/macros/s/AKfycbxY7F-FzP93x4aT7J0x9l2BYurPDbi6Sve5gGjBH1IOGVx3cCY7Gab8HJHLcwu9NMmCiA/exec'
};

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
}

async function main() {
  const rezultat = {};
  let uspjesno = 0;

  for (const [key, url] of Object.entries(API_URLS)) {
    try {
      console.log(`Dohvatam ${key}...`);
      const data = await fetchWithRetry(url);
      if (Array.isArray(data)) {
        rezultat[key] = data;
        uspjesno++;
        console.log(`  ✓ ${key}: ${data.length} utakmica`);
      } else {
        console.warn(`  ⚠ ${key}: neočekivan format, preskačem`);
        rezultat[key] = null;
      }
    } catch (e) {
      console.error(`  ✗ ${key}: ${e.message}`);
      rezultat[key] = null;
    }
  }

  if (uspjesno === 0) {
    console.error('Nijedna sezona nije dohvaćena. Prekidam bez pisanja fajla.');
    process.exit(1);
  }

  // Sačuvaj sa metapodacima
  const output = {
    updatedAt: new Date().toISOString(),
    ...rezultat
  };

  const outPath = path.join(__dirname, '..', 'data', 'utakmice.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output));
  console.log(`\n✓ Sačuvano: ${outPath}`);
}

main().catch(e => {
  console.error('Fatalna greška:', e);
  process.exit(1);
});

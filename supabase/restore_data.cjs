// Restore data from backup_biosolve.json to new Supabase project
// Uses service_role key to bypass RLS

const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://mkmqhnyobnqwhfnoekwq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbXFobnlvYm5xd2hmbm9la3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzODk4OSwiZXhwIjoyMDg5NTE0OTg5fQ.9GnKOI6QzWJB-1d-J60R12lRiLpnQ2GH9Ac6Jy292oQ';

const BACKUP_PATH = 'C:\\Users\\sodexo\\Laptop Sodexo Sincronizada\\OneDrive\\Documentos\\Sodexo\\Laptop Sodexo\\Descargas\\backup_biosolve.json';

function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function clearTable(table) {
  try {
    // Delete all rows - use a condition that matches everything
    await makeRequest(`/rest/v1/${table}?id=not.is.null`, 'DELETE');
    console.log(`  Cleared: ${table}`);
  } catch (err) {
    console.log(`  Warning clearing ${table}: ${err.message}`);
  }
}

async function insertData(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  Skip: ${table} (0 rows)`);
    return;
  }

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      await makeRequest(`/rest/v1/${table}`, 'POST', batch);
      inserted += batch.length;
    } catch (err) {
      console.error(`  ERROR inserting into ${table} (batch ${i}): ${err.message}`);
      // Try one by one for the failed batch
      for (const row of batch) {
        try {
          await makeRequest(`/rest/v1/${table}`, 'POST', row);
          inserted++;
        } catch (e2) {
          console.error(`    Row failed: ${JSON.stringify(row).substring(0, 100)}... - ${e2.message}`);
        }
      }
    }
  }

  console.log(`  Inserted: ${table} (${inserted}/${rows.length})`);
}

async function main() {
  console.log('=== BIOSOLVE DATA RESTORE ===\n');

  // Read backup
  const raw = fs.readFileSync(BACKUP_PATH, 'utf-8');
  const backup = JSON.parse(raw);

  // Order matters! Must respect foreign key dependencies
  // 1. First clear in reverse order (children first)
  console.log('Step 1: Clearing existing data...');
  await clearTable('auditorias');
  await clearTable('vehiculos_entregados');
  await clearTable('instalaciones');
  await clearTable('vehiculos');
  await clearTable('proyectos');
  await clearTable('empresas');
  await clearTable('equipamiento');
  // Skip usuarios and user_roles (they reference auth.users)

  // 2. Insert in dependency order (parents first)
  console.log('\nStep 2: Restoring data...');

  // Empresas first (no dependencies)
  await insertData('empresas', backup.empresas?.data);

  // Proyectos (depends on empresas)
  await insertData('proyectos', backup.proyectos?.data);

  // Vehiculos (depends on proyectos)
  await insertData('vehiculos', backup.vehiculos?.data);

  // Instalaciones (depends on vehiculos)
  await insertData('instalaciones', backup.instalaciones?.data);

  // Vehiculos entregados (depends on vehiculos + proyectos)
  await insertData('vehiculos_entregados', backup.vehiculos_entregados?.data);

  // Auditorias (depends on vehiculos)
  // Remove auditor_id if it references an auth.user that doesn't exist yet
  const auditorias = (backup.auditorias?.data || []).map(a => ({
    ...a,
    auditor_id: null // Clear user reference since auth users don't exist in new project
  }));
  await insertData('auditorias', auditorias);

  // Equipamiento - clear the seed data first and insert from backup
  await clearTable('equipamiento');
  await insertData('equipamiento', backup.equipamiento?.data);

  console.log('\nStep 3: User data...');
  console.log('  NOTE: usuarios and user_roles CANNOT be migrated automatically');
  console.log('  because they reference auth.users (Supabase Auth accounts).');
  console.log('  Users need to be recreated via the app Setup/Admin panel.');
  console.log(`  (${backup.usuarios?.rows || 0} users, ${backup.user_roles?.rows || 0} roles in backup)`);

  console.log('\n=== RESTORE COMPLETE ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

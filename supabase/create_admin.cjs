// Create admin user in new Supabase project
const https = require('https');

const SUPABASE_URL = 'https://mkmqhnyobnqwhfnoekwq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbXFobnlvYm5xd2hmbm9la3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzODk4OSwiZXhwIjoyMDg5NTE0OTg5fQ.9GnKOI6QzWJB-1d-J60R12lRiLpnQ2GH9Ac6Jy292oQ';

function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
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

async function main() {
  const email = 'Danielacz@biosolve.com.pe';
  const password = 'Cbnmpp2344&&';
  const nombre = 'Daniela';
  const apellido = 'Carreon';
  const role = 'admin';

  console.log(`Creating user: ${email} (${nombre} ${apellido}) as ${role}...`);

  // 1. Create auth user
  const authRes = await makeRequest('/auth/v1/admin/users', 'POST', {
    email,
    password,
    email_confirm: true,
  });

  const userId = authRes.data.id;
  console.log(`Auth user created: ${userId}`);

  // 2. Create usuario profile
  await makeRequest('/rest/v1/usuarios', 'POST', {
    user_id: userId,
    nombre,
    apellido,
    email,
  });
  console.log('Usuario profile created');

  // 3. Assign admin role
  await makeRequest('/rest/v1/user_roles', 'POST', {
    user_id: userId,
    role,
  });
  console.log(`Role assigned: ${role}`);

  console.log('\n=== USER CREATED SUCCESSFULLY ===');
  console.log(`Email: ${email}`);
  console.log(`Role: ${role}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

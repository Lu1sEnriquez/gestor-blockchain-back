require('dotenv').config({ path: '.env.local' });
const pg = require('pg');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function seedUsers() {
  try {
    await client.connect();
    console.log('Conectando y sembrando usuarios...\n');

    const sql = `
      INSERT INTO users (id, "institutionalEmail", "fullName", "institutional_password", "rolesAssigned", "isActive", "createdAt", "updatedAt")
      VALUES 
        ('550e8400-e29b-41d4-a716-446655440001', 'admin@itson.edu.mx', 'Admin Sistema', '$2b$10$JrW7ttCX17jIr4D1ODQhNO4Eu2USyXWQrDe6cCpIVU2HA7Ql2s632', '{ADMIN}', true, NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440002', 'creator@itson.edu.mx', 'Maria Garcia', '$2b$10$/WVvdFVlrZSbkotdhGLAte54iVjZv3F7q.Dv6KHWvvzoeRZOb5FN6', '{CREATOR}', true, NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440003', 'signer@itson.edu.mx', 'Roberto Martinez', '$2b$10$6rtLgvk5V25Q7g02XaC90O5kxHZj/o6WpruXqhHLd2b3UCh5km.Pi', '{SIGNER}', true, NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440004', 'auditor@itson.edu.mx', 'Ana Lucia', '$2b$10$JnoTTeTHOmikhcfEFTDVr.RcASlUc4orjmyMdatnB4GKw2vCvcN06', '{AUDITOR}', true, NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440005', 'multi@itson.edu.mx', 'Carlos Multi', '$2b$10$w34P5F9zzES6NT9Ts6DZYuq0gjglazcBJ.Ii0pVwm1VXvqXvjAjsW', '{ADMIN,CREATOR,SIGNER}', true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `;

    const result = await client.query(sql);
    console.log(`✅ Usuarios insertados: ${result.rowCount} filas`);
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

seedUsers();

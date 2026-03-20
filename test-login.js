require('dotenv').config({ path: '.env.local' });
const pg = require('pg');
const bcrypt = require('bcrypt');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function testLogin() {
  try {
    await client.connect();
    console.log('\n🔐 TESTING LOGIN\n');

    const email = 'admin@itson.edu.mx';
    const password = 'admin123';

    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}\n`);

    // Buscar usuario
    const result = await client.query(
      'SELECT id, "institutionalEmail", "fullName", "institutional_password", "rolesAssigned" FROM users WHERE "institutionalEmail" = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log(`✓ Usuario encontrado:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Nombre: ${user.fullName}`);
    console.log(`  Roles: ${user.rolesAssigned}\n`);

    // Validar password
    console.log('Validando contraseña...');
    const isValid = await bcrypt.compare(password, user.institutional_password);
    
    if (isValid) {
      console.log('✅ Password válido!\n');
      console.log('✅ SPRINT 1 VALIDADA: Login funciona contra BD real');
      console.log('\nReturn value para Auth.js:');
      console.log(JSON.stringify({
        id: user.id,
        email: user.institutionalEmail,
        name: user.fullName,
        roles: user.rolesAssigned,
      }, null, 2));
    } else {
      console.log('❌ Password inválido');
    }

    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testLogin();

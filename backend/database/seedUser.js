// Seed script to create a test user
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database').promisePool;

async function seedTestUser() {
  try {
    console.log('Creating test user...');
    
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234' // Will be hashed
    };
    
    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [testUser.email, testUser.username]
    );
    
    if (existingUsers.length > 0) {
      console.log('Test user already exists!');
      console.log('Email:', testUser.email);
      console.log('Password: Test1234');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [testUser.username, testUser.email, hashedPassword]
    );
    
    console.log('✅ Test user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password: Test1234');
    console.log('👤 Username:', testUser.username);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('You can now login with these credentials!');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    process.exit(0);
  }
}

seedTestUser();


// Migration script to change movie_id from INT to VARCHAR
// This allows storing both database movie IDs and TMDB IDs (tmdb_123 format)

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'cinesense',
      multipleStatements: true
    });

    console.log('Connected to database. Starting migration...');

    // Step 1: Drop foreign key constraints
    console.log('Step 1: Dropping foreign key constraints...');
    try {
      await connection.execute('ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_2');
      console.log('✓ Dropped favorites foreign key');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠ Foreign key already dropped or has different name');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute('ALTER TABLE user_movie_preferences DROP FOREIGN KEY user_movie_preferences_ibfk_2');
      console.log('✓ Dropped user_movie_preferences foreign key');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠ Foreign key already dropped or has different name');
      } else {
        throw err;
      }
    }

    // Step 2: Change movie_id column type to VARCHAR(255)
    console.log('Step 2: Changing movie_id column types...');
    await connection.execute('ALTER TABLE favorites MODIFY COLUMN movie_id VARCHAR(255) NOT NULL');
    console.log('✓ Changed favorites.movie_id to VARCHAR(255)');

    await connection.execute('ALTER TABLE user_movie_preferences MODIFY COLUMN movie_id VARCHAR(255) NOT NULL');
    console.log('✓ Changed user_movie_preferences.movie_id to VARCHAR(255)');

    console.log('\n✅ Migration completed successfully!');
    console.log('Now you can store both database movie IDs (integers) and TMDB IDs (tmdb_123 format)');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run migration
runMigration();


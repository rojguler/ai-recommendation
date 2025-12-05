// Script to add tags column to existing movies table
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cinesense'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL server');
  
  // MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
  connection.query('SHOW COLUMNS FROM movies LIKE "tags"', (err, results) => {
    if (err) {
      console.error('Error checking columns:', err);
      connection.end();
      process.exit(1);
    }
    
    if (results.length === 0) {
      // Column doesn't exist, add it
      connection.query('ALTER TABLE movies ADD COLUMN tags JSON', (err) => {
        if (err) {
          // Check if error is because column already exists (in case of race condition)
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Tags column already exists!');
          } else {
            console.error('Error adding tags column:', err.message);
          }
        } else {
          console.log('Tags column added successfully!');
        }
        connection.end();
        process.exit(0);
      });
    } else {
      console.log('Tags column already exists!');
      connection.end();
      process.exit(0);
    }
  });
});


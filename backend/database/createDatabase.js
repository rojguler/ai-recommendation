// Script to create database and tables
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL server');
  
  // Create database
  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'cinesense'}`, (err) => {
    if (err) {
      console.error('Error creating database:', err);
      connection.end();
      process.exit(1);
    }
    console.log(`Database '${process.env.DB_NAME || 'cinesense'}' created or already exists`);
    
    // Use the database
    connection.query(`USE ${process.env.DB_NAME || 'cinesense'}`, (err) => {
      if (err) {
        console.error('Error using database:', err);
        connection.end();
        process.exit(1);
      }
      
      // Create tables
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, 'schema.sql');
      
      fs.readFile(schemaPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading schema file:', err);
          connection.end();
          process.exit(1);
        }
        
        // Split by semicolons and execute each statement
        const statements = data
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        let completed = 0;
        statements.forEach((statement, index) => {
          if (statement.toLowerCase().includes('create database') || 
              statement.toLowerCase().includes('use ')) {
            completed++;
            if (completed === statements.length) {
              console.log('Database and tables created successfully!');
              connection.end();
              process.exit(0);
            }
            return;
          }
          
          connection.query(statement, (err) => {
            if (err && !err.message.includes('already exists')) {
              console.error(`Error executing statement ${index + 1}:`, err.message);
            }
            completed++;
            if (completed === statements.length) {
              console.log('Database and tables created successfully!');
              connection.end();
              process.exit(0);
            }
          });
        });
      });
    });
  });
});


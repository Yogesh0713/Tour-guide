const mongoose = require('mongoose');

/**
 * Connect to Local MongoDB
 * Make sure MongoDB is running on localhost:27017
 * 
 * To start MongoDB locally:
 * - Windows: Run mongod from Command Prompt
 * - Mac: brew services start mongodb-community
 * - Linux: sudo systemctl start mongod
 * 
 * To verify MongoDB is running:
 * - Windows/Mac/Linux: mongosh or mongo localhost:27017
 */

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tourguide', {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log(`
╔════════════════════════════════════════╗
║   ✅ MongoDB Connected Successfully    ║
╚════════════════════════════════════════╝
Host: ${conn.connection.host}
Port: ${conn.connection.port}
Database: ${conn.connection.name}
    `);
    
    return conn;
  } catch (error) {
    console.error(`
╔════════════════════════════════════════╗
║   ❌ MongoDB Connection Failed          ║
╚════════════════════════════════════════╝
Error: ${error.message}

Make sure MongoDB is running locally:
┌─ WINDOWS ──────────────────────────────┐
│ 1. Download: https://www.mongodb.com   │
│ 2. Install and run mongod.exe          │
│ 3. Server will run on localhost:27017  │
└────────────────────────────────────────┘

┌─ MAC ──────────────────────────────────┐
│ 1. brew install mongodb-community      │
│ 2. brew services start mongodb-community
│ 3. Server will run on localhost:27017  │
└────────────────────────────────────────┘

┌─ LINUX ────────────────────────────────┐
│ 1. sudo apt-get install mongodb        │
│ 2. sudo systemctl start mongod         │
│ 3. Server will run on localhost:27017  │
└────────────────────────────────────────┘

Connection String: mongodb://localhost:27017/tourguide
    `);
    process.exit(1);
  }
};

module.exports = connectDB;

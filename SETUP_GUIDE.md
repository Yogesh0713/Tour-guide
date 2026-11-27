# Tour Guide App - Setup & Installation Guide

## 🗺️ Overview

Tour Guide is a modern web application for exploring nearby landmarks, cafes, temples, and more using an interactive map. This version uses **local MongoDB** instead of MongoDB Atlas.

### Key Features
- ✅ User authentication (register, login)
- ✅ Interactive map with Google Maps
- ✅ Browse nearby places by category
- ✅ Save favorite locations
- ✅ Get directions to places
- ✅ Modern, responsive UI design
- ✅ Dark/light mode support

---

## 📋 Prerequisites

Before installing, ensure you have the following:

### Required Software
1. **Node.js** (v14 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` & `npm --version`

2. **MongoDB** (Local installation)
   - **Windows:** Download from https://www.mongodb.com/try/download/community
   - **Mac:** `brew install mongodb-community`
   - **Linux:** `sudo apt-get install mongodb`

3. **Git** (Optional, for cloning)
   - Download: https://git-scm.com/

### API Keys Required
- **Google Maps API Key**
  - Get from: https://console.cloud.google.com/
  - Already configured in `.env` (optional: use your own)

---

## 🚀 Quick Start (5 minutes)

### Step 1: Extract the Project
```bash
unzip tour-guide-complete.zip
cd tour-guide-complete
```

### Step 2: Start MongoDB (Choose Your OS)

**Windows:**
```cmd
mongod
```
Keep this terminal open. MongoDB will run on `localhost:27017`

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### Step 3: Install Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 4: Start the App
```bash
cd backend
npm start
```

You should see:
```
✅ MongoDB Connected Successfully
Host: localhost
Port: 27017
Database: tourguide

🌍 Tour Guide Server running on http://localhost:5000
```

### Step 5: Open in Browser
```
http://localhost:5000
```

---

## 📁 Project Structure

```
tour-guide-complete/
├── backend/
│   ├── config/
│   │   └── db.js                 (MongoDB connection)
│   ├── models/
│   │   ├── User.js               (User schema)
│   │   ├── Favourite.js          (Favorites schema)
│   │   └── Place.js              (Places schema)
│   ├── routes/
│   │   ├── auth.js               (Authentication routes)
│   │   ├── places.js             (Places routes)
│   │   └── favourites.js         (Favorites routes)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── placesController.js
│   │   └── favouritesController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── .env                      (Environment variables)
│   ├── package.json
│   └── server.js                 (Main backend file)
│
├── frontend/
│   ├── css/
│   │   └── style.css             (NEW: Redesigned UI)
│   ├── js/
│   │   ├── app.js                (Main app logic)
│   │   ├── auth.js               (Authentication)
│   │   ├── map.js                (Google Maps)
│   │   ├── places.js             (Places handling)
│   │   ├── directions.js         (Directions)
│   │   ├── favourites.js         (Favorites)
│   │   └── ui.js                 (UI interactions)
│   ├── index.html                (NEW: Improved HTML)
│   ├── login.html
│   └── register.html
│
├── SETUP_GUIDE.md                (This file)
├── DATABASE_INFO.md              (Database documentation)
└── package.json                  (Root package.json)
```

---

## 🔧 Configuration

### Environment Variables (.env)

The `.env` file is already configured for local MongoDB:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/tourguide
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID
```

### To Change Configuration
1. Open `backend/.env`
2. Modify any values as needed
3. Restart the server

**Warning:** Never commit `.env` to version control (credentials inside)

---

## 🗄️ Database Setup

### MongoDB Collections

The app automatically creates two collections:

**1. Users Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

**2. Favourites Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  osmId: String,
  name: String,
  category: String,
  location: { type: "Point", coordinates: [lon, lat] },
  address: String,
  tags: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Verify MongoDB

Open another terminal and check MongoDB:

```bash
# Windows/Mac/Linux:
mongosh
# or older version:
mongo

# In the shell:
show dbs
use tourguide
show collections
db.users.find()
db.favourites.find()
```

---

## 🎨 UI Design Updates

### What's New in the UI

The frontend has been completely redesigned with:

1. **Color Scheme**
   - Warm terracotta primary (#d97757)
   - Exploration green accent (#2d8a6b)
   - Warm beige backgrounds (#faf9f7)

2. **Typography**
   - System font stack for better performance
   - Intentional hierarchy and spacing
   - Better readability

3. **Layout Improvements**
   - Generous, breathable spacing
   - Better component structure
   - Improved sidebar design

4. **Mobile Responsive**
   - Works perfectly on all devices
   - Touch-friendly buttons (44×44px)
   - Optimized for mobile first

5. **Animations**
   - Purposeful, smooth transitions
   - No gratuitous effects
   - Respects reduced motion preferences

6. **Dark Mode**
   - Carefully tuned dark theme
   - Full dark mode support
   - Toggle in navbar

See `DESIGN_DOCUMENTATION.md` for detailed design improvements.

---

## 📱 Testing the App

### Register a New User
1. Navigate to http://localhost:5000
2. Click "Register"
3. Fill in name, email, password
4. Click "Sign Up"

### Login
1. Enter email and password
2. Click "Login"
3. You'll be redirected to the map view

### Explore Places
1. Use category buttons (Temples, Cafes, etc.)
2. Adjust search radius with slider
3. Click on places to see details
4. Use "Get Directions" button
5. Click star (★) to save as favorite

### View Favorites
1. Scroll to "My Favourites" section
2. Click on saved places
3. Delete by clicking trash icon

### Toggle Dark Mode
1. Click moon icon (🌙) in navbar
2. UI switches to dark theme

---

## 🐛 Troubleshooting

### Issue: "MongoDB connection error"

**Solution 1: Start MongoDB**
```bash
# Windows
mongod

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Solution 2: Check Connection String**
```bash
# Verify MongoDB is running
mongosh
# Should connect to localhost:27017
```

**Solution 3: Reset MongoDB**
```bash
# Stop MongoDB
mongod --shutdown

# Start fresh
mongod
```

### Issue: "Port 5000 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

Or change port in `.env`:
```env
PORT=5001
```

### Issue: "Cannot find module 'mongoose'"

**Solution:**
```bash
cd backend
npm install
```

### Issue: "Google Maps not loading"

**Solution:**
1. Check Google Maps API key in `.env`
2. Verify API is enabled in Google Cloud Console
3. Check network connection

---

## 🔒 Security Notes

### Current Setup
- ✅ Passwords hashed with bcryptjs (12 salt rounds)
- ✅ JWT authentication (7-day expiry)
- ✅ Environment variables for secrets
- ✅ MongoDB validation schemas

### Production Recommendations
Before deploying to production:
1. Change JWT_SECRET to a strong random key
2. Use environment variables (not hardcoded)
3. Enable HTTPS/SSL
4. Set up proper MongoDB authentication
5. Implement rate limiting
6. Add CORS whitelist
7. Use production-grade hosting
8. Enable database backups

---

## 🚀 Development Commands

### Start Development Server (with auto-reload)
```bash
cd backend
npm run dev
```
Requires `nodemon` (already installed)

### Build for Production
```bash
cd backend
npm start
```

### Run Tests
```bash
cd backend
npm test
```
(Tests not included in this version)

### Access MongoDB Shell
```bash
mongosh
use tourguide
show collections
```

---

## 📊 Database Operations

### Backup MongoDB
```bash
mongodump --db tourguide --out ./backup
```

### Restore MongoDB
```bash
mongorestore --db tourguide ./backup/tourguide
```

### Clear Database
```bash
# In mongosh
use tourguide
db.users.deleteMany({})
db.favourites.deleteMany({})
```

---

## 🌐 Deployment Options

### Local Development
Currently configured for local MongoDB (included in this package)

### Cloud Deployment
To deploy to production, consider:

**Option 1: Node.js Hosting + Cloud MongoDB**
- Hosts: Heroku, Railway, Render
- Database: MongoDB Atlas (free tier available)

**Option 2: Containers (Docker)**
```dockerfile
# Dockerfile already compatible
docker build -t tour-guide .
docker run -p 5000:5000 tour-guide
```

**Option 3: Serverless**
- AWS Lambda, Google Cloud Functions
- Requires serverless framework setup

---

## 📞 Support & Resources

### Official Documentation
- **Node.js:** https://nodejs.org/docs/
- **Express:** https://expressjs.com/
- **Mongoose:** https://mongoosejs.com/
- **MongoDB:** https://docs.mongodb.com/

### Google Maps API
- **Console:** https://console.cloud.google.com/
- **Documentation:** https://developers.google.com/maps

### Community Help
- Stack Overflow: Tag with `mongodb` `express` `node.js`
- MongoDB Community: https://www.mongodb.com/community/forums/

---

## 📝 License

This project is provided as-is for educational and commercial use.

---

## ✅ Checklist

Before deploying:

- [ ] MongoDB is installed and running
- [ ] Node.js v14+ is installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] App runs without errors (`npm start`)
- [ ] Can register new users
- [ ] Can login with credentials
- [ ] Map displays and loads places
- [ ] Can add/remove favorites
- [ ] Dark mode works
- [ ] Mobile responsive on small screens
- [ ] All buttons respond to clicks

---

## 🎉 Success!

If you see this message when starting the app:
```
✅ MongoDB Connected Successfully
🌍 Tour Guide Server running on http://localhost:5000
```

Your Tour Guide app is ready to use! 🗺️

Open http://localhost:5000 in your browser and start exploring!

---

**Questions?** Check the detailed documentation files included in the project:
- `DATABASE_INFO.md` — Database structure and queries
- `DESIGN_DOCUMENTATION.md` — UI design details
- `CSS_CUSTOMIZATION_GUIDE.md` — How to customize colors/styles

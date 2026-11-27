> **First-time setup:** copy `backend/.env.example` to `backend/.env` and fill in your own `GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY` (optional) and `JWT_SECRET`. Never share your `.env` file.

# 🗺️ Tour Guide - Explore Nearby Places

A modern, full-stack web application for discovering and exploring nearby landmarks, cafes, temples, restaurants, and more using an interactive map.

## ✨ Features

- 🗺️ **Interactive Google Maps** - Browse nearby locations with real-time mapping
- 🔍 **Smart Search** - Filter by categories (temples, cafes, restaurants, hotels, etc.)
- 📍 **Proximity Search** - Adjust search radius to find places nearby
- ⭐ **Favorites System** - Save your favorite places for quick access
- 🧭 **Directions** - Get turn-by-turn directions to any location
- 👤 **User Authentication** - Secure register and login
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🎨 **Modern UI** - Beautiful, user-friendly interface with warm color scheme

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **JavaScript** - Interactive frontend logic
- **Google Maps API** - Interactive mapping

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Local database
- **Mongoose** - Database ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## 📋 Prerequisites

- **Node.js** v14+ ([Download](https://nodejs.org/))
- **MongoDB** Local installation
  - Windows: [Download](https://www.mongodb.com/try/download/community)
  - Mac: `brew install mongodb-community`
  - Linux: `sudo apt-get install mongodb`
- **Google Maps API Key** (optional, included but recommend your own)

## 🚀 Quick Start

### 1. Extract and Navigate
```bash
unzip tour-guide-complete.zip
cd tour-guide-complete
```

### 2. Start MongoDB
```bash
# Windows
mongod

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Start the Server
```bash
npm start
```

### 5. Open in Browser
```
http://localhost:5000
```

That's it! Start exploring. 🎉

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed installation and setup instructions
- **[DATABASE_DOCUMENTATION.md](./DATABASE_DOCUMENTATION.md)** - Database schema and operations
- **[DESIGN_DOCUMENTATION.md](./DESIGN_DOCUMENTATION.md)** - UI/UX design details
- **[CSS_CUSTOMIZATION_GUIDE.md](./CSS_CUSTOMIZATION_GUIDE.md)** - How to customize colors and styles

## 🎨 UI Design Highlights

The app features a modern, distinctive design with:
- **Warm Color Palette** - Terracotta primary (#d97757) with exploration green accents (#2d8a6b)
- **Intentional Typography** - Clear hierarchy with system fonts
- **Generous Spacing** - Breathable layouts and good readability
- **Smooth Animations** - Purposeful micro-interactions
- **Dark Mode Support** - Carefully tuned dark theme
- **Mobile Responsive** - Perfect on all device sizes

## 📁 Project Structure

```
tour-guide-complete/
├── backend/                    # Node.js + Express server
│   ├── config/                # Configuration files
│   ├── models/                # MongoDB schemas (User, Favourite)
│   ├── routes/                # API routes
│   ├── controllers/           # Business logic
│   ├── middleware/            # Auth, error handling
│   ├── .env                   # Environment variables
│   └── server.js              # Main server file
│
├── frontend/                  # Client-side application
│   ├── css/                   # Stylesheets
│   ├── js/                    # JavaScript modules
│   ├── index.html             # Main app (map view)
│   ├── login.html             # Login page
│   └── register.html          # Registration page
│
├── SETUP_GUIDE.md             # Installation guide
├── DATABASE_DOCUMENTATION.md  # Database info
├── DESIGN_DOCUMENTATION.md    # UI design details
└── README.md                  # This file
```

## 🔑 Key API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Places
- `GET /api/places?category=temple` - Get places by category
- `GET /api/places/search?q=restaurant` - Search places

### Favorites
- `GET /api/favourites` - Get user's favorites
- `POST /api/favourites` - Add to favorites
- `DELETE /api/favourites/:id` - Remove from favorites

## 🌍 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Favourites Collection
```javascript
{
  userId: ObjectId (ref: User),
  osmId: String,
  name: String,
  category: String,
  location: { type: "Point", coordinates: [lon, lat] },
  address: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Features

✅ Password hashing with bcryptjs (12 salt rounds)
✅ JWT authentication (7-day token expiry)
✅ Environment variables for sensitive data
✅ MongoDB schema validation
✅ CORS protection
✅ Error handling middleware

## 🎯 Usage Guide

### Register
1. Click "Register" on login page
2. Enter name, email, password
3. Click "Sign Up"
4. Automatically logged in

### Login
1. Enter email and password
2. Click "Login"
3. Redirected to map view

### Explore Places
1. Select category (Temples, Cafes, etc.)
2. Adjust search radius with slider
3. Click on place cards or map markers
4. View place details in modal

### Save Favorites
1. Click star (★) on place card or modal
2. Place saved to "My Favourites"
3. View favorites in sidebar

### Get Directions
1. Open place details
2. Click "Get Directions"
3. View turn-by-turn directions
4. Click "Clear" to close

### Toggle Dark Mode
1. Click moon icon (🌙) in navbar
2. App switches to dark theme

## 🛠️ Customization

### Change Colors
Edit `frontend/css/style.css`:
```css
:root {
  --primary-warm: #d97757;        /* Primary brand color */
  --accent-exploration: #2d8a6b;  /* Secondary accent */
  --bg-primary: #faf9f7;          /* Main background */
}
```

### Change Port
Edit `backend/.env`:
```env
PORT=5001
```

### Change Database
Edit `backend/.env`:
```env
MONGO_URI=mongodb://localhost:27017/your_database_name
```

For detailed customization, see `CSS_CUSTOMIZATION_GUIDE.md`

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
mongod  # Windows
brew services start mongodb-community  # Mac
```

### Port Already in Use
```bash
# Change port in .env
PORT=5001
```

### Dependencies Not Installed
```bash
cd backend
npm install
```

For more troubleshooting, see `SETUP_GUIDE.md`

## 📚 Learning Resources

- **MongoDB:** https://docs.mongodb.com/
- **Mongoose:** https://mongoosejs.com/
- **Express:** https://expressjs.com/
- **Google Maps API:** https://developers.google.com/maps
- **JWT:** https://jwt.io/

## 🚀 Deployment

This project is configured for local development. To deploy:

1. **Choose hosting** (Heroku, Railway, Render, etc.)
2. **Set up cloud database** (MongoDB Atlas, etc.)
3. **Update .env variables** for production
4. **Push code** to hosting platform
5. **Configure environment** on hosting

See deployment sections in `SETUP_GUIDE.md` for details.

## 📞 Support

- Check documentation files included in project
- Review error messages in browser console
- Check server logs in terminal
- Search MongoDB docs for database issues

## 📝 License

This project is provided for educational and commercial use.

---

## 🎉 Get Started

1. **Extract** the zip file
2. **Start MongoDB** on your machine
3. **Install** dependencies (`npm install`)
4. **Start** the app (`npm start`)
5. **Open** http://localhost:5000
6. **Register** and start exploring!

**Happy exploring!** 🗺️✨

---

**Made with ❤️ for travel enthusiasts and location explorers**

For detailed setup instructions, see `SETUP_GUIDE.md`

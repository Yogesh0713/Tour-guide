# Tour Guide Project — Database Documentation

## Database Overview

### **Database: MongoDB** (NoSQL)
**ODM/Driver:** Mongoose 8.4.0
**Hosting:** MongoDB Atlas (Cloud)

---

## Connection Details

### Environment Variables
```env
MONGO_URI=mongodb://localhost:27017/tourguide
```

**Components:**
- **Host:** `yogesh.cgvijkp.mongodb.net` (MongoDB Atlas cluster)
- **Database:** `tourguide`
- **Protocol:** `mongodb+srv` (SRV connection string)
- **Features:** Automatic retry writes enabled, majority write concern

---

## Database Schema

### **Collection 1: Users**

**Schema Name:** `User`
**Purpose:** Store user account information

```javascript
{
  _id: ObjectId (auto-generated),
  name: String (required, max 50 chars),
  email: String (required, unique, lowercase),
  password: String (hashed with bcryptjs, min 6 chars),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

**Indexes:**
- `_id` (primary key)
- `email` (unique index)

**Example Document:**
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2a$12$K1ByV.GtMflMVTged9PFm...",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Password Security:**
- Hashed using `bcryptjs` (salt rounds: 12)
- Never stored in plaintext
- Hashed before saving to database
- Compared using `matchPassword()` method during login

---

### **Collection 2: Favourites**

**Schema Name:** `Favourite`
**Purpose:** Store user's saved/favorited places

```javascript
{
  _id: ObjectId (auto-generated),
  userId: ObjectId (reference to User, required),
  osmId: String (OpenStreetMap ID, required),
  name: String (place name, required),
  category: String (temple, cafe, restaurant, etc., required),
  location: {
    type: "Point" (GeoJSON type),
    coordinates: [longitude, latitude] (required)
  },
  address: String (optional),
  tags: Object (additional attributes),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

**Indexes:**
- `userId` + `osmId` (unique compound index - prevents duplicate saves)
- `location` (2dsphere geospatial index for proximity queries)

**Example Document:**
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "osmId": "34567890",
  "name": "Sri Mahakaleshwar Temple",
  "category": "temple",
  "location": {
    "type": "Point",
    "coordinates": [75.8289, 23.1815]
  },
  "address": "Ujjain, Madhya Pradesh, India",
  "tags": {
    "opening_hours": "Morning to Evening",
    "rating": 4.5
  },
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

## Data Relationships

### User → Favourites (One-to-Many)
```
One User can have Many Favourite places
└─ userId field in Favourite collection references User._id
└─ Use population for querying: .populate('userId')
```

**Example Query:**
```javascript
// Get all favorites for a user with user details
Favourite.find({ userId: userId }).populate('userId')
```

---

## Geospatial Features

### 2dsphere Index
The `location` field uses a **2dsphere geospatial index** for location-based queries.

**Capabilities:**
- ✅ Find places within a radius (km)
- ✅ Sort by distance
- ✅ Geospatial queries on spherical earth model

**Example Query (Find favorites within 5km):**
```javascript
Favourite.find({
  userId: userId,
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      $maxDistance: 5000 // meters
    }
  }
})
```

---

## Backend Dependencies

### Database-Related Packages

| Package | Version | Purpose |
|---------|---------|---------|
| **mongoose** | ^8.4.0 | MongoDB ODM (Object Data Modeling) |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **dotenv** | ^16.4.5 | Environment variables |
| **express** | ^4.19.2 | Web framework |
| **cors** | ^2.8.5 | Cross-origin requests |
| **jsonwebtoken** | ^9.0.2 | JWT authentication |

### Installation

```bash
npm install mongoose bcryptjs dotenv express cors jsonwebtoken
```

---

## Backend Database Connection

### File: `backend/config/db.js`

The connection is handled in a separate config file:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

**Called in:** `server.js` line 8
```javascript
connectDB();
```

---

## Database Operations

### Authentication (User Collection)

**Register User:**
```javascript
// backend/controllers/authController.js
const user = new User({ name, email, password });
await user.save(); // Password auto-hashed via middleware
```

**Login User:**
```javascript
const user = await User.findOne({ email }).select('+password');
const isMatch = await user.matchPassword(enteredPassword);
if (isMatch) { /* Create JWT */ }
```

**Get User by ID:**
```javascript
const user = await User.findById(userId);
```

---

### Favorites Management (Favourite Collection)

**Add Favorite:**
```javascript
// backend/controllers/favouritesController.js
const favorite = new Favourite({
  userId,
  osmId,
  name,
  category,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address,
  tags
});
await favorite.save();
```

**Get User Favorites:**
```javascript
const favorites = await Favourite.find({ userId })
  .populate('userId')
  .sort({ createdAt: -1 });
```

**Delete Favorite:**
```javascript
await Favourite.findByIdAndDelete(favoriteId);
// Or by osmId:
await Favourite.deleteOne({ userId, osmId });
```

**Get Nearby Favorites:**
```javascript
const nearbyFavorites = await Favourite.find({
  userId,
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [currentLon, currentLat]
      },
      $maxDistance: radiusInMeters
    }
  }
});
```

---

## API Endpoints (Database Operations)

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Operation | Database Action |
|--------|----------|-----------|-----------------|
| POST | `/register` | Create account | Insert User document |
| POST | `/login` | Authenticate | Query User by email |
| GET | `/profile` | Get user info | Query User by ID (JWT auth) |

### Favorites Routes (`/api/favourites`)

| Method | Endpoint | Operation | Database Action |
|--------|----------|-----------|-----------------|
| GET | `/` | List favorites | Query all Favourite docs for user |
| POST | `/` | Add favorite | Insert Favourite document |
| DELETE | `/:id` | Remove favorite | Delete Favourite by ID |
| GET | `/nearby` | Nearby favorites | Geospatial query |

---

## Environment Variables (Database)

### Production Settings
```env
# MongoDB Atlas connection
MONGO_URI=mongodb://localhost:27017/tourguide

# JWT for authentication
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# Server
PORT=5000
```

### Important Notes:
- **Never commit `.env` to Git** (contains credentials)
- Change `MONGO_URI` credentials in production
- Use strong `JWT_SECRET`
- Keep API keys confidential

---

## Database Indexing Strategy

### Current Indexes

**User Collection:**
- `_id` — Primary key (auto)
- `email` — Unique, for fast login lookups

**Favourite Collection:**
- `_id` — Primary key (auto)
- `userId` + `osmId` — Compound unique index (prevents duplicates)
- `location` — 2dsphere geospatial index (proximity searches)

### Query Performance

**Indexes Improve Speed:**
- ✅ User login by email (indexed)
- ✅ Finding user favorites (indexed by userId)
- ✅ Preventing duplicate favorites (unique compound index)
- ✅ Nearby places search (geospatial index)

---

## Backup & Recovery

### MongoDB Atlas Backups
- **Automatic backups:** Every 12 hours
- **Retention:** 35 days
- **Restore:** Via MongoDB Atlas web console

### Manual Backup Command:
```bash
# Export MongoDB data
mongodump --uri "mongodb://localhost:27017/tourguide"

# Restore MongoDB data
mongorestore --uri "mongodb://localhost:27017/tourguide" ./dump
```

---

## Scalability Considerations

### Current Setup
- **Single cluster:** `yogesh.cgvijkp.mongodb.net`
- **Single database:** `tourguide`
- **Storage:** Cloud-managed (auto-scaling)

### Future Scaling
- **Sharding:** Distribute data across multiple shards
- **Read replicas:** Add read-only nodes
- **Connection pooling:** Increase max connections
- **Archive old data:** Move historical favorites to archive collection

---

## Security Best Practices

### ✅ Currently Implemented
- **Password hashing:** bcryptjs with 12 salt rounds
- **Unique emails:** Prevents duplicate accounts
- **Environment variables:** Credentials not in code
- **JWT tokens:** Authentication for API requests
- **Compound index:** Prevents duplicate favorite saves

### 🔒 Recommended Additions
- **Database user roles:** Limited permissions for app user
- **IP whitelist:** Only allow app server IPs
- **Encryption at rest:** Enable in MongoDB Atlas
- **Audit logging:** Track data modifications
- **Regular backups:** Verify restore capability
- **Update Mongoose:** Keep ODM updated for security patches

---

## Troubleshooting

### Common Issues

**Issue: Connection Failed**
```
Error: connect ENOTFOUND yogesh.cgvijkp.mongodb.net
```
**Solutions:**
- ✓ Check internet connection
- ✓ Verify MONGO_URI in .env file
- ✓ Whitelist your IP in MongoDB Atlas
- ✓ Check if credentials are correct

**Issue: Unique Index Violation**
```
Error: E11000 duplicate key error
```
**Solutions:**
- ✓ Check if email already exists (User collection)
- ✓ Check if user already favorited place (Favourite collection)
- ✓ Handle the error in frontend (show user message)

**Issue: Password Mismatch**
```
Login fails but credentials look correct
```
**Solutions:**
- ✓ Ensure `select: false` is removed for login query
- ✓ Use `.select('+password')` when querying for login
- ✓ Verify password hasn't expired/changed

---

## Database Monitoring

### MongoDB Atlas Console
- **Access:** https://cloud.mongodb.com/
- **Monitor:** Real-time metrics, slow queries, storage usage
- **Alerts:** Set up notifications for issues

### Metrics to Watch
- **Connection count:** Active connections
- **Query performance:** Operations per second
- **Storage usage:** Data size growth
- **CPU & memory:** Server resource usage

---

## Migration & Upgrades

### Upgrading MongoDB Version
```bash
# In MongoDB Atlas:
1. Go to "Cluster" → "Upgrade Version"
2. Select target version
3. Choose downtime window (can be zero-downtime)
4. Click "Upgrade"
```

### Adding New Field to Schema
```javascript
// 1. Update Mongoose schema
const userSchema = new mongoose.Schema({
  // ... existing fields
  phone: { type: String, default: '' }  // New field
});

// 2. Existing documents auto-get default value
// 3. No migration needed (flexible schema)
```

### Data Migration Example
```javascript
// Migrate all favorites to add new field
db.Favourite.updateMany(
  { newField: { $exists: false } },
  { $set: { newField: "defaultValue" } }
)
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Database** | MongoDB (NoSQL) |
| **Hosting** | MongoDB Atlas (Cloud) |
| **ODM** | Mongoose 8.4.0 |
| **Collections** | Users, Favourites |
| **Geospatial** | 2dsphere indexes for location queries |
| **Authentication** | bcryptjs + JWT |
| **Indexes** | Email, compound unique, geospatial |
| **Backup** | Automatic (35-day retention) |
| **Scalability** | Cloud auto-scaling |

---

## Next Steps

1. **Review Connection:** Verify MONGO_URI in `.env`
2. **Test Queries:** Run sample queries in MongoDB Atlas console
3. **Monitor:** Set up alerts in MongoDB Atlas
4. **Backup:** Test backup/restore process
5. **Security:** Consider implementing recommendations above

---

**Your Tour Guide app uses MongoDB's flexible schema and powerful geospatial features to store user accounts and location-based favorites efficiently!** 🗺️📍

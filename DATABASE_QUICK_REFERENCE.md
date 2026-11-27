# Tour Guide Database — Quick Reference

## 🎯 One-Liner Summary
**MongoDB** database hosted on **MongoDB Atlas** with **Mongoose** ODM, storing **User** accounts and **Favourite** places with geospatial indexing.

---

## 📊 Database Structure at a Glance

```
MongoDB Atlas Cluster (yogesh.cgvijkp.mongodb.net)
└── Database: tourguide
    ├── Collection: users
    │   ├── _id (ObjectId)
    │   ├── name (String)
    │   ├── email (String, unique)
    │   ├── password (String, hashed)
    │   ├── createdAt (Date)
    │   └── updatedAt (Date)
    │
    └── Collection: favourites
        ├── _id (ObjectId)
        ├── userId (ObjectId → ref User)
        ├── osmId (String)
        ├── name (String)
        ├── category (String)
        ├── location (GeoJSON Point)
        ├── address (String)
        ├── tags (Object)
        ├── createdAt (Date)
        └── updatedAt (Date)
```

---

## 🔑 Quick Facts

| Item | Value |
|------|-------|
| **Database Type** | NoSQL (Document) |
| **Service** | MongoDB Atlas (Cloud) |
| **Connection String** | `mongodb://localhost:27017/tourguide` |
| **ODM Library** | Mongoose 8.4.0 |
| **Password Hashing** | bcryptjs (salt rounds: 12) |
| **Authentication** | JWT (7 days expiry) |
| **Collections** | 2 (users, favourites) |
| **Indexes** | Email, compound unique, geospatial |
| **Backups** | Automatic (every 12 hours, 35-day retention) |

---

## 📝 Sample Data

### User Document
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "Yogesh Kumar",
  "email": "yogesh@example.com",
  "password": "$2a$12$K1ByV.GtMflMVTged9PFm...",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Favourite Document
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
  "tags": {"opening_hours": "Morning to Evening", "rating": 4.5},
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

## 🔗 Collection Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  name: String (required, max 50),
  email: String (required, unique, lowercase),
  password: String (required, hashed, min 6),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `_id` (primary), `email` (unique)

### Favourites Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  osmId: String (required),
  name: String (required),
  category: String (required),
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: String,
  tags: Object,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `_id` (primary)
- `userId + osmId` (unique compound)
- `location` (2dsphere geospatial)

---

## 🚀 Common Operations

### User Authentication

```javascript
// REGISTER
const user = new User({ name, email, password });
await user.save(); // Auto-hashes password

// LOGIN
const user = await User.findOne({ email }).select('+password');
const isValid = await user.matchPassword(enteredPassword);

// GET PROFILE
const user = await User.findById(userId);
```

### Manage Favorites

```javascript
// ADD FAVORITE
const fav = new Favourite({
  userId, osmId, name, category,
  location: { type: "Point", coordinates: [lon, lat] },
  address, tags
});
await fav.save();

// GET ALL FAVORITES
const favs = await Favourite.find({ userId });

// FIND NEARBY FAVORITES (within radius)
const nearby = await Favourite.find({
  userId,
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [lon, lat] },
      $maxDistance: 5000 // meters
    }
  }
});

// DELETE FAVORITE
await Favourite.findByIdAndDelete(favId);
```

---

## 🌍 Geospatial Features

### 2dsphere Index
Enables **proximity-based searches** for finding places near current location.

```javascript
// Find places within 5km
Favourite.find({
  userId: userId,
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [currentLon, currentLat]
      },
      $maxDistance: 5000  // 5km in meters
    }
  }
})
```

---

## 🔐 Security Features

✅ **Passwords:** Hashed with bcryptjs (12 salt rounds)
✅ **Unique Emails:** No duplicate accounts
✅ **JWT:** Secure token-based authentication
✅ **Compound Index:** Prevents duplicate favorites
✅ **Environment Variables:** Credentials not in code

---

## 📥 Environment Variables (Set in .env)

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/tourguide

# JWT Settings
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d

# Server
PORT=5000

# Google Maps (for directions)
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID
```

⚠️ **Never commit .env file to Git!**

---

## 🛠️ Database Management

### Access MongoDB Atlas
1. Go to https://cloud.mongodb.com/
2. Login with account credentials
3. Select **tourguide** cluster
4. Browse collections in **Collections** tab

### View Collections
```javascript
// In MongoDB Shell/Compass
show dbs              // List databases
use tourguide         // Select database
show collections      // List collections
db.users.find()       // View all users
db.favourites.find()  // View all favorites
```

### Monitor Performance
- **Connections:** See active connections
- **Query Performance:** Analyze slow queries
- **Storage:** Track database size
- **CPU/Memory:** Monitor server resources

---

## 📊 Data Relationships

```
User (1) ──── (Many) Favourite
└─ userId field references User._id
└─ One user can have multiple favorites
```

**Query with Population:**
```javascript
// Get all favorites with full user details
Favourite.find({ userId }).populate('userId')

// Returns:
[
  {
    _id: ObjectId(...),
    userId: {
      _id: ObjectId(...),
      name: "Yogesh",
      email: "yogesh@..."
    },
    name: "Temple",
    category: "temple",
    ...
  }
]
```

---

## 🔍 Troubleshooting

### Connection Issues
```bash
# Check if MONGO_URI is correct
echo $MONGO_URI

# Verify cluster is running (MongoDB Atlas console)
# Whitelist your IP in MongoDB Atlas → Network Access
```

### Duplicate Entry Error
```
E11000 duplicate key error collection: tourguide.favourites index: userId_1_osmId_1
```
**Fix:** User already favorited this place. Handle in frontend.

### Query Timeouts
```
Query timed out
```
**Fix:** Ensure geospatial index exists: `favourites.location` has 2dsphere

### Password Issues
```
Login fails with correct credentials
```
**Fix:** Ensure `.select('+password')` is used when querying for login

---

## 📈 Collection Query Examples

### Find User by Email
```javascript
User.findOne({ email: "yogesh@example.com" })
```

### Count User's Favorites
```javascript
Favourite.countDocuments({ userId: userId })
```

### Get Top Categories
```javascript
db.favourites.aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Find Recently Added Favorites
```javascript
Favourite.find({ userId })
  .sort({ createdAt: -1 })
  .limit(10)
```

### Search by Address
```javascript
Favourite.find({
  userId,
  address: { $regex: "Ujjain", $options: "i" }
})
```

---

## 🔄 Data Export/Import

### Export Data
```bash
mongoexport --uri "mongodb://localhost:27017/tourguide" \
  --collection users \
  --out users.json
```

### Import Data
```bash
mongoimport --uri "mongodb://localhost:27017/tourguide" \
  --collection users \
  --file users.json
```

---

## 📚 Useful Links

- **MongoDB Docs:** https://docs.mongodb.com/
- **Mongoose Docs:** https://mongoosejs.com/
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **Geospatial Queries:** https://docs.mongodb.com/manual/geospatial-queries/

---

## ✅ Checklist for Operations

- [ ] Database connection working
- [ ] Users can register (password hashed)
- [ ] Users can login (password validation)
- [ ] Users can add favorites (no duplicates)
- [ ] Users can find nearby places (geospatial query)
- [ ] Users can view/delete favorites
- [ ] Backups are running
- [ ] Monitoring alerts set up
- [ ] Connection pooling optimized
- [ ] Indexes verified

---

**🗺️ Your Tour Guide app stores user accounts and favorite locations in MongoDB Atlas with powerful geospatial search capabilities!**

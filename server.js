// ======================= IMPORTS & SETUP =======================
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ======================= MONGODB CONNECTION =======================
mongoose
  .connect("mongodb://127.0.0.1:27017/bloodconnect", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ======================= SCHEMAS =======================
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  dob: String,
  weight: String,
  aadhar: String,
  phone: String,
  gender: String,
  blood_type: String,
  address: String,
  password: String,
  profile_picture: String,
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  lastUpdated: { type: Date, default: null },

  donationCount: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  lastDonationDate: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);

const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});
const Feedback = mongoose.model("Feedback", feedbackSchema);

const bloodRequestSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  bloodType: String,
  quantity: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now },
});
const BloodRequest = mongoose.model("BloodRequest", bloodRequestSchema);

// ======================= AUTH ROUTES =======================

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const {
      first_name, last_name, email, dob, weight, aadhar,
      phone, gender, blood_type, address, password,
    } = req.body;

    if (!first_name || !last_name || !email || !dob || !weight || !aadhar ||
        !phone || !gender || !blood_type || !address || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      first_name, last_name, email, dob, weight, aadhar, phone,
      gender, blood_type, address, password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
    res.status(200).json({ message: "Login successful", token, email: user.email });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ======================= USER PROFILE =======================
app.get("/api/user/profile", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/user/profile", async (req, res) => {
  try {
    const { email, ...updates } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
    const updatedUser = await User.findOneAndUpdate({ email }, updates, { new: true }).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================= FEEDBACK =======================
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ message: "All fields are required" });

    await new Feedback({ name, email, message }).save();
    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================= BLOOD REQUEST =======================
app.post("/api/blood-request", async (req, res) => {
  try {
    const { name, email, phone, bloodType, quantity, notes } = req.body;
    if (!name || !email || !phone || !bloodType || !quantity)
      return res.status(400).json({ message: "All required fields must be filled" });

    await new BloodRequest({ name, email, phone, bloodType, quantity, notes }).save();
    res.status(201).json({ message: "Blood request submitted successfully" });
  } catch (error) {
    console.error("Blood Request Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================= DONORS (ALL USERS) =======================
// ======================= ALL DONORS =======================
app.get("/api/donors", async (req, res) => {
  try {
    const users = await User.find({}, {
      first_name: 1,
      last_name: 1,
      blood_type: 1,
      phone: 1,
      address: 1,
      email: 1,
      _id: 0
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Fetch All Donors Error:", error);
    res.status(500).json({ message: "Server error while fetching donors" });
  }
});


// ======================= LIVE LOCATION =======================
app.post("/api/update-location", async (req, res) => {
  try {
    const { email, latitude, longitude } = req.body;
    if (!email || latitude == null || longitude == null)
      return res.status(400).json({ message: "Email and location are required" });

    const user = await User.findOneAndUpdate(
      { email },
      { latitude, longitude, lastUpdated: new Date() },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    console.error("Update Location Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/all-locations", async (req, res) => {
  try {
    const users = await User.find(
      { latitude: { $ne: null }, longitude: { $ne: null } },
      { first_name: 1, last_name: 1, blood_type: 1, latitude: 1, longitude: 1, email: 1, _id: 0 }
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("Fetch Locations Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================= DONATIONS, BADGES & LEADERBOARD =======================
app.post("/api/donate", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.donationCount += 1;
    user.points += 10;
    user.lastDonationDate = new Date();

    // Assign badges
    if (user.donationCount === 1 && !user.badges.includes("First Donation"))
      user.badges.push("First Donation");
    if (user.donationCount === 5 && !user.badges.includes("Frequent Donor"))
      user.badges.push("Frequent Donor");
    if (user.donationCount === 10 && !user.badges.includes("Life Saver"))
      user.badges.push("Life Saver");
    if (user.donationCount >= 20 && !user.badges.includes("Legendary Donor"))
      user.badges.push("Legendary Donor");

    await user.save();
    res.status(200).json({ message: "Donation simulated successfully", user });
  } catch (err) {
    console.error("Donation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const topDonors = await User.find({}, {
      first_name: 1,
      last_name: 1,
      points: 1,
      donationCount: 1,
      badges: 1,
      _id: 0,
    }).sort({ points: -1 }).limit(10);

    res.status(200).json(topDonors);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
});

// ======================= DEMO USER =======================
async function seedDemoUser() {
  const existing = await User.findOne({ email: "demo@blood.com" });
  if (existing) return;

  const hashed = await bcrypt.hash("password", 10);
  const demoUser = new User({
    first_name: "Demo",
    last_name: "User",
    email: "demo@blood.com",
    dob: "1990-01-01",
    weight: "60",
    aadhar: "123456789012",
    phone: "9999999999",
    gender: "Other",
    blood_type: "A+",
    address: "Demo Address",
    password: hashed,
  });

  await demoUser.save();
  console.log("✅ Demo user created: demo@blood.com / password");
}
seedDemoUser();

// ======================= START SERVER =======================
app.listen(PORT, () => {
  console.log("🚀 Server running at http://localhost:" + PORT);
});

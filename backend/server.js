require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for frontend integration

// 1. Database Connection
// Use process.env.MONGO_URI in production
const mongoURI = 'mongodb://nhducjob_db_user:IybmBrCS6WjBocYx@ac-w9ipkd3-shard-00-00.skdwjrt.mongodb.net:27017,ac-w9ipkd3-shard-00-01.skdwjrt.mongodb.net:27017,ac-w9ipkd3-shard-00-02.skdwjrt.mongodb.net:27017/?ssl=true&replicaSet=atlas-8yztb9-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Successfully connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// 2. User Schema Definition
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true }
});
const UserModel = mongoose.model('users', UserSchema);

// --- REGISTER API ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Check if user or email already exists
        const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists!" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new UserModel({
            email,
            username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- LOGIN API ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.json({
            message: "Login successful!",
            user: { id: user._id, username: user.username }
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
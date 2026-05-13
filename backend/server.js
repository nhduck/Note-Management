const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection
const mongoURI = 'mongodb+srv://nhducjob_db_user:IybmBrCS6WjBocYx@cluster0.skdwjrt.mongodb.net/NoteManagement?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// 2. User Schema Definition
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true }
});
const UserModel = mongoose.model('users', UserSchema);

// --- REGISTER API ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Check if username already exists
        const userExists = await UserModel.findOne({ username });
        if (userExists) return res.status(400).json({ message: "Username already exists!" });

        // Check if email already exists
        const emailExists = await UserModel.findOne({ email });
        if (emailExists) return res.status(400).json({ message: "Email already registered!" });

        // Hash password before saving
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
        res.status(500).json({ error: "Internal server error during registration" });
    }
});

// --- LOGIN API ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user in Database
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email does not exist" });

        // Compare input password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.json({
            message: "Login successful!",
            user: { id: user._id, username: user.username }
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error during login" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
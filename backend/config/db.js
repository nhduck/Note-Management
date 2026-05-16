const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ DB Error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
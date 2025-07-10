
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100 
});
app.use('/api/', limiter);


const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: 'Too many authentication attempts, please try again later.'
});


const users = new Map();
const sessions = new Map();


const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';


const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};




app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;


        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

   
        if (users.has(email)) {
            return res.status(409).json({ message: 'User already exists with this email' });
        }


        const hashedPassword = await hashPassword(password);


        const user = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            provider: 'email'
        };

        users.set(email, user);


        const token = generateToken(user.id);


        const { password: _, ...userWithoutPassword } = user;
        
        res.status(201).json({
            message: 'User created successfully',
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/auth/signin', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

 
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

      
        const user = users.get(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

  
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }


        const token = generateToken(user.id);


        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            message: 'Sign in successful',
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/auth/google', authLimiter, async (req, res) => {
    try {
        const { credential } = req.body;
        
        const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
        
        const { sub, name, email, picture } = payload;

     
        let user = users.get(email);
        
        if (user) {

            user.name = name;
            user.picture = picture;
            user.provider = 'google';
            users.set(email, user);
        } else {

            user = {
                id: 'google_' + sub,
                name,
                email,
                picture,
                provider: 'google',
                createdAt: new Date().toISOString()
            };
            users.set(email, user);
        }

     
        const token = generateToken(user.id);

        res.json({
            message: 'Google sign in successful',
            user,
            token
        });
    } catch (error) {
        console.error('Google signin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.get('/api/auth/me', authenticateToken, (req, res) => {
    try {
      
        const user = Array.from(users.values()).find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/auth/logout', authenticateToken, (req, res) => {
    try {
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        

        const user = Array.from(users.values()).find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

      
        if (name) user.name = name;
        if (email && email !== user.email) {
            if (users.has(email)) {
                return res.status(409).json({ message: 'Email already in use' });
            }
            users.delete(user.email);
            user.email = email;
            users.set(email, user);
        }
        const { password, ...userWithoutPassword } = user;
        res.json({
            message: 'Profile updated successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.delete('/api/auth/account', authenticateToken, (req, res) => {
    try {
        const user = Array.from(users.values()).find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        users.delete(user.email);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
    try {
        const { email } = req.body;
        console.log(`Password reset requested for: ${email}`);
        
        res.json({ message: 'Password reset email sent (check console for demo)' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});


app.listen(PORT, () => {
    console.log(`🚀 Auth server running on port ${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
});


module.exports = app;
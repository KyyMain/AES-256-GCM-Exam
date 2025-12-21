import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'kyystore-encryption-key-32bytes!'; // 32 bytes for AES-256
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',');

// Ensure encryption key is exactly 32 bytes
const getEncryptionKey = () => {
  const key = ENCRYPTION_KEY;
  if (key.length === 32) return key;
  return key.padEnd(32, '0').slice(0, 32);
};

// AES-256-GCM Encryption (more secure than CBC)
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12); // GCM recommends 12 bytes IV
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(getEncryptionKey()), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex'); // GCM authentication tag
  // Format: iv:authTag:encryptedData
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

// AES-256-GCM Decryption
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '[Invalid Format]';

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(getEncryptionKey()), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '[Decryption Error]';
  }
}

// Mask sensitive data for display (show last 4 chars only)
function maskData(data, showLast = 4) {
  if (!data || data.length <= showLast) return data;
  return '*'.repeat(data.length - showLast) + data.slice(-showLast);
}

// CORS setup
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json());

// In-memory users storage
const users = [
  {
    id: 'a-1',
    role: 'admin',
    email: 'admin@kyystore.gg',
    name: 'Kyystore Admin',
    nik: encrypt('3201234567890001'),
    dateOfBirth: encrypt('1990-01-15'),
    phone: encrypt('081234567890'),
    address: encrypt('Jl. Admin No. 1, Jakarta Pusat 10110'),
    cardNumber: encrypt('4532015112830366'),
    cardExpiry: encrypt('12/28'),
    cardCvv: encrypt('123'),
    passwordHash: bcrypt.hashSync('admin1234', 10),
    createdAt: new Date().toISOString()
  }
];

// Products catalog
const products = [
  {
    id: 'p-1',
    name: 'Valorant Account',
    game: 'Valorant',
    description: 'Immortal 3 | 120 Skins | Knife Collection',
    price: 350000,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    status: 'Available'
  },
  {
    id: 'p-2',
    name: 'Genshin Impact Account',
    game: 'Genshin Impact',
    description: 'AR 58 | Nahida C2 | 40x 5★ Characters',
    price: 520000,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    status: 'Available'
  },
  {
    id: 'p-3',
    name: 'Mobile Legends Account',
    game: 'Mobile Legends',
    description: 'Mythical Glory | 80 Skins | All Emblems Max',
    price: 275000,
    image: 'https://images.unsplash.com/photo-1493711662062-fa541f7f21df?w=400',
    status: 'Available'
  },
  {
    id: 'p-4',
    name: 'PUBG Mobile Account',
    game: 'PUBG Mobile',
    description: 'Conqueror | 50+ Gun Skins | Glacier M416',
    price: 420000,
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400',
    status: 'Available'
  },
  {
    id: 'p-5',
    name: 'Free Fire Account',
    game: 'Free Fire',
    description: 'Grandmaster | Elite Pass S1-S50 | All Bundles',
    price: 180000,
    image: 'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400',
    status: 'Sold'
  },
  {
    id: 'p-6',
    name: 'Honkai Star Rail Account',
    game: 'Honkai Star Rail',
    description: 'TL 70 | Kafka E1 | Silver Wolf E1',
    price: 650000,
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0f?w=400',
    status: 'Available'
  }
];

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Health check
app.get('/', (_req, res) => {
  res.json({ service: 'Kyystore API', status: 'ok', encryption: 'AES-256-GCM' });
});

// Register endpoint with comprehensive customer data
app.post('/api/register', (req, res) => {
  const {
    email, password, name,
    nik, dateOfBirth, phone, address,
    cardNumber, cardExpiry, cardCvv
  } = req.body;

  // Validation
  if (!email || !password || !name || !nik || !dateOfBirth || !phone || !address) {
    return res.status(400).json({ error: 'Semua field data pribadi harus diisi' });
  }

  if (!cardNumber || !cardExpiry || !cardCvv) {
    return res.status(400).json({ error: 'Semua field kartu pembayaran harus diisi' });
  }

  // Validate NIK (16 digits)
  if (!/^\d{16}$/.test(nik)) {
    return res.status(400).json({ error: 'NIK harus 16 digit angka' });
  }

  // Validate card number (13-19 digits)
  if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Nomor kartu tidak valid' });
  }

  // Validate CVV (3-4 digits)
  if (!/^\d{3,4}$/.test(cardCvv)) {
    return res.status(400).json({ error: 'CVV harus 3-4 digit' });
  }

  // Check if email already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email sudah terdaftar' });
  }

  // Create new user with ALL sensitive data encrypted using AES-256-GCM
  const newUser = {
    id: `u-${Date.now()}`,
    role: 'user',
    email: email,
    name: name,
    // Personal Identity (Encrypted with AES-256-GCM)
    nik: encrypt(nik),
    dateOfBirth: encrypt(dateOfBirth),
    phone: encrypt(phone),
    address: encrypt(address),
    // Payment Card (Encrypted with AES-256-GCM)
    cardNumber: encrypt(cardNumber.replace(/\s/g, '')),
    cardExpiry: encrypt(cardExpiry),
    cardCvv: encrypt(cardCvv),
    // Auth
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  console.log('\n========================================');
  console.log('🔐 NEW USER REGISTERED (AES-256-GCM)');
  console.log('========================================');
  console.log('ID:', newUser.id);
  console.log('Email:', newUser.email);
  console.log('Name:', newUser.name);
  console.log('----------------------------------------');
  console.log('📋 ENCRYPTED DATA (IV:AuthTag:CipherText):');
  console.log('NIK:', newUser.nik);
  console.log('Phone:', newUser.phone);
  console.log('Card:', newUser.cardNumber);
  console.log('========================================\n');

  res.status(201).json({
    message: 'Registrasi berhasil! Data sensitif telah dienkripsi dengan AES-256-GCM.',
    user: { id: newUser.id, email: newUser.email, name: newUser.name },
    encryption: {
      algorithm: 'AES-256-GCM',
      fieldsEncrypted: ['nik', 'dateOfBirth', 'phone', 'address', 'cardNumber', 'cardExpiry', 'cardCvv']
    }
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email atau password salah' });
  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Email atau password salah' });
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, role: user.role, name: user.name, email: user.email }
  });
});

// Get current user
app.get('/api/me', auth(), (req, res) => {
  res.json({ user: req.user });
});

// Get products (for all authenticated users)
app.get('/api/products', auth(), (_req, res) => {
  res.json({ items: products });
});

// Admin: Get all users with encrypted data (decryption on demand)
app.get('/api/admin/users', auth('admin'), (_req, res) => {
  const usersData = users
    .filter(u => u.role !== 'admin')
    .map(user => {
      const decryptedPhone = decrypt(user.phone);
      const decryptedCardNumber = decrypt(user.cardNumber);
      const decryptedCvv = decrypt(user.cardCvv);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,

        // Personal Identity
        personalData: {
          nik: {
            encrypted: user.nik,
            decrypted: decrypt(user.nik),
            masked: maskData(decrypt(user.nik), 4)
          },
          dateOfBirth: {
            encrypted: user.dateOfBirth,
            decrypted: decrypt(user.dateOfBirth)
          },
          phone: {
            encrypted: user.phone,
            decrypted: decryptedPhone,
            masked: maskData(decryptedPhone, 4)
          },
          address: {
            encrypted: user.address,
            decrypted: decrypt(user.address)
          }
        },

        // Payment Card
        paymentData: {
          cardNumber: {
            encrypted: user.cardNumber,
            decrypted: decryptedCardNumber,
            masked: maskData(decryptedCardNumber, 4)
          },
          cardExpiry: {
            encrypted: user.cardExpiry,
            decrypted: decrypt(user.cardExpiry)
          },
          cardCvv: {
            encrypted: user.cardCvv,
            decrypted: decryptedCvv,
            masked: '***'
          }
        }
      };
    });

  res.json({
    items: usersData,
    encryption: {
      algorithm: 'AES-256-GCM',
      keySize: '256 bits',
      mode: 'GCM (Galois/Counter Mode)',
      iv: '96 bits (12 bytes, random)',
      authTag: '128 bits (16 bytes)',
      format: 'IV:AuthTag:CipherText'
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Kyystore API running on http://localhost:${PORT}`);
  console.log('🔐 Encryption: AES-256-GCM (Authenticated Encryption)');
  console.log('📦 Ready for cryptography demo!\n');
});

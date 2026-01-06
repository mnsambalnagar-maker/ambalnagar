const port = process.env.PORT || 3000;
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const app = express();


// ------------------ Static Files ------------------
app.use(express.static(path.join(__dirname, 'public')));


// ---------- PAGE ROUTES ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/members', (req, res) => {
  res.sendFile(path.join(__dirname, 'members.html'));
});

app.get('/events', (req, res) => {
  res.sendFile(path.join(__dirname, 'events.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});


app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'public/uploads/videos')));
app.use('/uploads/news', express.static(path.join(__dirname, 'public/uploads/news')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===================================================
//           MAIL TRANSPORT - FIXED SMTP
// ===================================================
require('dotenv').config();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, 'utf8') || '[]';
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// ===================================================
//                     USERS SECTION
// ===================================================
function loadUsers() {
  return loadJSON(path.join(__dirname, 'users.json'));
}

const userPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = (req.body.username && String(req.body.username).trim()) || String(Date.now());
    const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    cb(null, `${safeBase}${ext}`);
  }
});
const userPhotoUpload = multer({ storage: userPhotoStorage });

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => String(u.username).toLowerCase() === String(username).toLowerCase());

  if (!user || String(user.password) !== String(password)) {
    return res.json({ success: false, message: 'Invalid username or password' });
  }

  return res.json({
    success: true,
    username: user.username,
    name: user.name || user.username,
    role: user.role || 'admin'
  });
});

app.get('/api/getUsers', (req, res) => {
  res.json(loadUsers());
});

app.post('/api/addUser', (req, res) => {
  const newUser = req.body;
  const file = path.join(__dirname, 'users.json');
  const users = loadUsers();

  if (users.find(u => u.username === newUser.username)) {
    return res.json({ success: false, message: 'Username already exists' });
  }

  users.push(newUser);
  fs.writeFileSync(file, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

app.post('/api/addUserWithPhoto', userPhotoUpload.single('photo'), (req, res) => {
  try {
    const newUser = req.body || {};
    const filePath = path.join(__dirname, 'users.json');
    const users = loadUsers();

    if (req.file && req.file.filename) {
      newUser.photo = '/uploads/' + req.file.filename;
    }

    if (users.find(u => u.username === newUser.username)) {
      return res.json({ success: false, message: 'Username already exists' });
    }

    users.push(newUser);
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('addUserWithPhoto error:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

app.post('/api/updateUser', (req, res) => {
  try {
    const updatedUser = req.body;
    const file = path.join(__dirname, 'users.json');
    let users = loadUsers();

    users = users.map(u => (u.username === updatedUser.username ? { ...u, ...updatedUser } : u));
    fs.writeFileSync(file, JSON.stringify(users, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Server error' });
  }
});

app.post('/api/updateUserWithPhoto', userPhotoUpload.single('photo'), (req, res) => {
  try {
    const updatedUser = req.body || {};
    if (req.file && req.file.filename) {
      updatedUser.photo = '/uploads/' + req.file.filename;
    }

    const file = path.join(__dirname, 'users.json');
    let users = loadUsers();

    users = users.map(u => (u.username === updatedUser.username ? { ...u, ...updatedUser } : u));
    fs.writeFileSync(file, JSON.stringify(users, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('updateUserWithPhoto error:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/deleteUser/:username', (req, res) => {
  try {
    const usernameToDelete = req.params.username;
    const file = path.join(__dirname, 'users.json');
    let users = loadUsers();

    users = users.filter(u => u.username !== usernameToDelete);
    fs.writeFileSync(file, JSON.stringify(users, null, 2));

    const jpg = path.join(__dirname, 'public/uploads', `${usernameToDelete}.jpg`);
    const png = path.join(__dirname, 'public/uploads', `${usernameToDelete}.png`);
    if (fs.existsSync(jpg)) fs.unlinkSync(jpg);
    if (fs.existsSync(png)) fs.unlinkSync(png);

    res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.json({ success: false, message: 'Delete failed' });
  }
});

// ===================================================
//         CONTACT WITH FILE UPLOAD
// ===================================================
const contactStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads/contacts');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = (req.body.name || 'contact').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${safeName}_${Date.now()}${ext}`);
  }
});

const contactUpload = multer({ 
  storage: contactStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/jpg',
      'application/pdf', 'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images, PDF, MP4/MOV/AVI allowed (max 25MB per file)'));
  }
});

app.post('/api/contact-with-file', contactUpload.array('attachments', 10), (req, res) => {
  const { name, mobile, message } = req.body;

  if (!name || !mobile || !message) {
    return res.status(400).json({ success: false, message: 'Please fill all fields' });
  }

  if (!/^[A-Za-z\s]+$/.test(String(name))) {
    return res.status(400).json({ success: false, message: 'Name should contain letters only' });
  }

  if (!/^\d{10}$/.test(String(mobile))) {
    return res.status(400).json({ success: false, message: 'Mobile must be 10 digits' });
  }

  let attachments = [];
  if (req.files && req.files.length) {
    attachments = req.files.map(f => ({
      filename: f.originalname,
      path: path.join(__dirname, 'public/uploads/contacts', f.filename),
      contentType: f.mimetype
    }));
  }

  const mailOptions = {
    from: `"${name}" <no-reply@ambalnagar.local>`,
    to: 'mathisurendhar@gmail.com',
    subject: `New Contact Message from ${name}${attachments.length ? ' (with attachments)' : ''}`,
    text: `Name: ${name}\nMobile: ${mobile}\nMessage: ${message}`,
    attachments
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('❌ CONTACT Email error:', err);
      // DEV MODE: Don't crash, just log
      return res.json({ success: true, message: 'Email failed (Dev Mode: Checked Console)' });
    }
    console.log('✅ CONTACT Email sent:', info.messageId);
    res.json({ success: true, message: 'Email sent successfully' });
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Please fill all fields' });
  }

  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: 'mathisurendhar@gmail.com',
    subject: `New Contact Message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('❌ CONTACT Email error:', err);
      return res.status(500).json({ success: false, message: 'Failed to send email' });
    }
    console.log('✅ CONTACT Email sent:', info.messageId);
    res.json({ success: true, message: 'Email sent successfully' });
  });
});

// ===================================================
//                     EVENTS SECTION
// ===================================================
const EVENTS_JSON = path.join(__dirname, 'events.json');

/* ---------- EVENT FILE UPLOAD ---------- */
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads/events');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName =
      Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const eventUpload = multer({ storage: eventStorage });

/* ---------- HELPERS ---------- */
function loadEvents() {
  return loadJSON(EVENTS_JSON);
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_JSON, JSON.stringify(events, null, 2));
}

/* ---------- GET EVENTS ---------- */
app.get('/api/events', (req, res) => {
  res.json({ events: loadEvents() });
});

/* ---------- ADD / UPDATE EVENT ---------- */
app.post('/api/addevent', eventUpload.array('files'), (req, res) => {
  try {
    const { id, title, date, description } = req.body;

    if (!title || !date) {
      return res.json({ success: false, message: 'Title & Date required' });
    }

    let events = loadEvents();
    const uploadedFiles = (req.files || []).map(
      f => `/uploads/events/${f.filename}`
    );

    // 🔄 UPDATE EVENT
    if (id) {
      const index = events.findIndex(e => String(e.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      events[index] = {
        ...events[index],
        title,
        date,
        description,
        files: [...(events[index].files || []), ...uploadedFiles]
      };

      saveEvents(events);
      return res.json({ success: true });
    }

    // ➕ NEW EVENT
    const newEvent = {
      id: Date.now(),
      title,
      date,
      description,
      files: uploadedFiles
    };

    events.push(newEvent);
    saveEvents(events);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Event error:', err);
    res.status(500).json({ success: false });
  }
});

/* ---------- DELETE EVENT ---------- */
app.delete('/api/addevent/:id', (req, res) => {
  try {
    let events = loadEvents();
    const index = events.findIndex(e => String(e.id) === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = events[index];

    // 🗑️ DELETE FILES
    (event.files || []).forEach(file => {
      const filePath = path.join(__dirname, 'public', file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    events.splice(index, 1);
    saveEvents(events);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Delete event error:', err);
    res.status(500).json({ success: false });
  }
});


// ===================================================
//                     NEWS SECTION
// ===================================================
const NEWS_JSON = path.join(__dirname, 'news.json');

function loadNews() {
  return loadJSON(NEWS_JSON);
}

const newsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const base = mime.startsWith('video/') ? 'public/uploads/videos' : 'public/uploads/news';
    const uploadDir = path.join(__dirname, base);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe + ext);
  }
});

const newsUpload = multer({
  storage: newsStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mim = file.mimetype || '';
    if (mim.startsWith('image/') || mim.startsWith('video/')) cb(null, true);
    else cb(new Error('Only image or video allowed'));
  }
});

app.post('/api/addNews', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.json({ success: false, message: 'Missing title or content' });

  const allNews = loadNews();
  allNews.push({
    id: Date.now(),
    title, content,
    media: null,
    mediaType: null,
    date: new Date().toISOString()
  });

  fs.writeFileSync(NEWS_JSON, JSON.stringify(allNews, null, 2));
  res.json({ success: true });
});

app.post('/api/addNewsMedia', newsUpload.single('media'), (req, res) => {
  try {
    const { title, content } = req.body;
    let mediaUrl = null, mediaType = null;

    if (req.file) {
      if (req.file.mimetype.startsWith('video/')) {
        mediaUrl = `/uploads/videos/${req.file.filename}`;
        mediaType = 'video';
      } else {
        mediaUrl = `/uploads/news/${req.file.filename}`;
        mediaType = 'image';
      }
    }

    const allNews = loadNews();
    allNews.push({
      id: Date.now(),
      title, content,
      media: mediaUrl,
      mediaType: mediaType,
      date: new Date().toISOString()
    });

    fs.writeFileSync(NEWS_JSON, JSON.stringify(allNews, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('addNewsMedia error:', err);
    res.status(500).json({ success: false });
  }
});

app.get('/api/getNews', (req, res) => {
  res.json(loadNews());
});

app.get('/api/news/:id', (req, res) => {
  const allNews = loadNews();
  const item = allNews.find(item => String(item.id) === req.params.id);
  if (!item) return res.status(404).json({ success: false });
  res.json(item);
});

app.delete('/api/deleteNews/:id', (req, res) => {
  try {
    const newsId = req.params.id;
    let allNews = loadNews();
    const item = allNews.find(n => String(n.id) === newsId);

    if (!item) return res.status(404).json({ success: false });

    if (item.media) {
      const filePath = path.join(__dirname, 'public', item.media.replace(/^\/uploads\//, 'uploads/'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    allNews = allNews.filter(n => String(n.id) !== newsId);
    fs.writeFileSync(NEWS_JSON, JSON.stringify(allNews, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('deleteNews error:', err);
    res.status(500).json({ success: false });
  }
});

// ===================================================
//           TWO-STEP LOGIN (ALL ROLES ALLOWED + DEBUG)
// ===================================================
app.post('/api/login-step1', (req, res) => {
  const { username, password, email } = req.body;

  console.log('🔍 LOGIN ATTEMPT:', { username, email });

  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  const users = loadUsers();
  const user = users.find(
    u =>
      String(u.username).toLowerCase() === String(username).toLowerCase() &&
      String(u.password) === String(password) &&
      String(u.email).toLowerCase() === String(email).toLowerCase()
  );

  if (!user) {
    console.log('❌ USER NOT FOUND');
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  // ✅ FIXED: NO ROLE CHECK - ALL ROLES ALLOWED!
  console.log('✅ USER FOUND:', user.username, user.role, user.name);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  user.otp = otp;
  user.otpExpiry = expiry;
  fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));

  console.log(`🔥 OTP GENERATED: ${otp} → ${user.email}`);

  const mailOptions = {
    from: 'mathisurendhar@gmail.com',
    to: user.email,
    subject: 'Ambal Nagar Login OTP',
    text: `Your login OTP is ${otp}. It is valid for 5 minutes.`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('❌ OTP mail error:', err);
      // DEV MODE: Allow login even if email fails
      console.log('⚠️ Email failed. OTP is visible in console above.');
      return res.json({ success: true, message: 'OTP sent (Check Console/Email)', debug_otp: otp });
    }
    console.log('✅ OTP Email SENT!', info.messageId);
    console.log('📧 Check Gmail Inbox/SPAM/Promotions');
    res.json({ success: true, message: 'OTP sent! Check Gmail SPAM/Promotions folder.', debug_otp: otp });
  });
});

app.post('/api/login-step2', (req, res) => {
  const { email, otp } = req.body;

  console.log('🔍 OTP VERIFY:', { email, otp: otp ? '******' : 'missing' });

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP required' });
  }

  const users = loadUsers();
  const user = users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());

  if (!user || !user.otp || !user.otpExpiry) {
    return res.status(400).json({ success: false, message: 'OTP not requested' });
  }

  if (Date.now() > user.otpExpiry) {
    user.otp = null;
    user.otpExpiry = null;
    fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  user.otp = null;
  user.otpExpiry = null;
  fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));

  console.log('✅ LOGIN SUCCESS:', user.username, user.role, user.name);

  res.json({
    success: true,
    message: 'Login success',
    user: {
      username: user.username,
      name: user.name || user.username,
      email: user.email,
      role: user.role || 'admin',
      phone: user.phone || ''
    }
  });
});

// ===================================================
//             CATEGORY & MEMBERS SYSTEM
// ===================================================
const MEMBERS_JSON = path.join(__dirname, 'members.json');
const CATEGORIES_JSON = path.join(__dirname, 'categories.json');

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

app.get('/api/categories', (req, res) => {
  const categories = loadJSON(CATEGORIES_JSON);
  res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Missing id or name' });

  let categories = loadJSON(CATEGORIES_JSON);
  if (categories.find(c => c.id === id)) {
    return res.status(409).json({ error: 'Category ID already exists' });
  }

  categories.push({ id, name });
  writeJSON(CATEGORIES_JSON, categories);
  res.status(201).json({ id, name });
});

app.put('/api/categories/:id', (req, res) => {
  const id = req.params.id;
  let categories = loadJSON(CATEGORIES_JSON);
  const index = categories.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Category not found' });

  categories[index].name = req.body.name || categories[index].name;
  writeJSON(CATEGORIES_JSON, categories);
  res.json(categories[index]);
});

app.delete('/api/categories/:id', (req, res) => {
  const id = req.params.id;
  let categories = loadJSON(CATEGORIES_JSON);
  categories = categories.filter(c => c.id !== id);
  writeJSON(CATEGORIES_JSON, categories);
  res.status(204).send();
});

app.get('/api/members', (req, res) => {
  const members = loadJSON(MEMBERS_JSON);
  res.json(members);
});

app.get('/api/members/:category', (req, res) => {
  const category = req.params.category;
  const members = loadJSON(MEMBERS_JSON);
  const filtered = members.filter(m => m.category === category);
  res.json(filtered);
});

app.post('/api/members', (req, res) => {
  const { name, phone, category } = req.body;
  if (!name || !phone || !category) return res.status(400).json({ error: 'Missing required fields' });

  const members = loadJSON(MEMBERS_JSON);
  const newMember = { id: Date.now().toString(), name, phone, category };
  members.push(newMember);
  writeJSON(MEMBERS_JSON, members);
  res.status(201).json(newMember);
});

app.put('/api/members/:id', (req, res) => {
  const id = req.params.id;
  let members = loadJSON(MEMBERS_JSON);
  const index = members.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: 'Member not found' });

  members[index] = { ...members[index], ...req.body };
  writeJSON(MEMBERS_JSON, members);
  res.json(members[index]);
});

app.delete('/api/members/:id', (req, res) => {
  const id = req.params.id;
  let members = loadJSON(MEMBERS_JSON);
  members = members.filter(m => m.id !== id);
  writeJSON(MEMBERS_JSON, members);
  res.status(204).send();
});

//==================================================
//             MEMBERSHIP + QR CODE
//==================================================

const MEMBERS_FILE = path.join(__dirname, 'members.json');

/* ---------- HELPERS ---------- */
function loadMembers() {
  return loadJSON(MEMBERS_FILE);
}

function saveMembers(data) {
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));
}

// 🆕 MEMBERSHIP APPLICATION
app.post('/api/submit-membership', (req, res) => {
  const { name, mobile, refId } = req.body;

  console.log('🆕 MEMBERSHIP APPLY:', name, mobile, refId);

  if (!name || !mobile || !refId) {
    return res.json({ success: false, message: 'All fields required' });
  }

  if (!/^[A-Za-z\s]+$/.test(name)) {
    return res.json({ success: false, message: 'Name must contain letters only' });
  }

  if (!/^\d{10}$/.test(mobile)) {
    return res.json({ success: false, message: 'Invalid mobile number' });
  }

  const members = loadMembers();

  const newMember = {
    id: Date.now(),
    name,
    mobile,
    refId,
    status: 'pending',
    appliedAt: new Date().toISOString()
  };

  members.push(newMember);
  saveMembers(members);

  // 📧 EMAIL ADMIN (FAIL SAFE)
  transporter.sendMail({
    from: `"Sri Ambal Nagar" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `🆕 Membership Application | ${name}`,
    html: `
      <h2>New Membership Application</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Mobile:</b> ${mobile}</p>
      <p><b>Payment Ref:</b> ${refId}</p>
      <p><b>Amount:</b> ₹200</p>
      <p>Status: <span style="color:red">Pending</span></p>
    `
  }, err => {
    if (err) console.error('❌ Membership email error:', err.message);
  });

  res.json({
    success: true,
    message: 'Application submitted successfully'
  });
});

// 🔥 ADMIN – VIEW MEMBERSHIP APPLICATIONS
app.get('/api/admin/applications', (req, res) => {
  const members = loadMembers();
  const visible = members.filter(
    m => m.status === 'pending' || m.status === 'approved'
  );
  res.json(visible);
});

// 🔥 ADMIN – APPROVE / REJECT MEMBERSHIP
app.post('/api/admin/update/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  let members = loadMembers();
  const index = members.findIndex(m => String(m.id) === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  members[index].status = status;
  members[index].updatedAt = new Date().toISOString();

  if (status === 'approved') {
    members[index].approvedAt = new Date().toISOString();
  }

  saveMembers(members);

  // ✅ WhatsApp auto message on approval
  if (status === 'approved') {
    const m = members[index];
    const BASE_URL = process.env.BASE_URL || 'https://yourdomain.com';

    const whatsappMessage = `Sri Ambal Nagar Welfare Association

${BASE_URL}/img/logo.png

✅ MEMBERSHIP APPROVED

👤 Name: ${m.name}
📱 Mobile: ${m.mobile}
💰 ₹200 Annual Membership ACTIVE`;

    const whatsappLink =
      `https://wa.me/91${m.mobile}?text=${encodeURIComponent(whatsappMessage)}`;

    return res.json({
      success: true,
      whatsapp: whatsappLink,
      message: 'Membership approved'
    });
  }

  res.json({ success: true, message: `Status updated: ${status}` });
});

//==================================================
//                 DYNAMIC QR CODE
//==================================================
app.get('/api/qr', async (req, res) => {
  const { upi } = req.query;

  if (!upi) {
    return res.json({ success: false, message: 'UPI ID required' });
  }

  try {
    const qrData = `upi://pay?pa=${upi}&am=200&cu=INR`;
    const qrImage = await QRCode.toDataURL(qrData);
    res.json({ success: true, qr: qrImage });
  } catch (err) {
    console.error('❌ QR Error:', err);
    res.json({ success: false, message: 'QR generation failed' });
  }
});

//==================================================
//            DASHBOARD SUPPORT APIS
//==================================================
app.get('/api/users', (req, res) => {
  res.json(loadUsers());
});

// 🔥 REAL-TIME VISITOR COUNTER (FILE SAFE)
let visitorCount = 0;
let lastReset = Date.now();

app.get('/api/visitors', (req, res) => {
  const file = path.join(__dirname, 'visitors.json');

  try {
    const data = loadJSON(file);
    visitorCount = data.count || 0;
    lastReset = data.lastReset || Date.now();
  } catch {
    visitorCount = 0;
    lastReset = Date.now();
  }

  // Reset every 24 hours
  if (Date.now() - lastReset > 24 * 60 * 60 * 1000) {
    visitorCount = 0;
    lastReset = Date.now();
  }

  visitorCount++;

  fs.writeFileSync(
    file,
    JSON.stringify({ count: visitorCount, lastReset })
  );

  res.json({ count: visitorCount });
});





// ===================================================
//                  START SERVER
// ===================================================
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);  // ✅ Dynamic
  console.log('✅ ALL ROLES ALLOWED - super/admin/member');
  console.log('📧 Mail: Check Gmail SPAM/Promotions folder!');
  console.log('💰 Membership + QR Ready!');
});

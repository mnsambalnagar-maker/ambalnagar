const port = process.env.PORT || 3001;
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const axios = require('axios');
const app = express();
const cors = require('cors');


require('dotenv').config();
const supabase = require('./supabase');

// ===============================
// MULTER CONFIG (SAFE FOR RENDER)
// ===============================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 10MB per file
    files: 10                  // max 10 files
  }
});


// ===============================
// GLOBAL MIDDLEWARES (ONLY ONCE)
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));




// ===============================
// TEST DB
// ===============================
app.get('/test-db', async (req, res) => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) return res.status(500).json(error);
  res.json(data);
});

// ---------- PAGE ROUTES ----------



// 👇 ADD THIS
app.get('/index', (req, res) => {
  res.redirect('/');
});

// Home page
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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/membership', (req, res) => {
  res.sendFile(path.join(__dirname, 'membership.html'));
});

app.get('/service', (req, res) => {
  res.sendFile(path.join(__dirname, 'service.html'));
});
app.get('/newsview', (req, res) => {
  res.sendFile(path.join(__dirname, 'newsview.html'));
});

app.get('/next-event', (req, res) => {
  res.sendFile(path.join(__dirname, 'next-event.html'));
});

app.get('/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'news.html'));
});

app.get('/servicework', (req, res) => {
  res.sendFile(path.join(__dirname, 'servicework.html'));
});

app.get('/add-member', (req, res) => {
  res.sendFile(path.join(__dirname, 'add-member.html'));
});

app.get('/newslist', (req, res) => {
  res.sendFile(path.join(__dirname, 'newslist.html'));
});

app.get('/admin-users', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-users.html'));
});

app.get('/membership-applications', (req, res) => {
  res.sendFile(path.join(__dirname, 'membership-applications.html'));
});

app.get('/manage-member', (req, res) => {
  res.sendFile(path.join(__dirname, 'manage-member.html'));
});

app.get('/edit-member', (req, res) => {
  res.sendFile(path.join(__dirname, 'edit-member.html'));
});

app.get('/office-bearers', (req, res) => {
  res.sendFile(path.join(__dirname, 'office-bearers.html'));
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

async function uploadToSupabaseStorage(file) {
  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

  const { error } = await supabase.storage
    .from('events')
    .upload(fileName, file.buffer, {
    contentType: file.mimetype,
    upsert: true
    });


  if (error) throw error;

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/events/${fileName}`;
}

function loadUsers() {
  const file = path.join(__dirname, 'users.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}









// ================================
// ADD MEMBER (WITH PHOTO)
// ================================
app.post('/api/addUserWithPhoto', upload.single('photo'), async (req, res) => {
  try {
    const { username, phone, role, joined, address } = req.body;
    let photo_url = null;

    if (!username) {
      return res.json({ success: false, message: 'Username required' });
    }

    // upload photo
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const fileName = `member_${Date.now()}_${username}.${ext}`;

      const { error: uploadErr } = await supabase
        .storage
        .from('member-photos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype
        });

      if (uploadErr) throw uploadErr;

      const { data } = supabase
        .storage
        .from('member-photos')
        .getPublicUrl(fileName);

      photo_url = data.publicUrl;
    }

    const { error } = await supabase
      .from('members')
      .insert([{
        username,
        phone,
        role: role || 'member',
        joined,
        address,
        photo_url
      }]);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Add member failed' });
  }
});

// ================================
// GET ALL MEMBERS (ADMIN + PUBLIC)
// ================================
app.get('/api/getUsers', async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.json([]);
  }

  res.json(data);
});

// ================================
// UPDATE MEMBER (WITH PHOTO)
// ================================
app.post('/api/updateUserWithPhoto', upload.single('photo'), async (req, res) => {
  try {
    const { id, username, phone, role, joined } = req.body;

    if (!id) {
      return res.json({ success: false, message: 'ID required' });
    }

    let updateData = { username, phone, role, joined };

    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const fileName = `member_${Date.now()}_${username}.${ext}`;

      const { error: uploadErr } = await supabase
        .storage
        .from('member-photos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype
        });

      if (uploadErr) throw uploadErr;

      const { data } = supabase
        .storage
        .from('member-photos')
        .getPublicUrl(fileName);

      updateData.photo_url = data.publicUrl;
    }

    const { error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// ================================
// DELETE MEMBER
// ================================
app.delete('/api/deleteUser/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.json({ success: false });
  }

  res.json({ success: true });
});





// ===================================================
//                     EVENTS SECTION
// ===================================================

app.post('/api/events', upload.array('files', 10), async (req, res) => {
  try {
    console.log('FILES:', req.files); // 🔍 DEBUG

    const { title, date, description } = req.body;

    if (!title || !date || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    let fileUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToSupabaseStorage(file);
        fileUrls.push(url);
      }
    }

    const { error } = await supabase
      .from('events')
      .insert([{
        title,
        date,
        description,
        files: fileUrls // ✅ JSONB
      }]);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error('❌ ADD EVENT ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});



// ---------- GET EVENTS ----------
app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, date, description, files')
      .order('date', { ascending: true });

    if (error) throw error;

    res.json({
      events: (data || []).map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        description: e.description,
        files: Array.isArray(e.files) ? e.files : []
      }))
    });

  } catch (err) {
    console.error('❌ GET EVENTS ERROR:', err);
    res.status(500).json({ events: [] });
  }
});


// ---------- UPDATE EVENT ----------
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, description } = req.body;

    if (!title || !date || !description || isNaN(new Date(date))) {
      return res.status(400).json({ success: false });
    }

    const { error } = await supabase
      .from('events')
      .update({ title, date, description })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error('❌ UPDATE EVENT ERROR:', err);
    res.status(500).json({ success: false });
  }
});


// ---------- DELETE EVENT ----------
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error('❌ DELETE EVENT ERROR:', err);
    res.status(500).json({ success: false });
  }
});


// ---------- EVENT GALLERY ----------
app.get('/api/events/:id/gallery', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ files: data || [] });

  } catch (err) {
    console.error('❌ GALLERY ERROR:', err);
    res.json({ files: [] });
  }
});
async function uploadToSupabaseStorage(file) {
  const fileName = `${Date.now()}-${file.originalname}`;

  const { data, error } = await supabase.storage
    .from('events') // 👈 bucket name EXACT
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('STORAGE UPLOAD ERROR:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from('events')
    .getPublicUrl(fileName);

  return publicData.publicUrl;
}



// ===================================================
//                     NEWS SECTION (SUPABASE)
// ===================================================

app.post('/api/news', upload.single('media'), async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.json({ success: false, message: 'Missing fields' });
    }

    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadToSupabaseStorage(req.file, 'news');
    }

    const { error } = await supabase
      .from('news')
      .insert([{ title, content, image_url: imageUrl }]);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    console.error('❌ ADD NEWS ERROR:', err);
    res.status(500).json({ success: false });
  }
});


app.get('/api/news', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ news: data || [] });

  } catch (err) {
    console.error('❌ GET NEWS ERROR:', err);
    res.json({ news: [] });
  }
});

app.put('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const { error } = await supabase
      .from('news')
      .update({ title, content })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});
app.get('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false });
    }

    res.json(data);

  } catch (err) {
    console.error('❌ GET NEWS BY ID ERROR:', err);
    res.status(500).json({ success: false });
  }
});




// ===============================
// CONTACT → TELEGRAM BOT
// ===============================


const TELEGRAM_BOT_TOKEN = '8220659876:AAEbkPEIrZFwFB7U6om9g6SaSGldLQs9rDQ';
const TELEGRAM_CHAT_ID = '8540078103';

const contactStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public/uploads/contact');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const contactUpload = multer({
  storage: contactStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

app.post('/api/contact-with-file', contactUpload.array('attachments'), async (req, res) => {
  try {
    const { name, mobile, message } = req.body;

    if (!name || !mobile || !message) {
      return res.json({ success: false, message: 'Missing fields' });
    }

    let text = `📩 *New Contact Message*\n\n` +
               `👤 *Name:* ${name}\n` +
               `📞 *Mobile:* ${mobile}\n\n` +
               `💬 *Message:*\n${message}`;

    // 1️⃣ Send text message
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown'
    });

    // 2️⃣ Send attachments (if any)
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const filePath = path.join(__dirname, 'public/uploads/contact', file.filename);

        const formData = new (require('form-data'))();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('document', fs.createReadStream(filePath));

        await axios.post(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
          formData,
          { headers: formData.getHeaders() }
        );
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Telegram contact error:', err);
    res.status(500).json({ success: false });
  }
});


// ===================================================
// LOGIN STEP 1 – OTP IN BROWSER
// ===================================================
app.post('/api/login-step1', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.json({ success: false, message: 'All fields required' });
  }

  const users = loadUsers();
  const user = users.find(
    u =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password &&
      u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.otp = otp;
  user.otpExpiry = Date.now() + 5 * 60 * 1000;

  fs.writeFileSync(
    path.join(__dirname, 'users.json'),
    JSON.stringify(users, null, 2)
  );

  res.json({
    success: true,
    message: 'OTP generated',
    otp // 🔥 browser-only
  });
});


app.post('/api/login-step2', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.json({ success: false, message: 'Email and OTP required' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !user.otp) {
    return res.json({ success: false, message: 'OTP not generated' });
  }

  if (Date.now() > user.otpExpiry) {
    user.otp = null;
    user.otpExpiry = null;
    fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
    return res.json({ success: false, message: 'OTP expired' });
  }

  if (user.otp !== otp) {
    return res.json({ success: false, message: 'Invalid OTP' });
  }

  user.otp = null;
  user.otpExpiry = null;
  fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));

  res.json({
    success: true,
    user: {
      username: user.username,
      name: user.name || user.username,
      email: user.email,
      role: user.role || 'admin'
    }
  });
});

// ===============================
// ADMIN USERS (users.json)
// ===============================
const USERS_FILE = path.join(__dirname, 'users.json');

// ---------- helpers ----------
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// ===============================
// GET ALL USERS (ADMIN PAGE)
// ===============================
app.get('/api/users', (req, res) => {
  const users = readUsers();
  res.json(users);
});

// ===============================
// ADD USER (ADMIN CREATE)
// ===============================
app.post('/api/addUser', (req, res) => {
  const users = readUsers();
  const { username, password, role, phone, joined, email, avatar } = req.body;

  if (!username) {
    return res.json({ success: false, message: 'Username required' });
  }

  if (users.some(u => u.username === username)) {
    return res.json({ success: false, message: 'Username already exists' });
  }

  users.push({
    username,
    password: password || '',
    role: role || 'admin',
    phone: phone || '',
    joined: joined || '',
    email: email || '',
    avatar: avatar || 'img/avatar1.png',
    otp: null,
    otpExpiry: null
  });

  writeUsers(users);
  res.json({ success: true });
});

// ===============================
// UPDATE USER (ADMIN EDIT)
// ===============================
app.post('/api/updateUser', (req, res) => {
  const users = readUsers();
  const { username, password, role, phone, joined, email, avatar } = req.body;

  const idx = users.findIndex(u => u.username === username);
  if (idx === -1) {
    return res.json({ success: false, message: 'User not found' });
  }

  users[idx] = {
    ...users[idx],
    role: role ?? users[idx].role,
    phone: phone ?? users[idx].phone,
    joined: joined ?? users[idx].joined,
    email: email ?? users[idx].email,
    avatar: avatar ?? users[idx].avatar,
    password: password ? password : users[idx].password
  };

  writeUsers(users);
  res.json({ success: true });
});

// ===============================
// DELETE USER (ADMIN DELETE)
// ===============================
app.delete('/api/deleteAdmin/:username', (req, res) => {
  const { username } = req.params;
  const users = readUsers();

  // ❌ safety: never delete mainadmin
  if (username === 'mainadmin') {
    return res.json({ success: false, message: 'Cannot delete mainadmin' });
  }

  const filtered = users.filter(u => u.username !== username);
  writeUsers(filtered);

  res.json({ success: true });
});


// ===================================================
//        CATEGORY & MEMBERS SYSTEM (SUPABASE)
// ===================================================





// -----------------------
// CATEGORIES
// -----------------------

// GET all categories
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name, image')
    .order('name');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ADD category
app.post('/api/categories', async (req, res) => {
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'Missing id or name' });
  }

  const { error } = await supabase
    .from('service_categories')
    .insert([{ id, name }]);

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category ID already exists' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ id, name });
});

// UPDATE category
app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const { data, error } = await supabase
    .from('service_categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.json(data);
});

// DELETE category
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('service_categories')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(204).send();
});

// -----------------------
// MEMBERS
// -----------------------

// GET all members (admin)
app.get('/api/members', async (req, res) => {
  const { data, error } = await supabase
    .from('service_members')
    .select('id, name, phone, category')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// GET members by category (public)
app.get('/api/members/:category', async (req, res) => {
  const { category } = req.params;

  const { data, error } = await supabase
    .from('service_members')
    .select('id, name, phone, category')
    .eq('category', category);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ADD member
app.post('/api/members', async (req, res) => {
  const { name, phone, category } = req.body;

  if (!name || !phone || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('service_members')
    .insert([{ name, phone, category }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// UPDATE member
app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('service_members')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Member not found' });
  }

  res.json(data);
});

// DELETE member
app.delete('/api/members/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('service_members')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(204).send();
});


//========================//
//membership +  QR Code//
//========================//

const MEMBERS_FILE = path.join(__dirname, 'members.json');

function loadMembers() {
  if (!fs.existsSync(MEMBERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8'));
}

function saveMembers(data) {
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));
}
//========================//
// Telegream Send Function//
//========================//
async function sendTelegram(message) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message
      }
    );
  } catch (err) {
    console.error('Telegram error:', err.message);
  }
}
//=======================//
//Member submit - Api //
//====================//
app.post('/api/submit-membership', async (req,res)=>{
  const { name, mobile, refId } = req.body;

  if(!name || !mobile || !refId){
    return res.json({ success:false, message:'Missing data' });
  }

  const members = loadMembers();

  const newMember = {
    id: Date.now().toString(),
    name,
    mobile,
    refId,
    status:'pending',
    createdAt: new Date().toISOString()
  };

  members.push(newMember);
  saveMembers(members);

  await sendTelegram(
`🆕 NEW MEMBERSHIP
👤 ${name}
📱 ${mobile}
💳 Ref: ${refId}
⏳ Pending approval`
  );

  res.json({ success:true });
});
//========================//
//Admin - view Application//
//=======================//
app.get('/api/admin/applications',(req,res)=>{
  const members = loadMembers();
  res.json(members.filter(m=>m.status==='pending'||m.status==='approved'));
});
//=============================//
// Admin -Approve + whatapp//
//===========================//
app.post('/api/admin/update/:id', async (req,res)=>{
  const { id } = req.params;
  const { status } = req.body;

  const members = loadMembers();
  const index = members.findIndex(m=>m.id===id);

  if(index===-1){
    return res.json({ success:false });
  }

  members[index].status = status;
  saveMembers(members);

  let whatsapp = null;

  if (status === 'approved') {
 const msg = `
 🤝 AmbalNagar Makkal Nalvazhu Sangam 🤝

 Hello ${members[index].name} 👋,

 We are happy to inform you that your *membership application has been successfully approved* ✅🎉

 You are now an official member of *AmbalNagar Makkal Nalvazhu Sangam* 🤍

 Thank you for joining us.
 We look forward to your active participation in our community programs 🌱

 📍 Stay connected. Stay united.
 `;



    whatsapp =
`https://wa.me/91${members[index].mobile}?text=${encodeURIComponent(msg)}`;

    await sendTelegram(
`✅ APPROVED
👤 ${members[index].name}
📱 ${members[index].mobile}`
    );
  }

  res.json({ success:true, whatsapp });
});
//=================================//
//     QR -Api//
//==================================//
app.get('/api/qr', async (req,res)=>{
  const { upi } = req.query;

  const qrData = `upi://pay?pa=${upi}&am=200&cu=INR`;
  const qr = await QRCode.toDataURL(qrData);

  res.json({ success:true, qr });
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


app.get('/api/office-bearers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('office_bearers')     // ✅ table
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('GET OFFICE BEARERS ERROR:', err);
    res.status(500).json([]);
  }
});
app.post(
  '/api/office-bearers',
  upload.single('photo'),
  async (req, res) => {
    try {
      const { name, role } = req.body;

      if (!name || !role || !req.file) {
        return res.status(400).json({ success: false });
      }

      const safeName = req.file.originalname.replace(/\s+/g, '_');
      const fileName = `office_${Date.now()}_${safeName}`;

      // ✅ correct bucket name (underscore)
      const { error: uploadError } = await supabase.storage
        .from('office_bearers')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('office_bearers')
        .getPublicUrl(fileName);

      const image_url = publicData.publicUrl;

      const { error: dbError } = await supabase
        .from('office_bearers')
        .insert([{ name, role, image_url }]);

      if (dbError) throw dbError;

      res.json({ success: true });

    } catch (err) {
      console.error('ADD OFFICE BEARER ERROR:', err);
      res.status(500).json({ success: false });
    }
  }
);
app.delete('/api/office-bearers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('office_bearers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE OFFICE BEARER ERROR:', err);
    res.status(500).json({ success: false });
  }
});



// ===============================
// STATIC FILES (ALWAYS LAST)
// ===============================
app.use(express.static(path.join(__dirname, 'public')));





// ===================================================
//                  START SERVER
// ===================================================
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);  // ✅ Dynamic
  console.log('✅ ALL ROLES ALLOWED - super/admin/member');
  console.log('📧 Mail: Check Gmail SPAM/Promotions folder!');
  console.log('💰 Membership + QR Ready!');
});

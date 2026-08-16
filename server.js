const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static frontend

// Setup Multer for audio uploads
const upload = multer({ dest: 'uploads/' });

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Database paths
const ledgerDbPath = path.join(dataDir, 'ledger.json');
const cmsDbPath = path.join(dataDir, 'cms.json');
const articlesDbPath = path.join(dataDir, 'articles.json');
const kajianDbPath = path.join(dataDir, 'kajian.json');

// Initialize database if not exists
if (!fs.existsSync(ledgerDbPath)) {
    fs.writeFileSync(ledgerDbPath, JSON.stringify([
        { id: 1, date: new Date().toISOString(), type: 'income', amount: 500000, desc: 'Infaq Hamba Allah' }
    ]));
}

if (!fs.existsSync(kajianDbPath)) {
    fs.writeFileSync(kajianDbPath, JSON.stringify([]));
}

// --- API ENDPOINTS ---

// 0. Auth & CMS API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'dummy-token-123' });
    } else {
        res.status(401).json({ success: false, error: 'Kredensial tidak valid' });
    }
});

app.get('/api/cms', (req, res) => {
    try {
        const data = fs.readFileSync(cmsDbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read CMS data' });
    }
});

app.post('/api/cms', (req, res) => {
    try {
        const { masjidName, welcomeText, contactInfo, jumatInfo, announcements } = req.body;
        const data = JSON.parse(fs.readFileSync(cmsDbPath, 'utf8'));
        
        if (masjidName !== undefined) data.masjidName = masjidName;
        if (welcomeText !== undefined) data.welcomeText = welcomeText;
        if (contactInfo !== undefined) data.contactInfo = contactInfo;
        if (jumatInfo !== undefined) data.jumatInfo = jumatInfo;
        if (announcements !== undefined) data.announcements = announcements;
        
        fs.writeFileSync(cmsDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update CMS data' });
    }
});

// Setup multer for CMS banner upload
const uploadCMS = multer({ dest: 'uploads/' });
app.post('/api/upload-banner', uploadCMS.single('banner'), (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(cmsDbPath, 'utf8'));
        data.heroBanner = req.file.filename;
        fs.writeFileSync(cmsDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true, filename: req.file.filename });
    } catch(err) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Gallery endpoints
app.post('/api/upload-gallery', uploadCMS.single('photo'), (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(cmsDbPath, 'utf8'));
        if(!data.gallery) data.gallery = [];
        data.gallery.push(req.file.filename);
        fs.writeFileSync(cmsDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true, filename: req.file.filename });
    } catch(err) {
        res.status(500).json({ error: 'Gallery upload failed' });
    }
});

app.delete('/api/gallery/:filename', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(cmsDbPath, 'utf8'));
        if(data.gallery) {
            data.gallery = data.gallery.filter(f => f !== req.params.filename);
            fs.writeFileSync(cmsDbPath, JSON.stringify(data, null, 2));
            
            // Delete file physically
            const filepath = path.join(__dirname, 'uploads', req.params.filename);
            if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: 'Gallery delete failed' });
    }
});

// Articles endpoints
app.get('/api/articles', (req, res) => {
    try {
        const data = fs.readFileSync(articlesDbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read articles data' });
    }
});

app.post('/api/articles', uploadCMS.single('cover'), (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(articlesDbPath, 'utf8'));
        const newArticle = {
            id: Date.now(),
            title: req.body.title,
            content: req.body.content,
            cover: req.file ? req.file.filename : null,
            createdAt: new Date().toISOString()
        };
        data.unshift(newArticle); // prepend
        fs.writeFileSync(articlesDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true, article: newArticle });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save article' });
    }
});

app.delete('/api/articles/:id', (req, res) => {
    try {
        let data = JSON.parse(fs.readFileSync(articlesDbPath, 'utf8'));
        const id = parseInt(req.params.id);
        const article = data.find(a => a.id === id);
        
        if(article && article.cover) {
            const filepath = path.join(__dirname, 'uploads', article.cover);
            if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }
        
        data = data.filter(a => a.id !== id);
        fs.writeFileSync(articlesDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// Kajian endpoints
app.get('/api/kajian', (req, res) => {
    try {
        const data = fs.readFileSync(kajianDbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read kajian data' });
    }
});

app.post('/api/kajian', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(kajianDbPath, 'utf8'));
        const newKajian = {
            id: Date.now(),
            title: req.body.title,
            speaker: req.body.speaker,
            time: req.body.time
        };
        data.unshift(newKajian);
        fs.writeFileSync(kajianDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true, kajian: newKajian });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save kajian' });
    }
});

app.delete('/api/kajian/:id', (req, res) => {
    try {
        let data = JSON.parse(fs.readFileSync(kajianDbPath, 'utf8'));
        const id = parseInt(req.params.id);
        data = data.filter(k => k.id !== id);
        fs.writeFileSync(kajianDbPath, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete kajian' });
    }
});

// 1. Community Ledger API
app.get('/api/ledger', (req, res) => {
    try {
        const data = fs.readFileSync(ledgerDbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read ledger' });
    }
});

app.post('/api/ledger', (req, res) => {
    try {
        const { type, amount, desc } = req.body;
        if (!type || !amount || !desc) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        
        const data = JSON.parse(fs.readFileSync(ledgerDbPath, 'utf8'));
        const newEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            type,
            amount: parseInt(amount),
            desc
        };
        data.push(newEntry);
        fs.writeFileSync(ledgerDbPath, JSON.stringify(data, null, 2));
        
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save ledger' });
    }
});

// 2. AI Tajwid Analyzer (Mockup)
// Expects an audio blob from client
app.post('/api/tajwid', upload.single('audio'), (req, res) => {
    // In a real app, send req.file to an AI Audio Processing API (e.g., Whisper + custom model)
    // For Phase 2, we simulate a response after a slight delay
    setTimeout(() => {
        const mockResponses = [
            { score: 95, notes: "MashaAllah, bacaan sangat tartil dan makhraj huruf tepat." },
            { score: 80, notes: "Perhatikan hukum Ikhfa pada kata 'min qablikum', tahan dengung 2 harakat." },
            { score: 88, notes: "Qalqalah Sughra sudah terdengar jelas, pertahankan kecepatan." },
            { score: 75, notes: "Panjang Mad Thabi'i kurang konsisten, pastikan 2 harakat rata." }
        ];
        const randomResp = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        
        res.json({
            success: true,
            analysis: randomResp
        });
    }, 2000); // Simulate processing time
});

// 3. Tafsir AI Interaktif (Mockup Chat)
app.post('/api/tafsir-chat', (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    // In a real app, query OpenAI API or similar with a system prompt like:
    // "Anda adalah mufassir AI ahli tafsir Ibnu Katsir..."
    
    setTimeout(() => {
        const mockResponse = `Berdasarkan pertanyaan Anda "${question}", para ulama tafsir menjelaskan bahwa ayat ini mengandung makna yang sangat mendalam terkait rahmat Allah yang mendahului murka-Nya. Kita dianjurkan untuk senantiasa bertawakal... (Ini adalah respons simulasi AI Tafsir)`;
        
        res.json({
            success: true,
            reply: mockResponse
        });
    }, 1500);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Serving static files from ${path.join(__dirname, '.')}`);
});

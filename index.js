require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { google } = require('googleapis');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

app.use(express.json()); // JSON 미들웨어 설정

async function initializeDbConnection() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'tjsals6092',
        database: 'todoapp',
    });
    return connection;
}

function convertToMySQLDatetime(datetime) {
    return datetime.replace('T', ' ').replace('Z', '');
}

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '아이디와 비밀번호를 모두 제공해야 합니다.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const connection = await initializeDbConnection();
        await connection.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: '회원가입 중 오류가 발생했습니다.' });
    }
});

app.post('/signin', async (req, res) => {
    const { id, password } = req.body;
    const connection = await initializeDbConnection();
    const [user] = await connection.execute('SELECT * FROM users WHERE username = ?', [id]);

    if (user.length === 0) {
        return res.status(401).json({ message: '유효하지 않은 아이디입니다.' });
    }

    const validPassword = await bcrypt.compare(password, user[0].password);
    if (!validPassword) {
        return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    const accessToken = jwt.sign({ userId: user[0].id }, JWT_SECRET, { expiresIn: '5m' });
    const refreshToken = jwt.sign({ userId: user[0].id }, JWT_SECRET, { expiresIn: '14d' });

    await connection.execute('INSERT INTO refresh_tokens (token, userId) VALUES (?, ?)', [refreshToken, user[0].id]);

    res.status(200).json({ accessToken, refreshToken });
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', expired: true });
            } else {
                return res.sendStatus(403); // Forbidden
            }
        }
        req.user = user;
        next();
    });
}

app.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken == null) return res.sendStatus(401);

    const connection = await initializeDbConnection();
    const [token] = await connection.execute('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);

    if (token.length === 0) {
        return res.status(403).json({ message: '유효하지 않은 리프레시 토큰입니다.' });
    }

    jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '5m' });
        res.json({ accessToken });
    });
});

app.get('/todo', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        res.status(200).json({ message: 'To-Do 항목을 조회합니다.' });
    } catch (error) {
        console.error('Error during fetching To-Do items:', error);
        res.status(500).json({ message: 'To-Do 항목 조회 중 오류가 발생했습니다.' });
    }
});

app.post('/todoWithGoogleCalendar', authenticateToken, async (req, res) => {
    const { start, end, summary, description, authCode } = req.body;

    console.log('Received request with data:', req.body);

    if (!start || !end || !summary || !description || !authCode) {
        return res.status(400).json({ message: '모든 필드를 입력해야 합니다.' });
    }

    const startDate = convertToMySQLDatetime(start);
    const endDate = convertToMySQLDatetime(end);

    try {
        const connection = await initializeDbConnection();
        await connection.execute('INSERT INTO calendar_events (start, end, summary, description, userId) VALUES (?, ?, ?, ?, ?)', [startDate, endDate, summary, description, req.user.userId]);

        console.log('Auth Code:', authCode);
        const { tokens } = await oAuth2Client.getToken(authCode);
        oAuth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        await calendar.events.insert({
            calendarId: 'primary',
            resource: {
                summary: summary,
                description: description,
                start: { dateTime: start },
                end: { dateTime: end },
            },
        });

        res.status(201).json({ message: '일정이 성공적으로 추가되었습니다.' });
    } catch (error) {
        console.error('Error during adding event:', error);
        res.status(500).json({ message: '일정 추가 중 오류가 발생했습니다.' });
    }
});

app.get('/generateAuthUrl', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
    });
    res.send({ url: authUrl });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

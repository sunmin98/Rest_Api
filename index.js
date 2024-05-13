const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_jwt_secret';

app.use(express.json());

// 데이터베이스 연결 설정
async function initializeDbConnection() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'tjsals6092',
        database: 'todoapp',
    });
    return connection;
}

app.post('/signup', async (req, res) => {
    const { username, password } = req.body; // id 대신 username으로 변경

    if (!username || !password) {
        return res.status(400).json({ message: '아이디와 비밀번호를 모두 제공해야 합니다.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // bcrypt를 사용하여 비밀번호 해싱

        const connection = await initializeDbConnection();
        await connection.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]); // id 대신 username으로 변경

        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: '회원가입 중 오류가 발생했습니다.' });
    }
});



// 로그인 API
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

    // 로그인에 성공하면 JWT 생성
    const accessToken = jwt.sign({ userId: user[0].id }, JWT_SECRET, { expiresIn: '5m' });
    const refreshToken = jwt.sign({ userId: user[0].id }, JWT_SECRET, { expiresIn: '14d' });

    // 리프레시 토큰은 DB에 저장
    await connection.execute('INSERT INTO refresh_tokens (token, userId) VALUES (?, ?)', [refreshToken, user[0].id]);

    res.status(200).json({ accessToken, refreshToken });
});

// access token을 검증하는 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// access token 갱신 API
app.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    const connection = await initializeDbConnection();

    const [token] = await connection.execute('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);

    if (token.length === 0) {
        return res.status(401).json({ message: '유효하지 않은 리프레시 토큰입니다.' });
    }

    // 리프레시 토큰 검증 후 새로운 액세스 토큰 발급
    const accessToken = jwt.sign({ userId: token[0].userId }, JWT_SECRET, { expiresIn: '5m' });

    res.status(200).json({ accessToken });
});

// 인증 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// 인증이 필요한 작업 구현 (예: To-Do 항목 조회)
app.get('/todo', authenticateToken, async (req, res) => {
    try {
        // 인증이 필요한 작업 수행
        const userId = req.user.userId; // 요청에서 사용자 ID 추출하여 활용
        // 여기서부터 인증된 사용자의 To-Do 항목을 조회하거나 다른 작업 수행 가능
        res.status(200).json({ message: 'To-Do 항목을 조회합니다.' });
    } catch (error) {
        console.error('Error during fetching To-Do items:', error);
        res.status(500).json({ message: 'To-Do 항목 조회 중 오류가 발생했습니다.' });
    }
});



// 서버 실행
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
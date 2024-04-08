const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 3000;

app.use(express.json());

// 데이터베이스 연결 설정
async function initializeDbConnection() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'tjsals6092', // 여기서 비밀번호를 자신의 설정에 맞게 수정하세요.
        database: 'todoapp',
    });
    return connection;
}

// To-Do 항목 생성
app.post('/todos', async (req, res) => {
    const { title, content, isCompleted } = req.body;
    const connection = await initializeDbConnection();

    const [result] = await connection.execute(
        'INSERT INTO todos (title, content, isCompleted) VALUES (?, ?, ?)',
        [title, content, isCompleted]
    );

    res.status(201).json({ message: 'To-Do 항목이 생성되었습니다.', todoId: result.insertId });
});

// 모든 To-Do 항목 조회
app.get('/todos', async (req, res) => {
    const connection = await initializeDbConnection();

    const [todos] = await connection.execute('SELECT * FROM todos');

    res.status(200).json(todos);
});

// 특정 ID의 To-Do 항목 조회
app.get('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await initializeDbConnection();

    const [todos] = await connection.execute('SELECT * FROM todos WHERE id = ?', [id]);

    if (todos.length === 0) {
        return res.status(404).json({ message: '해당 ID의 To-Do 항목을 찾을 수 없습니다.' });
    }

    res.status(200).json(todos[0]);
});

// 특정 ID의 To-Do 항목 업데이트
app.put('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content, isCompleted } = req.body;
    const connection = await initializeDbConnection();

    const [result] = await connection.execute(
        'UPDATE todos SET title = ?, content = ?, isCompleted = ? WHERE id = ?',
        [title, content, isCompleted, id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: '해당 ID의 To-Do 항목을 찾을 수 없습니다.' });
    }

    res.status(200).json({ message: 'To-Do 항목이 업데이트되었습니다.' });
});

// 특정 ID의 To-Do 항목 삭제
app.delete('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await initializeDbConnection();

    const [result] = await connection.execute('DELETE FROM todos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: '해당 ID의 To-Do 항목을 찾을 수 없습니다.' });
    }

    res.status(200).json({ message: 'To-Do 항목이 성공적으로 삭제되었습니다.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

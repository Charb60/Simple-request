const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer'); 
const path = require('path'); 

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// Create connection to MySQL database mamp server
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nodeDB'
});

// Configure multer for file uploads
const storage = multer.diskStorage({//กำหนดการตั้งค่าการจัดเก็บไฟล์ที่ถูกอัปโหลดโดย multer
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); //กำหนดโฟลเดอร์ที่ไฟล์จะถูกบันทึกลงไป ex บันทึกเก็บรูปภาพไปที่ ไฟล์uploads 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); //กำหนดชื่อไฟล์
    }
});

const upload = multer({ storage: storage });//ตั้งค่าการจัดเก็บที่กำหนดไว้ในตัวแปร storage ใช้เพื่อจัดการการอัปโหลดไฟล์ในแอปพลิเคชัน

//เชื่อมต่อกับ Database 
connection.connect(err => {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});

// All data in users table
app.get('/api/users', (req, res) => {  //กำหนด route GET request มายัง URL /api/users
    const sql = 'SELECT * FROM users';
    connection.query(sql, (err, results) => { //DB connection
        if (err) throw err;
        res.send(results);
    });
});
// POST users request images multiple file 
app.post('/api/userspost', upload.array('images', 10), (req, res) => { //upload.array('images', 10)อัปโหลดได้สูงสุด 10 ไฟล์)
    const { id, title, body } = req.body;
    const files = req.files;

    if (!files) {
        console.error("No files uploaded");
        return res.status(400).send("No files uploaded");
    }

    // Debugging: Log file paths  
    files.forEach(file => {//ลูปผ่านไฟล์ทั้งหมดที่ถูกอัปโหลดและพิมพ์ตำแหน่งของไฟล์ปที่คอนโซลเพื่อการตรวจสอบ (debugging)
        console.log(`File uploaded: ${file.path}`); 
    });

    // Store image file paths in the database
    const imagePaths = files.map(file => file.path);//array imagePaths ที่เก็บตำแหน่งของไฟล์ทั้งหมดโดยใช้ .map() ฟังก์ชัน ซึ่งจะแปลงข้อมูลของไฟล์ที่อัปโหลดให้กลายเป็นตำแหน่งเก็บไฟล์ (path)

    const sql = 'INSERT INTO users (id, title, body, images) VALUES (?, ?, ?, ?)';
    const values = [id, title, body, JSON.stringify(imagePaths)];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            res.status(500).send('Error inserting user');
            return;
        }
        console.log('Inserted user successfully');
        res.send(result);
    });
});

// PUT request to update a user and optionally replace images
app.put('/api/users/:id', upload.array('images', 10), (req, res) => {
    const { id } = req.params; // ดึง ID จาก URL params
    const { title, body } = req.body; // ดึงข้อมูลจาก body ของ request
    const files = req.files; // ดึงไฟล์ที่อัปโหลดมา

    // ตรวจสอบว่าฟิลด์ title และ body ถูกส่งมาหรือไม่
    if (!title || !body) {
        return res.status(400).send('Missing required fields');
    }

    // ตรวจสอบว่ามีไฟล์รูปภาพที่ถูกอัปโหลดมาหรือไม่
    let imagePaths;
    if (files && files.length > 0) {
        // หากมีไฟล์รูปภาพ ให้บันทึกตำแหน่งไฟล์
        imagePaths = files.map(file => file.path);
        // imagePaths = files.map(file => file.filename); 

    } else {
        // หากไม่มีไฟล์ใหม่ ให้ใช้รูปภาพเดิม
        imagePaths = req.body.images ? JSON.parse(req.body.images) : [];
    }

    // สร้างคำสั่ง SQL สำหรับการอัปเดตข้อมูล
    const sql = 'UPDATE users SET title = ?, body = ?, images = ? WHERE id = ?';
    const values = [title, body, JSON.stringify(imagePaths), id];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            res.status(500).send('Error updating user');
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('User not found');
        }
        console.log('Updated user successfully');
        res.send('User updated successfully');
    });
});

// DELETE request to remove a users
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM users WHERE id = ?';
    const values = [id];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            res.status(500).send('Error deleting user');
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('User not found');
        }
        console.log('Deleted user successfully');
        res.send('User deleted successfully');
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

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
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify the folder for storing images
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename files to avoid conflicts
    }
});

const upload = multer({ storage: storage });

connection.connect(err => {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});

// All data in users table
app.get('/api/users', (req, res) => {
    const sql = 'SELECT * FROM users';
    connection.query(sql, (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});
// POST users request images multiple file 
app.post('/api/userspost', upload.array('images', 10), (req, res) => {
    const { id, title, body } = req.body;
    const files = req.files;

    if (!files) {
        console.error("No files uploaded");
        return res.status(400).send("No files uploaded");
    }

    // Debugging: Log file paths
    files.forEach(file => {
        console.log(`File uploaded: ${file.path}`);
    });

    // Store image file paths in the database
    const imagePaths = files.map(file => file.path);

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

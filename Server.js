const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./bookings.db');
db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, 
  first_name TEXT, 
  surname TEXT, 
  email TEXT, 
  phone TEXT, 
  device TEXT, 
  symptoms TEXT, 
  delivery_option TEXT, 
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const client = new Client({ authStrategy: new LocalAuth() });
client.on('qr', qr => { console.log('Scan this QR with WhatsApp:'); qrcode.generate(qr, {small: true}); });
client.on('ready', () => console.log('WhatsApp is Ready!'));
client.initialize();

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/public/admin.html'));

app.post('/book', (req, res) => {
  const { first_name, surname, email, phone, device, symptoms, delivery_option } = req.body;
  
  db.run('INSERT INTO bookings (first_name,surname,email,phone,device,symptoms,delivery_option) VALUES (?,?,?,?,?,?,?)', 
    [first_name, surname, email, phone, device, symptoms, delivery_option]);

  const message = `✅ *Dyltech Booking Confirmed!*\n\nName: ${first_name} ${surname}\nDevice: ${device}\nIssue: ${symptoms}\nOption: ${delivery_option || 'Pickup'}\n\nThank you! We'll contact you soon.`;

  client.sendMessage(phone.replace(/\D/g,'') + '@c.us', message)
    .then(() => console.log('WhatsApp sent'))
    .catch(e => console.error(e));

  res.send(`<h2>Booking Received!</h2><p>Confirmation sent via WhatsApp to ${phone}.</p><a href="/">Back to Form</a>`);
});

app.get('/api/bookings', (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY timestamp DESC', [], (err, rows) => res.json(rows || []));
});

app.listen(port, () => console.log(`Server running on port ${port}`));

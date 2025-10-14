import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend EVATIME is running ✅');
});

// POST /save: Enregistre les données reçues dans data.json
app.post('/save', (req, res) => {
  const data = req.body;
  fs.writeFile('backend/data.json', JSON.stringify(data, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de l’enregistrement', error: err });
    }
    res.json({ message: 'Données enregistrées localement', data });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const mongoURI =
  'mongodb+srv://maro:Quantix123!@threejs.3iyic.mongodb.net/save-scores?retryWrites=true&w=majority&appName=threejs';

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

const HighscoreSchema = new mongoose.Schema(
  {
    player: String,
    score: Number,
    date: { type: Date, default: Date.now },
  },
  { collection: 'scores', versionKey: false }
);

const Highscore = mongoose.model('Highscore', HighscoreSchema);

app.post('/save-score', async (req, res) => {
  const { player, score } = req.body;
  console.log('Received score:', score, 'from player:', player);
  try {
    const newHighscore = new Highscore({ player, score });
    await newHighscore.save();
    console.log('Score saved successfully');
    res.status(200).send('Score saved');
  } catch (err) {
    res.status(500).send('Failed to save score');
  }
});

app.get('/save-scores', async (req, res) => {
  try {
    const highscore = await Highscore.findOne().sort({ score: -1 });
    res.status(200).json(highscore);
  } catch (err) {
    res.status(500).send('Failed to retrieve highscore');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT);

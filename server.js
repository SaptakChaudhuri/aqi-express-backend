const express = require('express');
const axios = require('axios');
const dayjs = require('dayjs');
const cors = require('cors');

const app = express();
app.use(
  cors({
    origin: 'https://preeminent-griffin-da3e5b.netlify.app', // ✅ your frontend domain
    methods: ['GET', 'POST'],
    credentials: false,
  })
);
app.use(express.json());

const FLASK_API_URL = 'https://aqi-flask-ml-api.onrender.com/predict'; // 🔁 <--- YOUR FLASK URL

app.get('/fetch-aqi', async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD');

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm2_5,pm10,us_aqi&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

  try {
    const response = await axios.get(url);
    const { time, us_aqi } = response.data.hourly;

    // Get last 24 valid AQI points
    const aqi24 = us_aqi.slice(-24);

    // Send to Flask API
    const predictRes = await axios.post(FLASK_API_URL, {
      aqi_sequence: aqi24,
    });

    const predictedAQI = predictRes.data.predicted_next_3hr_avg_aqi;
    const currentAQI = us_aqi[us_aqi.length - 1];

    res.json({
      current_aqi: currentAQI,
      forecast_aqi: predictedAQI,
      trend: time.map((t, i) => ({
        time: t,
        us_aqi: us_aqi[i],
      })),
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch or predict AQI data' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

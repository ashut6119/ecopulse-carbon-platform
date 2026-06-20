import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Set up security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:"]
    }
  }
}));

// Disable X-Powered-By header to prevent server technology disclosure
app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/factors', (req, res) => {
  res.json({
    electricity: 0.385,
    naturalGas: 2.02,
    heatingOil: 2.68,
    lpg: 1.61,
    coal: 2.42,
    gasolineCar: 0.170,
    dieselCar: 0.171,
    hybridCar: 0.101,
    electricCar: 0.047,
    bus: 0.096,
    train: 0.035,
    flightShort: 0.245,
    flightLong: 0.150,
    dietHeavyMeat: 2.9,
    dietMediumMeat: 2.2,
    dietLowMeat: 1.7,
    dietVegetarian: 1.4,
    dietVegan: 1.1
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

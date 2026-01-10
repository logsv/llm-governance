import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import gateway from '@llm-governance/gateway';
import prompts from '@llm-governance/prompts';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Import libs to verify they work
app.get('/test-libs', (req, res) => {
  res.json({
    gateway: gateway.processRequest({}),
    prompt: prompts.getPrompt('test'),
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

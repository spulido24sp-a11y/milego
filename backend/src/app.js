import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './config/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { routes } from './routes/index.js';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(requestId);
app.use(requestLogger);
app.use('/api/v1', routes);
app.use(errorHandler);

export default app;
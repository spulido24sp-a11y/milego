import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './config/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { correlationId } from './middlewares/correlationId.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { routes } from './routes/index.js';
import { registerEventHandlers } from './events/register.js';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use('/admin', express.static(fileURLToPath(new URL('../../admin', import.meta.url))));
app.use('/uploads', express.static(new URL('../uploads', import.meta.url).pathname));
app.use(correlationId);
app.use(requestLogger);
app.use('/api/v1', routes);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const swaggerDocument = YAML.parse(readFileSync(`${__dirname}docs/openapi.yml`, 'utf8'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'MIleGo API Docs',
}));

registerEventHandlers();

app.use(errorHandler);

export default app;
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import groups from './routes/groups.js';
import members from './routes/members.js';
import auth from './routes/auth.js';
import { initSocket } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

const origins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: origins,
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api/auth', auth);
app.use('/api/groups', groups);
app.use('/api/members', members);

const io = new Server(httpServer, {
  cors: {
    origin: origins,
    credentials: true,
  },
});

initSocket(io);

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

import fs from 'fs';
import path from 'path';
import morgan from 'morgan';

const accessLogStream = fs.createWriteStream(
    path.join(import.meta.dirname, '../../../logs/access.log'),
    { flags: 'a' }
);


export const requestLogger = morgan('combined', { stream: accessLogStream });
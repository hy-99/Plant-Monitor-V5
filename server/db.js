import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to start the API server.');
}

export const sql = neon(connectionString);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.sql');

const splitSqlStatements = (schemaSource) =>
  schemaSource
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => `${statement};`);

export const initializeDatabase = async () => {
  const schemaSource = await fs.readFile(schemaPath, 'utf8');
  const statements = splitSqlStatements(schemaSource);

  for (const statement of statements) {
    await sql(statement);
  }
};

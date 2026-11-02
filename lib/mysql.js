// MySQL connection pool (relational data).
// Credentials come from environment variables — never hard-coded.
import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'MultiHospitalHealthcare',
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }
  return pool;
}

// Simple parameterised query helper (prevents SQL injection).
export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// Run several statements atomically inside a transaction.
export async function withTransaction(work) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

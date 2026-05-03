// Azure Database for MySQL (Flexible Server) 接続 & クエリ
// プールはプロセス内で1つだけ作成する（lazy init）
// Bot 側 line-mvp-api/src/db.js と接続条件・env 名を完全に揃えている。
import mysql, {
  type Pool,
  type PoolOptions,
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";

const sslEnabled = (process.env.MYSQL_SSL || "true") === "true";
// Azure MySQL Flexible Server の証明書チェーンが Node.js 標準 CA で検証できない環境向けに、
// CA 検証だけスキップする逃げ道を用意（通信は TLS で暗号化されたまま）。
// 本番で厳格に検証したいときは MYSQL_SSL_REJECT_UNAUTHORIZED=true にする。
const sslRejectUnauthorized =
  (process.env.MYSQL_SSL_REJECT_UNAUTHORIZED || "false") === "true";

const config: PoolOptions = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: sslEnabled
    ? { minVersion: "TLSv1.2", rejectUnauthorized: sslRejectUnauthorized }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  typeCast: true,
  multipleStatements: false,
  namedPlaceholders: true,
};

// Next.js は dev mode で hot-reload のたびにモジュールを再評価し、
// pool が複数作られて connection を食い潰す既知問題がある。
// globalThis にキャッシュして開発時もシングルトンを維持する。
const globalForPool = globalThis as unknown as { __mysqlPool?: Pool };

export function getPool(): Pool {
  if (globalForPool.__mysqlPool) return globalForPool.__mysqlPool;
  const pool = mysql.createPool(config);
  globalForPool.__mysqlPool = pool;
  console.log(
    `[db] MySQL connection pool created (host=${config.host}, db=${config.database}, verify=${sslRejectUnauthorized})`
  );
  return pool;
}

// mysql2 の execute() 型定義は named placeholder（runtime オプション
// `namedPlaceholders: true` で有効）を公式サポートしていないため、
// 第2引数の型を緩めるためのローカル別名。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExecuteParams = any;

/**
 * SELECT クエリの薄いラッパー。
 * @param sql - SQL 文字列。`:name` 形式の named placeholder を推奨
 * @param params - パラメータ。オブジェクト（named）でも配列（positional）でも可
 */
export async function query<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T[]> {
  const [rows] = await getPool().execute<T[]>(sql, params as ExecuteParams);
  return rows;
}

/**
 * INSERT/UPDATE/DELETE クエリの薄いラッパー。
 * 影響行数と insertId を返す。
 */
export async function execute(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(
    sql,
    params as ExecuteParams
  );
  return result;
}

/**
 * トランザクションが必要な操作のためのコネクション取得。
 * 必ず conn.release() で返却すること。
 */
export async function getConnection() {
  return getPool().getConnection();
}

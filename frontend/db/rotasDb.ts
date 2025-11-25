import * as SQLite from 'expo-sqlite';

// 🔹 Abre (ou cria) o banco local com a nova API síncrona
const db = SQLite.openDatabaseSync('rotas.db');

// 🔹 Cria tabela se não existir
export const initDatabase = (): void => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS rotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origem TEXT NOT NULL,
      destino TEXT NOT NULL,
      distancia TEXT,
      tempo TEXT,
      modo TEXT
    );
  `);
};

export const salvarRota = async (
  origem: string,
  destino: string,
  distancia: string,
  tempo: string,
  modo: string
): Promise<void> => {

  // Verificar se já existe essa rota
  const existente = db.getFirstSync(
    `SELECT id FROM rotas 
     WHERE origem = ? AND destino = ? AND modo = ?`,
    [origem, destino, modo]
  );

  // Se já existe, não salva novamente
  if (existente) {
    return;
  }

  // Se for nova, salva
  db.runSync(
    'INSERT INTO rotas (origem, destino, distancia, tempo, modo) VALUES (?, ?, ?, ?, ?);',
    [origem, destino, distancia, tempo, modo]
  );
};

// 🔹 Lista todas as rotas salvas
export const listarRotas = async (): Promise<
  { id: number; origem: string; destino: string; distancia: string; tempo: string; modo: string }[]
> => {
  const result = db.getAllSync('SELECT * FROM rotas ORDER BY id DESC;');
  return result as any;
};

// 🔹 Limpa histórico
export const limparHistorico = async (): Promise<void> => {
  db.runSync('DELETE FROM rotas;');
};

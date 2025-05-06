const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  // Configure your Aiven MySQL connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql-28cae33d-simple-sql-command.j.aivencloud.com',
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_opSO5z5TulYI8UUrsF2',
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT || 12631,
    ssl: {
      rejectUnauthorized: true
    }
  });

  try {
    const { query } = req.body;
    const [results] = await connection.execute(query);
    res.status(200).json({ data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await connection.end();
  }
};

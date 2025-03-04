const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
const PORT = 3001;

// Configuración de CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["https://monraspgit.github.io", "http://localhost:3000"];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Permite cookies y credenciales
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configurar conexión con Pool de MySQL
const db = mysql.createPool({
  host: "bwbxqngh9d4wr6bnopb3-mysql.services.clever-cloud.com",
  user: "uojgcj0odvcjvrps",
  password: "U1Ko8svIUDDEPhSDxvJ",
  database: "bwbxqngh9d4wr6bnopb3",
  port: 20996,
  waitForConnections: true,
  connectionLimit: 10, // Número máximo de conexiones activas
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error al conectar a la base de datos:", err.message);
  } else {
    console.log("✅ Conexión a la base de datos establecida.");
    connection.release(); // Libera la conexión para que pueda ser reutilizada
  }
});

// Manejador de errores en el pool
db.on("error", (err) => {
  console.error("⚠️ Error en la conexión de la base de datos:", err.message);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("🔄 Reconectando a la base de datos...");
  } else {
    throw err;
  }
});

// Mantener la conexión activa con un ping periódico
setInterval(() => {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("⚠️ Error en el Keep Alive:", err.message);
    } else {
      console.log("🔄 Ping a la base de datos para mantener conexión activa");
    }
  });
}, 30000); // Ejecuta cada 30 segundos
// Endpoint para obtener todos los productos
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
    if (err) {
      console.error("❌ Error al obtener productos:", err.message);
      return res.status(500).json({ error: "Error al obtener productos" });
    }
    res.json(results);
  });
});

// Endpoint para obtener un producto por ID
app.get("/products/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM products WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("❌ Error al obtener el producto:", err.message);
      return res.status(500).json({ error: "Error al obtener el producto" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(results[0]);
  });
});

// Endpoint para crear un producto
app.post("/products", (req, res) => {
  // Añade currency a la desestructuración
  const { name, price, image, description, currency } = req.body;

  // Ajusta la consulta para insertar también currency
  db.query(
    "INSERT INTO products (name, price, image, description, currency) VALUES (?, ?, ?, ?, ?)",
    [name, price, image, description, currency], // <-- 5 valores
    (err, result) => {
      if (err) {
        console.error("❌ Error al insertar producto:", err.message);
        return res.status(500).json({ error: "Error al insertar producto" });
      }
      // Retorna el objeto con currency incluido
      res.json({
        id: result.insertId,
        name,
        price,
        image,
        description,
        currency,
      });
    }
  );
});


// Endpoint para actualizar un producto
app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  // Añade currency a la desestructuración
  const { name, price, image, description, currency } = req.body;

  db.query(
    "UPDATE products SET name = ?, price = ?, image = ?, description = ?, currency = ? WHERE id = ?",
    [name, price, image, description, currency, id], // <-- 6 valores
    (err, result) => {
      if (err) {
        console.error("❌ Error al actualizar producto:", err.message);
        return res.status(500).json({ error: "Error al actualizar producto" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      // Devuelve currency en la respuesta
      res.json({ id, name, price, image, description, currency });
    }
  );
});


// Endpoint para eliminar un producto
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("❌ Error al eliminar producto:", err.message);
      return res.status(500).json({ error: "Error al eliminar producto" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: " Producto eliminado correctamente" });
  });
});



// Endpoint para iniciar sesión
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Verificamos que el usuario y la pass no vengan vacíos
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  // Consulta a la base de datos
  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error("❌ Error al validar login:", err.message);
        return res.status(500).json({ error: "Error en el servidor" });
      }

      // Si no encontró resultados, credenciales inválidas
      if (results.length === 0) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // Login exitoso
      const user = results[0]; // Objeto con { id, username, password }
      return res.json({
        message: "Login exitoso",
        usuario: {
          id: user.id,
          username: user.username,
          // No retornamos la contraseña en la respuesta final
        },
      });
    }
  );
});



// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  });

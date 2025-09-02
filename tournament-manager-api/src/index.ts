import express from "express";
import mongoose, { model, Schema } from "mongoose";
import { Kafka } from "kafkajs";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tournament_designer';
const KAFKA_BROKER = process.env.KAFKA_BROKER || "kafka:9092";
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "tournaments";

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Pass to next layer of middleware
    next();
});

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));


const tournamentSchema = new Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    roster: [{
      id: { type: Number, required: true },
      name: { type: String, required: true },
      weight: { type: Number, required: true },
      age: { type: Number, required: true },
    }]
  },
  { timestamps: true }
);

const Tournament = model("Tournament", tournamentSchema);

const kafka = new Kafka({
  clientId: "tournament-api",
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();
// Conéctalo una vez al iniciar el server
(async () => {
  try {
    await producer.connect();
    console.log(`✅ Kafka producer conectado a ${KAFKA_BROKER}`);
  } catch (e) {
    console.error("❌ No se pudo conectar a Kafka:", e.message);
  }
})();

app.post('/upload-data', async (req, res) => {
  const data = req.body;
  // Here you would handle the data upload logic
  console.log("Data received:", data);

  await Tournament.insertMany(req.body);
  res.status(201).json({ message: `Inserted ${req.body.length} tournaments!` });
});

app.get('/fetch-tournaments', async (req, res) => {
  const tournaments = await Tournament.find();
  res.status(200).json(tournaments);
});

app.post("/registrar", async (req, res) => {
  try {
    const { title, type, roster } = req.body || {};

    // Validación mínima
    if (!title || !type || !Array.isArray(roster) || roster.length === 0) {
      return res.status(400).json({
        error:
          "Body inválido. Requeridos: { title: string, type: string, roster: [{id,name,weight,age}, ...] }",
      });
    }

    // Guardar en Mongo
    const doc = await Tournament.create({ title, type, roster });

    // Publicar en Kafka (si el producer está conectado)
    try {
      await producer.send({
        topic: KAFKA_TOPIC,
        messages: [
          {
            key: String(doc._id),
            value: JSON.stringify({
              _id: doc._id,
              title: doc.title,
              type: doc.type,
              roster: doc.roster,
              createdAt: doc.createdAt,
            }),
          },
        ],
      });
    } catch (kerr) {
      // No fallamos la request por error de Kafka (opcional)
      console.error("⚠️ Error enviando a Kafka:", kerr.message);
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error("❌ Error en /registrar:", err);
    return res.status(500).json({ error: "failed to create tournament" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Tournament Designer API is running!" });
});

process.on("SIGINT", async () => {
  try {
    await producer.disconnect();
  } catch {}
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

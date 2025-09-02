import { Kafka } from "kafkajs";

const broker = process.env.KAFKA_BROKER || "kafka:9092";
const topic = process.env.KAFKA_TOPIC || "tournaments";

const kafka = new Kafka({ clientId: "tournament-job", brokers: [broker] });
const consumer = kafka.consumer({ groupId: "tournament-job-group" });

(async () => {
  console.log(`🎧 Consumidor iniciado. Broker=${broker}, Topic=${topic}`);
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message, partition }) => {
      console.log(`\n[partition ${partition}] key=${message.key?.toString() || ""}`);
      console.log(message.value?.toString());
    }
  });
})().catch(err => {
  console.error("Consumer error:", err);
  process.exit(1);
});
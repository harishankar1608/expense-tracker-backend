import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "message-app",
  brokers: [`${process.env.KAFKA_PORT}`],
});

const producer = kafka.producer();

export const connectKafka = async () => {
  await producer.connect();
};

export const sendEventsToKafka = async (topic, messages) => {
  console.log(topic, messages, "topic and mess");
  const result = await producer.send({
    topic,
    messages: [{ value: JSON.stringify(messages) }],
  });
  console.log(result, "Result");
};

// const disconnectKafka = async () => await producer.disconnect();

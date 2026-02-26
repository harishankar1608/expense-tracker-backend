About the Project

This repository acts as a primary backend service for expense tracker application.

Built With

- [Node.js][nodejs-url]
- [PostgreSQL][postgresql-url]
- [Sequelize][sequelize-url]
- [Apache Kafka][apache-kafka-url]
- [Redis][redis-url]

Prerequisites:

- PostgreSQL

  - Run postgres application as docker container or in a PostgreSQL local setup
  - Docker container for postgres setup steps
  - Refer the schema.sql file and create tables in PostgreSQL database
  - Include the database url in .env file

- Redis

  - Run redis as docker container or run redis in cloud environment
  - Follow the steps to run redis in a docker container in localhost port 6379

    - Ensure you have docker desktop installed
    - Enter the following command to create docker container for redis with your preferred password

      ```sh
      docker run -p 6379:6379 redis:latest redis-server --requirepass 'password-for-redis'
      ```

    - Utilise the password in the connection url

  - Include the redis connection url in .env file

    - The connection url should look like the following

      ```sh
      redis://default:password-for-redis@127.0.0.1:6379
      ```

- Apache Kafka

  - Run Apache kafka docker image and expose port 19092 in localhost

    ```sh
    docker run -p 9092:9092 -d \
    -e KAFKA_CLUSTER_ID=67890abcdefghijklmnopqrstuvw \
    -e KAFKA_LISTENERS=INTERNAL://0.0.0.0:9093,CLIENT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9091 \
    -e KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL \
    -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,CLIENT:PLAINTEXT,CONTROLLER:PLAINTEXT \
    -e KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka:9093,CLIENT://127.0.0.1:9092 \
    -e KAFKA_NODE_ID=1 \
    -e KAFKA_PROCESS_ROLES=broker,controller \
    -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@127.0.0.1:9091 \
    -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
    -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
    -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
    -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
    apache/kafka:latest
    ```

  - Execute the following commnad to view all the running container in docker

    ```sh
    docker ps
    ```

  - Copy the apache/kafka:latest container id

  - Execute the following commnad to Get in Apache kafka docker container's shell command in interative mode

    ```sh
    docker exec -it <container_id> sh
    ```

  - Navigate to kafka binary directory with the following command
    ```sh
    cd /opt/kafka/bin
    ```
  - Execute the following command to create topic for the consumers to listen

    ```sh
    ./kafka-topics.sh --create --topic websocket_messages --bootstrap-server localhost:9092
    ```

Get Started

- Install dependencies

  ```sh
    npm install
  ```

- Start Node.js server locally

  ```sh
    npm run dev
  ```

Next Steps:

- Launch the [Expense Tracker Messaging And Caching Microservices][expense-tracker-microservices]
- Launch the [Expense Tracker Frontend Application][expense-tracker-frontend]

NOTE:

- In this repository Redis is only used to read data, writing data to redis is handled in expense-tracker-microservices/expense-tracker-caching-service repository
- In this repository Kafka is only used to produce events, event consumers are available in both expense-tracker-microservices (expense-tracker-caching-service and expense-tracker-messaging-service)

[expense-tracker-microservices]: https://github.com/harishankar1608/expense-tracker-microservices
[expense-tracker-frontend]: https://github.com/harishankar1608/expense-tracker-frontend
[nodejs-url]: https://nodejs.org/en
[postgresql-url]: https://www.postgresql.org/
[apache-kafka-url]: https://kafka.apache.org/
[redis-url]: https://redis.io/
[sequelize-url]: https://sequelize.org/

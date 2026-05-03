const { runCommand, waitForLocalStackHealth } = require("./_common");

async function main() {
  console.log("Starting LocalStack with Docker Compose...");
  runCommand("docker", ["compose", "-f", "docker/localstack/docker-compose.yml", "up", "-d"]);

  console.log("Waiting for LocalStack health...");
  await waitForLocalStackHealth();
  console.log("LocalStack is healthy.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

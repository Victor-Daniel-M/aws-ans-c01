const { runCommand } = require("./_common");

function main() {
  console.log("Stopping LocalStack and removing state...");
  runCommand("docker", ["compose", "-f", "docker/localstack/docker-compose.yml", "down", "-v"]);
  console.log("LocalStack is down.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

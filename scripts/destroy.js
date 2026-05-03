const { runCommand } = require("./_common");

function main() {
  console.log("Destroying CDK stacks...");
  runCommand("npx", ["cdklocal", "destroy", "AppStack", "FoundationStack", "--force"]);
  console.log("CDK stacks destroyed.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

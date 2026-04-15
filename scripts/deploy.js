const { runCommand } = require("./_common");

function main() {
  console.log("Synthesizing CDK app...");
  runCommand("npx", ["cdk", "synth", "FoundationStack", "AppStack"]);

  console.log("Deploying CDK stacks to LocalStack...");
  runCommand("npx", [
    "cdklocal",
    "deploy",
    "FoundationStack",
    "AppStack",
    "--require-approval",
    "never",
    "--method",
    "direct",
  ]);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

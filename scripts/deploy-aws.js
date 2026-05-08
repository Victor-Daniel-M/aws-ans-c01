process.env.DEPLOY_TARGET = "aws";

const { AWS_REGION, resolveAwsAccountId, runCommand } = require("./_common");

function main() {
  const accountId = !process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT === "000000000000"
    ? resolveAwsAccountId()
    : process.env.CDK_DEFAULT_ACCOUNT;
  process.env.CDK_DEFAULT_ACCOUNT = accountId;

  console.log(`Synthesizing CDK app for AWS account ${accountId} in ${AWS_REGION}...`);
  runCommand("npx", ["cdk", "synth", "FoundationStack", "AppStack"]);

  console.log("Deploying CDK stacks to AWS...");
  runCommand("npx", [
    "cdk",
    "deploy",
    "FoundationStack",
    "AppStack",
    "--require-approval",
    "never",
  ]);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

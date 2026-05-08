process.env.DEPLOY_TARGET = "aws";

const { AWS_REGION, resolveAwsAccountId, runCommand } = require("./_common");

function main() {
  const accountId = !process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT === "000000000000"
    ? resolveAwsAccountId()
    : process.env.CDK_DEFAULT_ACCOUNT;
  process.env.CDK_DEFAULT_ACCOUNT = accountId;

  console.log(`Bootstrapping CDK for AWS account ${accountId} in ${AWS_REGION}...`);
  runCommand("npx", ["cdk", "bootstrap", `aws://${accountId}/${AWS_REGION}`]);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

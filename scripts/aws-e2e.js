process.env.DEPLOY_TARGET = "aws";

const { runCommand } = require("./_common");

function runStep(name, command, args) {
  console.log(`Starting ${name}...`);
  runCommand(command, args);
  console.log(`Completed ${name}.`);
}

function tryDestroy() {
  try {
    runStep("aws:destroy", "yarn", ["aws:destroy"]);
  } catch (error) {
    console.error(`Automatic teardown failed: ${error.message}`);
    throw error;
  }
}

function main() {
  let originalError;

  try {
    runStep("aws:deploy", "yarn", ["aws:deploy"]);
    runStep("aws:verify", "yarn", ["aws:verify"]);
  } catch (error) {
    originalError = error;
    console.error(`AWS E2E failed before teardown: ${error.message}`);
  }

  try {
    tryDestroy();
  } catch (destroyError) {
    if (originalError) {
      throw new Error(
        `${originalError.message}\nAdditionally, automatic teardown failed: ${destroyError.message}`,
      );
    }
    throw destroyError;
  }

  if (originalError) {
    throw originalError;
  }

  console.log("AWS end-to-end flow completed successfully.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

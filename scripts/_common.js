const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
const localEnvPath = path.join(rootDir, ".env");
const awsEnvPath = path.join(rootDir, ".env.real");
const exampleEnvPath = path.join(rootDir, ".env.example");
const requestedDeployTarget = process.env.DEPLOY_TARGET || "localstack";

if (requestedDeployTarget === "localstack" && !fs.existsSync(localEnvPath) && fs.existsSync(exampleEnvPath)) {
  fs.copyFileSync(exampleEnvPath, localEnvPath);
}

const resolvedEnvPath = process.env.ENV_FILE
  ? path.resolve(rootDir, process.env.ENV_FILE)
  : requestedDeployTarget === "aws" && fs.existsSync(awsEnvPath)
    ? awsEnvPath
    : fs.existsSync(localEnvPath)
      ? localEnvPath
      : exampleEnvPath;

dotenv.config({ path: resolvedEnvPath });

const DEPLOY_TARGET = process.env.DEPLOY_TARGET || requestedDeployTarget;
const isAwsTarget = DEPLOY_TARGET === "aws";
const isLocalStackTarget = !isAwsTarget;

const LOCALSTACK_HOST = process.env.LOCALSTACK_HOST || "localhost";
const EDGE_PORT = process.env.EDGE_PORT || "4566";
const AWS_REGION = process.env.AWS_DEFAULT_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";
const CDK_DEFAULT_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT || (isLocalStackTarget ? "000000000000" : "");
const endpoint = isLocalStackTarget ? `http://${LOCALSTACK_HOST}:${EDGE_PORT}` : undefined;

function withAwsEnv(extra = {}) {
  const env = {
    ...process.env,
    AWS_DEFAULT_REGION: AWS_REGION,
    AWS_REGION,
    CDK_DEFAULT_REGION: process.env.CDK_DEFAULT_REGION || AWS_REGION,
    ...extra,
  };

  if (CDK_DEFAULT_ACCOUNT) {
    env.CDK_DEFAULT_ACCOUNT = CDK_DEFAULT_ACCOUNT;
  }

  if (isLocalStackTarget) {
    return {
      ...env,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "test",
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "test",
      AWS_ENDPOINT_URL: endpoint,
      AWS_ENDPOINT_URL_S3: endpoint,
      LOCALSTACK_HOST,
      EDGE_PORT,
    };
  }

  delete env.AWS_ENDPOINT_URL;
  delete env.AWS_ENDPOINT_URL_S3;
  delete env.LOCALSTACK_HOST;
  delete env.EDGE_PORT;
  return env;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: rootDir,
    env: withAwsEnv(options.env),
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(pathname) {
  if (!endpoint) {
    return Promise.reject(new Error("LocalStack endpoint is not configured for the current deploy target."));
  }

  return new Promise((resolve, reject) => {
    const req = http.get(`${endpoint}${pathname}`, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed with status ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
  });
}

async function waitForLocalStackHealth(timeoutMs = 120000) {
  if (!isLocalStackTarget) {
    throw new Error("LocalStack health checks are only available when DEPLOY_TARGET=localstack.");
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const payload = await fetchJson("/_localstack/health");
      if (payload?.services) {
        return payload;
      }
    } catch (error) {
      // Keep polling until timeout.
    }

    await wait(3000);
  }

  throw new Error("Timed out waiting for LocalStack health.");
}

function resolveAwsAccountId() {
  const result = spawnSync("aws", ["sts", "get-caller-identity", "--output", "json"], {
    cwd: rootDir,
    env: withAwsEnv(),
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "unknown error";
    throw new Error(`Unable to determine AWS account ID: ${detail.trim()}`);
  }

  const payload = JSON.parse(result.stdout);
  if (!payload.Account) {
    throw new Error("AWS STS did not return an account ID.");
  }

  return payload.Account;
}

module.exports = {
  AWS_REGION,
  CDK_DEFAULT_ACCOUNT,
  DEPLOY_TARGET,
  EDGE_PORT,
  LOCALSTACK_HOST,
  endpoint,
  isAwsTarget,
  isLocalStackTarget,
  rootDir,
  resolveAwsAccountId,
  runCommand,
  waitForLocalStackHealth,
  withAwsEnv,
};

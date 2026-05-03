const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const exampleEnvPath = path.join(rootDir, ".env.example");

if (!fs.existsSync(envPath) && fs.existsSync(exampleEnvPath)) {
  fs.copyFileSync(exampleEnvPath, envPath);
}

dotenv.config({ path: fs.existsSync(envPath) ? envPath : exampleEnvPath });

const LOCALSTACK_HOST = process.env.LOCALSTACK_HOST || "localhost";
const EDGE_PORT = process.env.EDGE_PORT || "4566";
const AWS_REGION = process.env.AWS_DEFAULT_REGION || "us-east-1";
const CDK_DEFAULT_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT || "000000000000";
const endpoint = `http://${LOCALSTACK_HOST}:${EDGE_PORT}`;

function withAwsEnv(extra = {}) {
  return {
    ...process.env,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "test",
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "test",
    AWS_DEFAULT_REGION: AWS_REGION,
    AWS_REGION,
    CDK_DEFAULT_REGION: process.env.CDK_DEFAULT_REGION || AWS_REGION,
    CDK_DEFAULT_ACCOUNT,
    AWS_ENDPOINT_URL: endpoint,
    AWS_ENDPOINT_URL_S3: endpoint,
    LOCALSTACK_HOST,
    EDGE_PORT,
    ...extra,
  };
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

module.exports = {
  AWS_REGION,
  CDK_DEFAULT_ACCOUNT,
  EDGE_PORT,
  LOCALSTACK_HOST,
  endpoint,
  rootDir,
  runCommand,
  waitForLocalStackHealth,
  withAwsEnv,
};

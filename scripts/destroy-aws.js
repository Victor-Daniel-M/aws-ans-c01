process.env.DEPLOY_TARGET = "aws";

const { spawnSync } = require("node:child_process");
const { AWS_REGION, rootDir, resolveAwsAccountId, runCommand, withAwsEnv } = require("./_common");

const LAB_PREFIX = process.env.LAB_PREFIX || "ansc01lab";
const bucketName = `${LAB_PREFIX}-artifacts`;
const repositoryName = `${LAB_PREFIX}-repo`;

function runAwsCommand(args) {
  const result = spawnSync("aws", args, {
    cwd: rootDir,
    env: withAwsEnv(),
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "unknown error";
    throw new Error(`AWS command failed: aws ${args.join(" ")}\n${detail.trim()}`);
  }

  return result.stdout;
}

function emptyBucketVersions(bucket) {
  console.log(`Emptying all object versions from s3://${bucket} before destroying FoundationStack...`);

  let keyMarker;
  let versionIdMarker;
  let deletedCount = 0;

  while (true) {
    const args = ["s3api", "list-object-versions", "--bucket", bucket, "--region", AWS_REGION];
    if (keyMarker) {
      args.push("--key-marker", keyMarker);
    }
    if (versionIdMarker) {
      args.push("--version-id-marker", versionIdMarker);
    }

    let payload;
    try {
      payload = JSON.parse(runAwsCommand(args));
    } catch (error) {
      if (String(error.message).includes("NoSuchBucket")) {
        console.log(`Bucket ${bucket} does not exist; skipping cleanup.`);
        return;
      }
      throw error;
    }

    const objects = [];
    for (const section of ["Versions", "DeleteMarkers"]) {
      for (const item of payload[section] || []) {
        objects.push({
          Key: item.Key,
          VersionId: item.VersionId,
        });
      }
    }

    if (objects.length > 0) {
      runAwsCommand([
        "s3api",
        "delete-objects",
        "--bucket",
        bucket,
        "--region",
        AWS_REGION,
        "--delete",
        JSON.stringify({ Objects: objects, Quiet: false }),
      ]);
      deletedCount += objects.length;
    }

    if (!payload.IsTruncated) {
      if (deletedCount === 0) {
        console.log(`Bucket ${bucket} is already empty.`);
      } else {
        console.log(`Deleted ${deletedCount} object version(s) from s3://${bucket}.`);
      }
      return;
    }

    keyMarker = payload.NextKeyMarker;
    versionIdMarker = payload.NextVersionIdMarker;
  }
}

function deleteEcrRepository(repository) {
  console.log(`Deleting ECR repository ${repository} if it exists...`);

  try {
    runAwsCommand([
      "ecr",
      "delete-repository",
      "--repository-name",
      repository,
      "--region",
      AWS_REGION,
      "--force",
    ]);
    console.log(`Deleted ECR repository ${repository}.`);
  } catch (error) {
    if (String(error.message).includes("RepositoryNotFoundException")) {
      console.log(`ECR repository ${repository} does not exist; skipping cleanup.`);
      return;
    }
    throw error;
  }
}

function main() {
  const accountId = !process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT === "000000000000"
    ? resolveAwsAccountId()
    : process.env.CDK_DEFAULT_ACCOUNT;
  process.env.CDK_DEFAULT_ACCOUNT = accountId;

  console.log("Destroying AppStack...");
  runCommand("npx", ["cdk", "destroy", "AppStack", "--force"]);

  deleteEcrRepository(repositoryName);
  emptyBucketVersions(bucketName);

  console.log("Destroying FoundationStack...");
  runCommand("npx", ["cdk", "destroy", "FoundationStack", "--force"]);
  console.log("AWS CDK stacks destroyed.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

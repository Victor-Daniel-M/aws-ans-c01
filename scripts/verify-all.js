const http = require("node:http");
const {
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStackResourcesCommand,
} = require("@aws-sdk/client-cloudformation");
const { CloudTrailClient, DescribeTrailsCommand } = require("@aws-sdk/client-cloudtrail");
const {
  EC2Client,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand,
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
} = require("@aws-sdk/client-ec2");
const { ECRClient, DescribeRepositoriesCommand } = require("@aws-sdk/client-ecr");
const {
  ECSClient,
  DescribeClustersCommand,
} = require("@aws-sdk/client-ecs");
const {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
} = require("@aws-sdk/client-elastic-load-balancing-v2");
const { HeadBucketCommand, S3Client } = require("@aws-sdk/client-s3");
const { AWS_REGION, endpoint, withAwsEnv } = require("./_common");
const enableEcsRuntime = process.env.ENABLE_ECS_RUNTIME === "true";

const expected = {
  foundationStack: "FoundationStack",
  appStack: "AppStack",
  bucketName: "ansc01lab-artifacts",
  trailName: "ansc01lab-trail",
  clusterName: "ansc01lab-cluster",
  serviceName: "ansc01lab-service",
  repositoryName: "ansc01lab-repo",
  loadBalancerName: "ansc01lab-nlb",
  targetGroupName: "ansc01lab-tg",
  vpcName: "ansc01lab-vpc",
  subnetNames: [
    "ansc01lab-public-a",
    "ansc01lab-public-b",
    "ansc01lab-private-a",
    "ansc01lab-private-b",
  ],
  routeTableNames: ["ansc01lab-public-rt", "ansc01lab-private-rt"],
  internetGatewayName: "ansc01lab-igw",
  securityGroupNames: ["ansc01lab-public-sg", "ansc01lab-app-sg"],
};

async function verifyLocalStackHealth() {
  await new Promise((resolve, reject) => {
    const req = http.get(`${endpoint}/_localstack/health`, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`LocalStack health endpoint returned ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const body = JSON.parse(data);
          if (!body.services) {
            reject(new Error("LocalStack health response missing services."));
            return;
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      const detail = error.message || error.code || "unknown error";
      reject(new Error(`Unable to reach LocalStack health endpoint at ${endpoint}: ${detail}`));
    });
  });

  console.log("Verified LocalStack health.");
}

function createClient(Client) {
  return new Client({
    region: AWS_REGION,
    endpoint,
    credentials: {
      accessKeyId: withAwsEnv().AWS_ACCESS_KEY_ID,
      secretAccessKey: withAwsEnv().AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

async function verifyStacks(cfClient) {
  for (const stackName of [expected.foundationStack, expected.appStack]) {
    const response = await cfClient.send(new DescribeStacksCommand({ StackName: stackName }));
    if (!response.Stacks || response.Stacks.length === 0) {
      throw new Error(`Stack ${stackName} was not found.`);
    }
  }

  console.log("Verified deployed CloudFormation stacks.");
}

async function stackHasResource(cfClient, stackName, resourceType) {
  const response = await cfClient.send(
    new DescribeStackResourcesCommand({
      StackName: stackName,
    }),
  );

  return (response.StackResources || []).some((resource) => resource.ResourceType === resourceType);
}

async function verifyBucket(s3Client) {
  await s3Client.send(new HeadBucketCommand({ Bucket: expected.bucketName }));
  console.log("Verified S3 bucket.");
}

async function verifyTrail(trailClient, cfClient) {
  try {
    const response = await trailClient.send(
      new DescribeTrailsCommand({ trailNameList: [expected.trailName] }),
    );
    if (!response.trailList || response.trailList.length === 0) {
      throw new Error("CloudTrail trail was not found.");
    }
    console.log("Verified CloudTrail trail.");
  } catch (error) {
    const message = error.message || "";
    if (!message.includes("not yet implemented") && !message.includes("pro feature")) {
      throw error;
    }

    const existsInStack = await stackHasResource(
      cfClient,
      expected.foundationStack,
      "AWS::CloudTrail::Trail",
    );
    if (!existsInStack) {
      throw new Error("CloudTrail trail resource was not found in FoundationStack.");
    }
    console.log("Verified CloudTrail trail via CloudFormation resource fallback.");
  }
}

function byName(name) {
  return {
    Name: "tag:Name",
    Values: [name],
  };
}

async function verifyNetwork(ec2Client) {
  const [vpcs, subnets, routeTables, internetGateways, securityGroups] = await Promise.all([
    ec2Client.send(new DescribeVpcsCommand({ Filters: [byName(expected.vpcName)] })),
    ec2Client.send(
      new DescribeSubnetsCommand({
        Filters: [{ Name: "tag:Name", Values: expected.subnetNames }],
      }),
    ),
    ec2Client.send(
      new DescribeRouteTablesCommand({
        Filters: [{ Name: "tag:Name", Values: expected.routeTableNames }],
      }),
    ),
    ec2Client.send(
      new DescribeInternetGatewaysCommand({
        Filters: [byName(expected.internetGatewayName)],
      }),
    ),
    ec2Client.send(
      new DescribeSecurityGroupsCommand({
        Filters: [{ Name: "group-name", Values: expected.securityGroupNames }],
      }),
    ),
  ]);

  if ((vpcs.Vpcs || []).length !== 1) {
    throw new Error("Expected exactly one lab VPC.");
  }

  if ((subnets.Subnets || []).length !== expected.subnetNames.length) {
    throw new Error("Expected four lab subnets.");
  }

  if ((routeTables.RouteTables || []).length !== expected.routeTableNames.length) {
    throw new Error("Expected two lab route tables.");
  }

  if ((internetGateways.InternetGateways || []).length !== 1) {
    throw new Error("Expected one lab internet gateway.");
  }

  if ((securityGroups.SecurityGroups || []).length !== expected.securityGroupNames.length) {
    throw new Error("Expected two lab security groups.");
  }

  console.log("Verified VPC, subnets, route tables, IGW, and security groups.");
}

async function verifyEcs(ecsClient) {
  try {
    const response = await ecsClient.send(
      new DescribeClustersCommand({
        clusters: [expected.clusterName],
      }),
    );
    if (!response.clusters || response.clusters.length === 0) {
      throw new Error("ECS cluster was not found.");
    }
    console.log("Verified ECS cluster.");
  } catch (error) {
    const message = error.message || "";
    if (!message.includes("not yet implemented") && !message.includes("pro feature")) {
      throw error;
    }

    const existsInStack = await stackHasResource(
      createClient(CloudFormationClient),
      expected.appStack,
      "AWS::ECS::Cluster",
    );
    if (!existsInStack) {
      throw new Error("ECS cluster resource was not found in AppStack.");
    }
    console.log("Verified ECS cluster via CloudFormation resource fallback.");
  }

  if (!enableEcsRuntime) {
    return;
  }

  const hasService = await stackHasResource(
    createClient(CloudFormationClient),
    expected.appStack,
    "AWS::ECS::Service",
  );
  if (!hasService) {
    throw new Error("ECS service resource was not found in AppStack while ENABLE_ECS_RUNTIME=true.");
  }
  console.log("Verified ECS service via CloudFormation resource fallback.");
}

async function verifyEcr(ecrClient) {
  try {
    const response = await ecrClient.send(
      new DescribeRepositoriesCommand({
        repositoryNames: [expected.repositoryName],
      }),
    );
    if (!response.repositories || response.repositories.length === 0) {
      throw new Error("ECR repository was not found.");
    }
    console.log("Verified ECR repository.");
  } catch (error) {
    const message = error.message || "";
    if (!message.includes("not yet implemented") && !message.includes("pro feature")) {
      throw error;
    }

    const existsInStack = await stackHasResource(
      createClient(CloudFormationClient),
      expected.appStack,
      "AWS::ECR::Repository",
    );
    if (!existsInStack) {
      throw new Error("ECR repository resource was not found in AppStack.");
    }
    console.log("Verified ECR repository via CloudFormation resource fallback.");
  }
}

async function verifyElb(elbClient) {
  try {
    const [loadBalancers, targetGroups] = await Promise.all([
      elbClient.send(
        new DescribeLoadBalancersCommand({
          Names: [expected.loadBalancerName],
        }),
      ),
      elbClient.send(
        new DescribeTargetGroupsCommand({
          Names: [expected.targetGroupName],
        }),
      ),
    ]);

    if (!loadBalancers.LoadBalancers || loadBalancers.LoadBalancers.length === 0) {
      throw new Error("NLB was not found.");
    }

    if (!targetGroups.TargetGroups || targetGroups.TargetGroups.length === 0) {
      throw new Error("Target group was not found.");
    }

    console.log("Verified NLB and target group.");
  } catch (error) {
    const message = error.message || "";
    if (!message.includes("not yet implemented") && !message.includes("pro feature")) {
      throw error;
    }

    const [hasLoadBalancer, hasTargetGroup] = await Promise.all([
      stackHasResource(
        createClient(CloudFormationClient),
        expected.appStack,
        "AWS::ElasticLoadBalancingV2::LoadBalancer",
      ),
      stackHasResource(
        createClient(CloudFormationClient),
        expected.appStack,
        "AWS::ElasticLoadBalancingV2::TargetGroup",
      ),
    ]);

    if (!hasLoadBalancer || !hasTargetGroup) {
      throw new Error("ELB resources were not found in AppStack.");
    }
    console.log("Verified NLB and target group via CloudFormation resource fallback.");
  }
}

async function main() {
  await verifyLocalStackHealth();

  const cloudFormation = createClient(CloudFormationClient);
  const cloudTrail = createClient(CloudTrailClient);
  const ec2 = createClient(EC2Client);
  const ecr = createClient(ECRClient);
  const ecs = createClient(ECSClient);
  const elb = createClient(ElasticLoadBalancingV2Client);
  const s3 = createClient(S3Client);

  await verifyStacks(cloudFormation);
  await verifyBucket(s3);
  await verifyTrail(cloudTrail, cloudFormation);
  await verifyNetwork(ec2);
  await verifyEcs(ecs);
  await verifyEcr(ecr);
  await verifyElb(elb);

  console.log("All verification checks passed.");
}

main().catch((error) => {
  const detail = error.message || error.code || "unknown error";
  console.error(`Verification failed: ${detail}`);
  process.exit(1);
});

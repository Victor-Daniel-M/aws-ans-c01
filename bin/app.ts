#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CONSTRUCT_IDS } from "../lib/constants/construct-ids";
import { AppStack } from "../lib/stacks/app-stack";
import { FoundationStack } from "../lib/stacks/foundation-stack";

const app = new cdk.App();
const deployTarget = process.env.DEPLOY_TARGET || "localstack";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? (deployTarget === "localstack" ? "000000000000" : undefined),
  region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1",
};
const prefix = "ansc01lab";
const enableEcsRuntime = process.env.ENABLE_ECS_RUNTIME === "true";

const stackProps: cdk.StackProps = deployTarget === "localstack"
  ? {
      env,
      synthesizer: new cdk.BootstraplessSynthesizer(),
    }
  : {
      env,
    };

const foundationStack = new FoundationStack(app, CONSTRUCT_IDS.FOUNDATION_STACK, {
  ...stackProps,
  prefix,
});

new AppStack(app, CONSTRUCT_IDS.APP_STACK, {
  ...stackProps,
  prefix,
  enableEcsRuntime,
  foundation: {
    vpcId: foundationStack.vpc.vpcId,
    publicSubnetIds: foundationStack.vpc.publicSubnetIds,
    privateSubnetIds: foundationStack.vpc.privateSubnetIds,
    publicSecurityGroupId: foundationStack.vpc.publicSecurityGroupId,
    appSecurityGroupId: foundationStack.vpc.appSecurityGroupId,
  },
});

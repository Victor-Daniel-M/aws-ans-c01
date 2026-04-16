#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppStack } from "../lib/stacks/app-stack";
import { FoundationStack } from "../lib/stacks/foundation-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? "000000000000",
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};
const prefix = "ansc01lab";

const stackProps = {
  env,
  synthesizer: new cdk.BootstraplessSynthesizer(),
};

const foundationStack = new FoundationStack(app, "FoundationStack", {
  ...stackProps,
  prefix,
});

new AppStack(app, "AppStack", {
  ...stackProps,
  prefix,
  foundation: {
    vpcId: foundationStack.vpc.vpcId,
    publicSubnetIds: foundationStack.vpc.publicSubnetIds,
    privateSubnetIds: foundationStack.vpc.privateSubnetIds,
    publicSecurityGroupId: foundationStack.vpc.publicSecurityGroupId,
    appSecurityGroupId: foundationStack.vpc.appSecurityGroupId,
  },
});

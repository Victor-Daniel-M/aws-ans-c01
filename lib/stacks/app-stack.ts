import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ExplicitEcs } from '../constructs/explicit-ecs';
import { ExplicitElb } from '../constructs/explicit-elb';

export interface FoundationReference {
  vpcId: string;
  publicSubnetIds: string[];
  privateSubnetIds: string[];
  publicSecurityGroupId: string;
  appSecurityGroupId: string;
}

export interface AppStackProps extends StackProps {
  prefix: string;
  foundation: FoundationReference;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    new ExplicitEcs(this, 'ExplicitEcs', {
      prefix: props.prefix,
    });

    new ExplicitElb(this, 'ExplicitElb', {
      prefix: props.prefix,
      subnetIds: props.foundation.publicSubnetIds,
      vpcId: props.foundation.vpcId,
    });

    new CfnOutput(this, 'NetworkPlacement', {
      exportName: `${props.prefix}-NetworkPlacement`,
      value: [
        props.foundation.vpcId,
        props.foundation.publicSecurityGroupId,
        props.foundation.appSecurityGroupId,
        ...props.foundation.privateSubnetIds,
      ].join(','),
    });
  }
}

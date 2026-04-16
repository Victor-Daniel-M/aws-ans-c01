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
  enableEcsRuntime?: boolean;
  foundation: FoundationReference;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const elb = new ExplicitElb(this, 'ExplicitElb', {
      prefix: props.prefix,
      subnetIds: props.foundation.publicSubnetIds,
      vpcId: props.foundation.vpcId,
      enableListener: props.enableEcsRuntime,
    });

    new ExplicitEcs(this, 'ExplicitEcs', {
      prefix: props.prefix,
      enableService: props.enableEcsRuntime,
      privateSubnetIds: props.foundation.privateSubnetIds,
      appSecurityGroupId: props.foundation.appSecurityGroupId,
      targetGroupArn: elb.targetGroup.targetGroupArn,
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

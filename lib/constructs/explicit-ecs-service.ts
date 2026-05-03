import { CfnOutput, aws_ecs as ecs } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OUTPUT_IDS } from "../constants/output-ids";
import { RESOURCE_IDS } from "../constants/resource-ids";

export interface ExplicitEcsServiceProps {
  prefix: string;
  clusterName: string;
  taskDefinitionArn: string;
  containerName: string;
  containerPort: number;
  targetGroupArn: string;
  privateSubnetIds: string[];
  appSecurityGroupId: string;
}

export class ExplicitEcsService extends Construct {
  readonly service: ecs.CfnService;
  readonly serviceName: string;

  constructor(scope: Construct, id: string, props: ExplicitEcsServiceProps) {
    super(scope, id);

    this.serviceName = `${props.prefix}-service`;

    this.service = new ecs.CfnService(this, RESOURCE_IDS.SERVICE, {
      serviceName: this.serviceName,
      cluster: props.clusterName,
      taskDefinition: props.taskDefinitionArn,
      desiredCount: 1,
      launchType: "FARGATE",
      enableEcsManagedTags: false,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "DISABLED",
          subnets: props.privateSubnetIds,
          securityGroups: [props.appSecurityGroupId],
        },
      },
      loadBalancers: [
        {
          targetGroupArn: props.targetGroupArn,
          containerName: props.containerName,
          containerPort: props.containerPort,
        },
      ],
    });

    new CfnOutput(this, OUTPUT_IDS.SERVICE_NAME, {
      exportName: `${props.prefix}-ServiceName`,
      value: this.serviceName,
    });
  }
}

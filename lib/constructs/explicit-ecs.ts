import { Construct } from "constructs";
import { CONSTRUCT_IDS } from "../constants/construct-ids";
import { ExplicitCluster } from "./explicit-cluster";
import { ExplicitEcsService } from "./explicit-ecs-service";
import { ExplicitEcr } from "./explicit-ecr";
import { ExplicitTaskDefinition } from "./explicit-task-definition";

export interface ExplicitEcsProps {
  prefix: string;
  enableService?: boolean;
  privateSubnetIds?: string[];
  appSecurityGroupId?: string;
  targetGroupArn?: string;
}

export class ExplicitEcs extends Construct {
  readonly cluster: ExplicitCluster;
  readonly repository: ExplicitEcr;
  readonly taskDefinition?: ExplicitTaskDefinition;
  readonly service?: ExplicitEcsService;

  constructor(scope: Construct, id: string, props: ExplicitEcsProps) {
    super(scope, id);

    this.cluster = new ExplicitCluster(this, CONSTRUCT_IDS.EXPLICIT_CLUSTER, {
      prefix: props.prefix,
    });

    this.repository = new ExplicitEcr(this, CONSTRUCT_IDS.EXPLICIT_ECR, {
      prefix: props.prefix,
    });

    if (props.enableService) {
      if (!props.privateSubnetIds || !props.appSecurityGroupId || !props.targetGroupArn) {
        throw new Error(
          "ExplicitEcs requires privateSubnetIds, appSecurityGroupId, and targetGroupArn when enableService is true.",
        );
      }

      this.taskDefinition = new ExplicitTaskDefinition(this, CONSTRUCT_IDS.EXPLICIT_TASK_DEFINITION, {
        prefix: props.prefix,
      });

      this.service = new ExplicitEcsService(this, CONSTRUCT_IDS.EXPLICIT_ECS_SERVICE, {
        prefix: props.prefix,
        clusterName: this.cluster.clusterName,
        taskDefinitionArn: this.taskDefinition.taskDefinition.ref,
        containerName: this.taskDefinition.containerName,
        containerPort: this.taskDefinition.containerPort,
        targetGroupArn: props.targetGroupArn,
        privateSubnetIds: props.privateSubnetIds,
        appSecurityGroupId: props.appSecurityGroupId,
      });
    }
  }
}

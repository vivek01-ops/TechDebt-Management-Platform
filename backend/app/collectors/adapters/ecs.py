from __future__ import annotations
import boto3
from botocore.exceptions import ClientError

from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class ECSCollector:
    service = "ecs"
    resource_types = ["AWS::ECS::Cluster", "AWS::ECS::Service"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        ecs = session.client("ecs", region_name=region)
        try:
            cluster_arns = []
            paginator = ecs.get_paginator("list_clusters")
            for page in paginator.paginate():
                cluster_arns.extend(page.get("clusterArns", []))
            if cluster_arns:
                # describe in batches of 100
                for i in range(0, len(cluster_arns), 100):
                    batch = cluster_arns[i:i+100]
                    desc = ecs.describe_clusters(clusters=batch, include=["TAGS"])
                    for c in desc.get("clusters", []):
                        tags = {t.get("key"): t.get("value") for t in c.get("tags", [])}
                        status = c.get("status")
                        result.resources.append(NormalizedResource(
                            service="ecs", resource_type="AWS::ECS::Cluster", resource_id=c.get("clusterName"),
                            arn=c.get("clusterArn"), name=c.get("clusterName"), region=region,
                            normalized_state="Available" if status == "ACTIVE" else status,
                            original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                            version_info={"registered_container_instances": c.get("registeredContainerInstancesCount")},
                            tags=tags, raw_metadata={"runningTasksCount": c.get("runningTasksCount"), "activeServicesCount": c.get("activeServicesCount")},
                        ))
                        # services per cluster
                        try:
                            sp = ecs.get_paginator("list_services")
                            sarns = []
                            for spage in sp.paginate(cluster=c.get("clusterArn")):
                                sarns.extend(spage.get("serviceArns", []))
                            for j in range(0, len(sarns), 10):
                                sb = sarns[j:j+10]
                                sd = ecs.describe_services(cluster=c.get("clusterArn"), services=sb, include=["TAGS"])
                                for s in sd.get("services", []):
                                    stags = {t.get("key"): t.get("value") for t in s.get("tags", [])}
                                    sstatus = s.get("status")
                                    result.resources.append(NormalizedResource(
                                        service="ecs", resource_type="AWS::ECS::Service", resource_id=s.get("serviceName"),
                                        arn=s.get("serviceArn"), name=s.get("serviceName"), region=region,
                                        normalized_state="Available" if sstatus == "ACTIVE" else sstatus,
                                        original_state=sstatus, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                                        version_info={"launch_type": (s.get("launchType") or (s.get("capacityProviderStrategy") or [{}])[0].get("capacityProvider"))},
                                        tags=stags, raw_metadata={"desiredCount": s.get("desiredCount"), "runningCount": s.get("runningCount")},
                                    ))
                        except Exception as e:
                            result.errors.append({"service": "ecs", "resource_type": "AWS::ECS::Service", "region": region, "cluster": c.get("clusterName"), "error": str(e)})
        except ClientError as e:
            result.errors.append({"service": "ecs", "resource_type": "AWS::ECS::Cluster", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "ecs", "resource_type": "AWS::ECS::Cluster", "region": region, "error": str(e)})
        return result


register(ECSCollector())

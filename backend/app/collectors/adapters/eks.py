from __future__ import annotations
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class EKSCollector:
    service = "eks"
    resource_types = ["AWS::EKS::Cluster"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        eks = session.client("eks", region_name=region)
        try:
            paginator = eks.get_paginator("list_clusters")
            names = []
            for page in paginator.paginate():
                names.extend(page.get("clusters", []))
            for name in names:
                try:
                    c = eks.describe_cluster(name=name).get("cluster", {})
                    status = c.get("status")
                    version = c.get("version")
                    result.resources.append(NormalizedResource(
                        service="eks", resource_type="AWS::EKS::Cluster", resource_id=name,
                        arn=c.get("arn"), name=name, region=region,
                        normalized_state="Available" if status == "ACTIVE" else status,
                        original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                        version_info={"kubernetes_version": version, "platform_version": c.get("platformVersion")},
                        technology_identifiers={"kubernetes_version": version},
                        tags=c.get("tags", {}) or {}, raw_metadata={"endpoint": c.get("endpoint")},
                    ))
                except Exception as e:
                    result.errors.append({"service": "eks", "resource_type": "AWS::EKS::Cluster", "region": region, "resource": name, "error": str(e)})
        except ClientError as e:
            result.errors.append({"service": "eks", "resource_type": "AWS::EKS::Cluster", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "eks", "resource_type": "AWS::EKS::Cluster", "region": region, "error": str(e)})
        return result

register(EKSCollector())

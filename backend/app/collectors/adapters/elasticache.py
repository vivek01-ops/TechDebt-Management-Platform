from __future__ import annotations
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class ElastiCacheCollector:
    service = "elasticache"
    resource_types = ["AWS::ElastiCache::CacheCluster", "AWS::ElastiCache::ReplicationGroup"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        client = session.client("elasticache", region_name=region)
        try:
            paginator = client.get_paginator("describe_cache_clusters")
            for page in paginator.paginate(ShowCacheNodeInfo=True):
                for c in page.get("CacheClusters", []):
                    status = c.get("CacheClusterStatus")
                    engine = c.get("Engine")
                    ver = c.get("EngineVersion")
                    name = c.get("CacheClusterId")
                    result.resources.append(NormalizedResource(
                        service="elasticache", resource_type="AWS::ElastiCache::CacheCluster", resource_id=name,
                        arn=c.get("ARN"), name=name, region=region,
                        normalized_state="Available" if status == "available" else status,
                        original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                        version_info={"engine": engine, "engine_version": ver},
                        technology_identifiers={"cache_engine": engine, "cache_version": ver},
                        tags={}, raw_metadata={"CacheNodeType": c.get("CacheNodeType")},
                    ))
        except Exception as e:
            result.errors.append({"service": "elasticache", "resource_type": "AWS::ElastiCache::CacheCluster", "region": region, "error": str(e)})
        try:
            paginator = client.get_paginator("describe_replication_groups")
            for page in paginator.paginate():
                for rg in page.get("ReplicationGroups", []):
                    status = rg.get("Status")
                    name = rg.get("ReplicationGroupId")
                    result.resources.append(NormalizedResource(
                        service="elasticache", resource_type="AWS::ElastiCache::ReplicationGroup", resource_id=name,
                        arn=rg.get("ARN"), name=name, region=region,
                        normalized_state="Available" if status == "available" else status,
                        original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                        tags={}, raw_metadata={},
                    ))
        except Exception as e:
            result.errors.append({"service": "elasticache", "resource_type": "AWS::ElastiCache::ReplicationGroup", "region": region, "error": str(e)})
        return result

register(ElastiCacheCollector())

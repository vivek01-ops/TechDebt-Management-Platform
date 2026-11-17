from __future__ import annotations
import boto3
from botocore.exceptions import ClientError

from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class RDSCollector:
    service = "rds"
    resource_types = ["AWS::RDS::DBInstance", "AWS::RDS::DBCluster"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        rds = session.client("rds", region_name=region)
        try:
            paginator = rds.get_paginator("describe_db_instances")
            for page in paginator.paginate():
                for dbi in page.get("DBInstances", []):
                    arn = dbi.get("DBInstanceArn")
                    status = dbi.get("DBInstanceStatus")
                    engine = dbi.get("Engine")
                    version = dbi.get("EngineVersion")
                    tags = {}
                    try:
                        if arn:
                            tags_resp = rds.list_tags_for_resource(ResourceName=arn)
                            tags = {t.get("Key"): t.get("Value") for t in tags_resp.get("TagList", [])}
                    except Exception:
                        pass
                    result.resources.append(NormalizedResource(
                        service="rds", resource_type="AWS::RDS::DBInstance", resource_id=dbi.get("DBInstanceIdentifier"),
                        arn=arn, name=dbi.get("DBInstanceIdentifier"), region=region,
                        normalized_state="Available" if status == "available" else status,
                        original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                        version_info={"engine": engine, "engine_version": version},
                        technology_identifiers={"database_engine": engine, "database_version": version},
                        tags=tags, raw_metadata={"DBInstanceClass": dbi.get("DBInstanceClass")},
                    ))
        except ClientError as e:
            result.errors.append({"service": "rds", "resource_type": "AWS::RDS::DBInstance", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "rds", "resource_type": "AWS::RDS::DBInstance", "region": region, "error": str(e)})
        try:
            paginator = rds.get_paginator("describe_db_clusters")
            for page in paginator.paginate():
                for dbc in page.get("DBClusters", []):
                    arn = dbc.get("DBClusterArn")
                    status = dbc.get("Status")
                    result.resources.append(NormalizedResource(
                        service="rds", resource_type="AWS::RDS::DBCluster", resource_id=dbc.get("DBClusterIdentifier"),
                        arn=arn, name=dbc.get("DBClusterIdentifier"), region=region,
                        normalized_state="Available" if status == "available" else status,
                        original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                        version_info={"engine": dbc.get("Engine"), "engine_version": dbc.get("EngineVersion")},
                        technology_identifiers={"database_engine": dbc.get("Engine"), "database_version": dbc.get("EngineVersion")},
                        tags={}, raw_metadata={},
                    ))
        except Exception as e:
            result.errors.append({"service": "rds", "resource_type": "AWS::RDS::DBCluster", "region": region, "error": str(e)})
        return result


register(RDSCollector())

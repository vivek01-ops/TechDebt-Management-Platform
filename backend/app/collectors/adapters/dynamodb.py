from __future__ import annotations
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class DynamoDBCollector:
    service = "dynamodb"
    resource_types = ["AWS::DynamoDB::Table"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        ddb = session.client("dynamodb", region_name=region)
        try:
            paginator = ddb.get_paginator("list_tables")
            for page in paginator.paginate():
                for name in page.get("TableNames", []):
                    try:
                        desc = ddb.describe_table(TableName=name).get("Table", {})
                        arn = desc.get("TableArn")
                        status = desc.get("TableStatus")
                        result.resources.append(NormalizedResource(
                            service="dynamodb", resource_type="AWS::DynamoDB::Table", resource_id=name,
                            arn=arn, name=name, region=region,
                            normalized_state="Available" if status == "ACTIVE" else status,
                            original_state=status, discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                            version_info=None, tags={}, raw_metadata={"ItemCount": desc.get("ItemCount")},
                        ))
                    except Exception as e:
                        result.errors.append({"service": "dynamodb", "resource_type": "AWS::DynamoDB::Table", "region": region, "resource": name, "error": str(e)})
        except ClientError as e:
            result.errors.append({"service": "dynamodb", "resource_type": "AWS::DynamoDB::Table", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "dynamodb", "resource_type": "AWS::DynamoDB::Table", "region": region, "error": str(e)})
        return result

register(DynamoDBCollector())

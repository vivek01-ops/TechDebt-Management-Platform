from __future__ import annotations
import boto3
from botocore.exceptions import ClientError

from app.collectors.base import CollectionResult, NormalizedResource
from app.collectors.registry import register


class EC2Collector:
    service = "ec2"
    resource_types = ["AWS::EC2::Instance", "AWS::EC2::Volume", "AWS::EC2::SecurityGroup", "AWS::EC2::VPC"]
    discovery_source = "boto3"

    def collect(self, session: boto3.Session, region: str | None, account_id: str) -> CollectionResult:
        result = CollectionResult()
        if not region:
            return result
        ec2 = session.client("ec2", region_name=region)
        # Instances
        try:
            paginator = ec2.get_paginator("describe_instances")
            for page in paginator.paginate():
                for res in page.get("Reservations", []):
                    for inst in res.get("Instances", []):
                        state = (inst.get("State") or {}).get("Name")
                        tags = {t.get("Key"): t.get("Value") for t in inst.get("Tags", []) if t.get("Key")}
                        name = tags.get("Name") or inst.get("InstanceId")
                        platform = inst.get("PlatformDetails") or inst.get("Platform") or "Linux/UNIX"
                        version_info = {"platform": platform, "image_id": inst.get("ImageId")}
                        result.resources.append(NormalizedResource(
                            service="ec2", resource_type="AWS::EC2::Instance", resource_id=inst["InstanceId"],
                            arn=f"arn:aws:ec2:{region}:{account_id}:instance/{inst['InstanceId']}",
                            name=name, region=region,
                            normalized_state=_norm_ec2_state(state), original_state=state,
                            discovery_source="boto3", enrichment_status="enriched", data_completeness="partial",
                            version_info=version_info, technology_identifiers={"os_platform": platform}, tags=tags,
                            raw_metadata={"InstanceType": inst.get("InstanceType"), "LaunchTime": str(inst.get("LaunchTime"))},
                        ))
        except ClientError as e:
            result.errors.append({"service": "ec2", "resource_type": "AWS::EC2::Instance", "region": region, "error": str(e), "code": e.response.get("Error", {}).get("Code")})
        except Exception as e:
            result.errors.append({"service": "ec2", "resource_type": "AWS::EC2::Instance", "region": region, "error": str(e)})
        # Volumes (basic discovery)
        try:
            paginator = ec2.get_paginator("describe_volumes")
            for page in paginator.paginate():
                for vol in page.get("Volumes", []):
                    tags = {t.get("Key"): t.get("Value") for t in vol.get("Tags", []) if t.get("Key")}
                    state = vol.get("State")
                    result.resources.append(NormalizedResource(
                        service="ec2", resource_type="AWS::EC2::Volume", resource_id=vol["VolumeId"],
                        arn=f"arn:aws:ec2:{region}:{account_id}:volume/{vol['VolumeId']}",
                        name=tags.get("Name") or vol["VolumeId"], region=region,
                        normalized_state="Available" if state == "available" else "In-use" if state == "in-use" else state,
                        original_state=state, discovery_source="boto3", enrichment_status="discovered", data_completeness="basic",
                        tags=tags, raw_metadata={"Size": vol.get("Size"), "VolumeType": vol.get("VolumeType")},
                    ))
        except Exception as e:
            result.errors.append({"service": "ec2", "resource_type": "AWS::EC2::Volume", "region": region, "error": str(e)})
        return result


def _norm_ec2_state(state: str | None):
    if not state:
        return "Unknown"
    s = state.lower()
    if s == "running":
        return "Running"
    if s == "stopped":
        return "Stopped"
    if s in ("pending",):
        return "Pending"
    if s in ("stopping", "shutting-down"):
        return "Stopping"
    if s in ("terminated",):
        return "Terminated"
    return state


register(EC2Collector())

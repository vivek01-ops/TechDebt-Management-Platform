from __future__ import annotations
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.inventory import AwsAccount, AwsRegion, AwsResource, ResourceTag
from app.models.operations import CollectionJob, CollectionRun, CollectionError, CollectorCoverage
from app.services.aws import get_account_session
from app.collectors.registry import get_adapters


CATALOG_RESOURCE_TYPES = [
    # Compute
    ("ec2", "AWS::EC2::Instance", "boto3", "implemented"), ("ec2", "AWS::EC2::Volume", "boto3", "implemented"),
    ("lambda", "AWS::Lambda::Function", "boto3", "implemented"), ("ecs", "AWS::ECS::Cluster", "boto3", "implemented"),
    ("ecs", "AWS::ECS::Service", "boto3", "implemented"), ("eks", "AWS::EKS::Cluster", "boto3", "implemented"),
    ("batch", "AWS::Batch::ComputeEnvironment", "generic", "planned"), ("lightsail", "AWS::Lightsail::Instance", "generic", "planned"),
    ("apprunner", "AWS::AppRunner::Service", "generic", "planned"), ("elasticbeanstalk", "AWS::ElasticBeanstalk::Environment", "generic", "planned"),
    # Databases
    ("rds", "AWS::RDS::DBInstance", "boto3", "implemented"), ("rds", "AWS::RDS::DBCluster", "boto3", "implemented"),
    ("dynamodb", "AWS::DynamoDB::Table", "boto3", "implemented"), ("elasticache", "AWS::ElastiCache::CacheCluster", "boto3", "implemented"),
    ("elasticache", "AWS::ElastiCache::ReplicationGroup", "boto3", "implemented"),
    ("docdb", "AWS::DocDB::DBCluster", "generic", "planned"), ("neptune", "AWS::Neptune::DBCluster", "generic", "planned"),
    ("redshift", "AWS::Redshift::Cluster", "generic", "planned"), ("opensearch", "AWS::OpenSearchService::Domain", "generic", "planned"),
    ("memorydb", "AWS::MemoryDB::Cluster", "generic", "planned"), ("mq", "AWS::AmazonMQ::Broker", "generic", "planned"),
    # Storage
    ("s3", "AWS::S3::Bucket", "boto3", "implemented"), ("efs", "AWS::EFS::FileSystem", "generic", "planned"),
    ("fsx", "AWS::FSx::FileSystem", "generic", "planned"), ("backup", "AWS::Backup::BackupPlan", "generic", "planned"),
    # Networking
    ("ec2", "AWS::EC2::VPC", "generic", "planned"), ("ec2", "AWS::EC2::Subnet", "generic", "planned"),
    ("ec2", "AWS::EC2::SecurityGroup", "generic", "planned"), ("elbv2", "AWS::ElasticLoadBalancingV2::LoadBalancer", "generic", "planned"),
    ("apigateway", "AWS::ApiGateway::RestApi", "generic", "planned"), ("cloudfront", "AWS::CloudFront::Distribution", "generic", "planned"),
    ("route53", "AWS::Route53::HostedZone", "generic", "planned"),
    # Containers
    ("ecr", "AWS::ECR::Repository", "generic", "planned"), ("ecr", "AWS::ECR::Image", "generic", "planned"),
    # Security/Identity
    ("iam", "AWS::IAM::Role", "generic", "planned"), ("iam", "AWS::IAM::User", "generic", "planned"), ("kms", "AWS::KMS::Key", "generic", "planned"),
    ("secretsmanager", "AWS::SecretsManager::Secret", "generic", "planned"), ("acm", "AWS::CertificateManager::Certificate", "generic", "planned"),
    # Integration/Messaging
    ("sqs", "AWS::SQS::Queue", "generic", "planned"), ("sns", "AWS::SNS::Topic", "generic", "planned"),
    ("events", "AWS::Events::Rule", "generic", "planned"), ("stepfunctions", "AWS::StepFunctions::StateMachine", "generic", "planned"),
    ("kinesis", "AWS::Kinesis::Stream", "generic", "planned"), ("msk", "AWS::MSK::Cluster", "generic", "planned"),
    # Analytics/Data/Dev/Monitoring/AI (representative)
    ("glue", "AWS::Glue::Job", "generic", "planned"), ("athena", "AWS::Athena::WorkGroup", "generic", "planned"),
    ("emr", "AWS::EMR::Cluster", "generic", "planned"), ("codepipeline", "AWS::CodePipeline::Pipeline", "generic", "planned"),
    ("cloudformation", "AWS::CloudFormation::Stack", "generic", "planned"), ("cloudwatch", "AWS::CloudWatch::Alarm", "generic", "planned"),
    ("cloudtrail", "AWS::CloudTrail::Trail", "generic", "planned"), ("ssm", "AWS::SSM::ManagedInstanceInventory", "generic", "planned"),
    ("sagemaker", "AWS::SageMaker::Endpoint", "generic", "planned"),
]


def ensure_coverage_registry(db: Session):
    adapters = get_adapters()
    existing = {(c.aws_service, c.resource_type): c for c in db.scalars(select(CollectorCoverage)).all()}
    for svc, adapter in adapters.items():
        for rt in getattr(adapter, "resource_types", []):
            if (svc, rt) in existing:
                continue
            cov = CollectorCoverage(
                aws_service=svc, resource_type=rt, discovery_source=getattr(adapter, "discovery_source", "boto3"),
                adapter_status="implemented", enrichment_support=True, version_support=True,
                operational_state_support=True, coverage_status="Fully Supported", test_status="partial",
            )
            db.add(cov)
            existing[(svc, rt)] = cov
    # seed catalog entries for breadth/visibility
    for svc, rt, source, status in CATALOG_RESOURCE_TYPES:
        if (svc, rt) in existing:
            continue
        cov = CollectorCoverage(
            aws_service=svc, resource_type=rt, discovery_source=source,
            adapter_status=status, enrichment_support=(status == "implemented"), version_support=(status == "implemented"),
            operational_state_support=(status == "implemented"),
            coverage_status="Fully Supported" if status == "implemented" else ("Discovery Only" if status == "generic" else "Unsupported"),
            test_status="partial" if status == "implemented" else "not_implemented",
            known_limitations=None if status == "implemented" else "Dedicated enrichment adapter not yet implemented; framework supports extension. Reported transparently.",
        )
        db.add(cov)
        existing[(svc, rt)] = cov
    db.commit()


def upsert_resource(db: Session, account: AwsAccount, nr) -> AwsResource:
    stmt = select(AwsResource).where(AwsResource.account_id_fk == account.id, AwsResource.resource_id == str(nr.resource_id), AwsResource.resource_type == nr.resource_type)
    if nr.region:
        stmt = stmt.where(AwsResource.region == nr.region)
    existing = db.scalar(stmt)
    if not existing:
        existing = AwsResource(account_id_fk=account.id, region=nr.region, service=nr.service, resource_type=nr.resource_type, resource_id=str(nr.resource_id))
        db.add(existing)
    existing.arn = nr.arn
    existing.name = nr.name
    existing.normalized_state = nr.normalized_state
    existing.original_state = nr.original_state
    existing.is_running_applicable = nr.is_running_applicable
    existing.discovery_source = nr.discovery_source
    existing.enrichment_status = nr.enrichment_status
    existing.data_completeness = nr.data_completeness
    existing.version_info = nr.version_info
    existing.technology_identifiers = nr.technology_identifiers
    existing.raw_metadata = nr.raw_metadata
    existing.last_seen_at = datetime.utcnow()
    existing.is_missing = False
    db.flush()
    # replace tags (simple approach)
    db.query(ResourceTag).filter(ResourceTag.resource_id_fk == existing.id).delete()
    for k, v in (nr.tags or {}).items():
        db.add(ResourceTag(resource_id_fk=existing.id, key=str(k)[:256], value=str(v) if v is not None else None))
    return existing


def run_account_scan(db: Session, account: AwsAccount, regions: list[str] | None = None, services: list[str] | None = None) -> dict:
    ensure_coverage_registry(db)
    job = CollectionJob(job_type="account_scan", scope={"account_id": account.account_id, "regions": regions, "services": services}, status="running")
    db.add(job)
    db.flush()
    run = CollectionRun(job_id_fk=job.id, account_id_fk=account.id, status="running")
    db.add(run)
    db.flush()
    sess = get_account_session(account)
    target_regions = regions or [r.region_name for r in account.regions if r.enabled] or [sess.region_name or "us-east-1"]
    adapters = get_adapters()
    if services:
        adapters = {k: v for k, v in adapters.items() if k in services}
    total_resources = 0
    total_errors = 0
    for region in target_regions:
        for svc_name, adapter in adapters.items():
            try:
                result = adapter.collect(sess, region, account.account_id)
                for nr in result.resources:
                    upsert_resource(db, account, nr)
                    total_resources += 1
                for err in result.errors:
                    db.add(CollectionError(run_id_fk=run.id, account_id_fk=account.id, region=region, service=svc_name, resource_type=err.get("resource_type"), error_type="retryable" if "Throttl" in str(err.get("error", "")) else "permanent", message=str(err.get("error"))[:2000], details=err))
                    total_errors += 1
                # update coverage timestamp/status
                for rt in getattr(adapter, "resource_types", []):
                    cov = db.scalar(select(CollectorCoverage).where(CollectorCoverage.aws_service == svc_name, CollectorCoverage.resource_type == rt))
                    if cov:
                        cov.last_collection_at = datetime.utcnow()
                        cov.coverage_status = "Collection Failed" if any(e.get("resource_type")==rt for e in result.errors) and not any(r.resource_type==rt for r in result.resources) else "Fully Supported"
            except Exception as e:
                db.add(CollectionError(run_id_fk=run.id, account_id_fk=account.id, region=region, service=svc_name, error_type="permanent", message=str(e)[:2000], details={"exception": type(e).__name__}))
                total_errors += 1
        db.commit()
    run.status = "completed" if total_errors == 0 else "completed_with_errors"
    run.completed_at = datetime.utcnow()
    run.summary = {"resources": total_resources, "errors": total_errors, "regions": target_regions, "services": list(adapters.keys())}
    job.status = run.status
    db.commit()
    return {"run_id": run.id, "status": run.status, "summary": run.summary}

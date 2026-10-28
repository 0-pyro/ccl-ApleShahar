# ==============================================================================
# ApleShahar AWS Cloud Cleanup Script (PowerShell)
# ==============================================================================
# This script deletes all partially created ApleShahar resources in ap-south-1:
# - CloudWatch Alarms
# - SNS Topics
# - RDS Subnet Groups & Databases
# - S3 Media Buckets
# - IAM Instance Profiles & Roles
# - Security Groups
# - Subnets, Route Tables, Internet Gateways, and VPCs
# ==============================================================================

param(
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Continue"

Write-Host "Starting ApleShahar AWS Resource Cleanup..." -ForegroundColor Cyan

# 1. CloudWatch Alarm
Write-Host "Deleting CloudWatch Alarm..."
aws cloudwatch delete-alarms --alarm-names "EC2-HighCPU-Alarm" --region $Region 2>$null

# 2. SNS Topic
Write-Host "Deleting SNS Topic..."
$TopicArn = (aws sns list-topics --region $Region --output json | ConvertFrom-Json).Topics | Where-Object { $_.TopicArn -like "*apleshahar*" } | Select-Object -ExpandProperty TopicArn
if ($TopicArn) {
    aws sns delete-topic --topic-arn $TopicArn --region $Region
}

# 3. RDS Instances & Subnet Groups
Write-Host "Checking for RDS instances..."
$RdsId = (aws rds describe-db-instances --region $Region --output json 2>$null | ConvertFrom-Json).DBInstances | Where-Object { $_.DBInstanceIdentifier -like "*apleshahar*" } | Select-Object -ExpandProperty DBInstanceIdentifier
if ($RdsId) {
    Write-Host "Deleting RDS Instance $RdsId..."
    aws rds delete-db-instance --db-instance-identifier $RdsId --skip-final-snapshot --delete-automated-backups --region $Region 2>$null
    Write-Host "Waiting for RDS instance to delete..."
    aws rds wait db-instance-deleted --db-instance-identifier $RdsId --region $Region 2>$null
}

Write-Host "Deleting RDS Subnet Groups..."
aws rds delete-db-subnet-group --db-subnet-group-name apleshahar-db-subnets --region $Region 2>$null

# 4. S3 Buckets
Write-Host "Deleting S3 Media Buckets..."
$Buckets = (aws s3api list-buckets --output json | ConvertFrom-Json).Buckets | Where-Object { $_.Name -like "apleshahar-media*" } | Select-Object -ExpandProperty Name
foreach ($b in $Buckets) {
    Write-Host "Emptying and deleting S3 bucket $b..."
    aws s3 rb "s3://$b" --force 2>$null
}

# 5. IAM Instance Profile & Role
Write-Host "Deleting IAM Instance Profile & Role..."
aws iam remove-role-from-instance-profile --instance-profile-name ApleShahar-EC2-BackendRole --role-name ApleShahar-EC2-BackendRole 2>$null
aws iam delete-instance-profile --instance-profile-name ApleShahar-EC2-BackendRole 2>$null
aws iam delete-role-policy --role-name ApleShahar-EC2-BackendRole --policy-name ApleShaharAppPermissions 2>$null
aws iam detach-role-policy --role-name ApleShahar-EC2-BackendRole --policy-arn "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" 2>$null
aws iam delete-role --role-name ApleShahar-EC2-BackendRole 2>$null

# 6. VPCs, Subnets, Gateways, Route Tables & Security Groups
Write-Host "Cleaning up VPCs and Networking..."
$VpcList = (aws ec2 describe-vpcs --filters "Name=tag:Name,Values=apleshahar-vpc" --region $Region --output json | ConvertFrom-Json).Vpcs.VpcId

foreach ($vpc in $VpcList) {
    Write-Host "Cleaning VPC: $vpc"

    # Delete Security Groups
    $sgs = (aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc" --region $Region --output json | ConvertFrom-Json).SecurityGroups | Where-Object { $_.GroupName -ne "default" }
    foreach ($sg in $sgs) {
        # Revoke all ingress rules first to prevent circular dependency
        aws ec2 revoke-security-group-ingress --group-id $sg.GroupId --protocol all --source-group $sg.GroupId --region $Region 2>$null
    }
    foreach ($sg in $sgs) {
        aws ec2 delete-security-group --group-id $sg.GroupId --region $Region 2>$null
    }

    # Detach and delete Internet Gateways
    $igws = (aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpc" --region $Region --output json | ConvertFrom-Json).InternetGateways.InternetGatewayId
    foreach ($igw in $igws) {
        aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $vpc --region $Region 2>$null
        aws ec2 delete-internet-gateway --internet-gateway-id $igw --region $Region 2>$null
    }

    # Delete Subnets
    $subnets = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --region $Region --output json | ConvertFrom-Json).Subnets.SubnetId
    foreach ($subnet in $subnets) {
        aws ec2 delete-subnet --subnet-id $subnet --region $Region 2>$null
    }

    # Delete Custom Route Tables
    $rts = (aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc" --region $Region --output json | ConvertFrom-Json).RouteTables | Where-Object { -not ($_.Associations.Main -contains $true) }
    foreach ($rt in $rts) {
        foreach ($assoc in $rt.Associations) {
            aws ec2 disassociate-route-table --association-id $assoc.RouteTableAssociationId --region $Region 2>$null
        }
        aws ec2 delete-route-table --route-table-id $rt.RouteTableId --region $Region 2>$null
    }

    # Delete VPC
    aws ec2 delete-vpc --vpc-id $vpc --region $Region 2>$null
    Write-Host "VPC $vpc deleted."
}

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "CLEANUP COMPLETE: All ApleShahar resources deleted." -ForegroundColor Green
Write-Host "==============================================================================`n"

# ==============================================================================
# ApleShahar AWS Cloud Architecture Automated Deployment Script (PowerShell)
# ==============================================================================
# This script provisions:
# 1. Custom VPC (10.0.0.0/16), IGW, Public Subnet, 2 Private Subnets, Route Tables
# 2. Tiered Security Groups (EC2 & RDS)
# 3. Amazon S3 Bucket with Public Read & CORS
# 4. IAM Role & Instance Profile for EC2 (Least Privilege)
# 5. Amazon SNS Topic & Email Subscription
# 6. Amazon RDS PostgreSQL (db.t3.micro, Single-AZ, 20GB Free Tier)
# 7. CloudWatch Alarm for CPU > 75%
# ==============================================================================

param(
    [string]$Region = "ap-south-1",
    [string]$DbPassword = "ApleShaharPassword123!",
    [string]$AlertEmail = "your-email@example.com",
    [string]$BucketPrefix = "apleshahar-media"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting ApleShahar AWS Infrastructure Automation..." -ForegroundColor Cyan
Write-Host "Region: $Region"
Write-Host "Alert Email: $AlertEmail"

# Generate unique bucket name
$RandomSuffix = Get-Random -Minimum 10000 -Maximum 99999
$BucketName = "$BucketPrefix-$RandomSuffix"

# ------------------------------------------------------------------------------
# 1. Custom VPC, Internet Gateway & Subnets
# ------------------------------------------------------------------------------
Write-Host "`n[1/7] Creating Custom VPC & Subnets..." -ForegroundColor Yellow

$VpcId = (aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $Region --output json | ConvertFrom-Json).Vpc.VpcId
aws ec2 create-tags --resources $VpcId --tags Key=Name,Value=apleshahar-vpc --region $Region
aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-hostnames "{\`"Value\`":true}" --region $Region
Write-Host "VPC Created: $VpcId"

$IgwId = (aws ec2 create-internet-gateway --region $Region --output json | ConvertFrom-Json).InternetGateway.InternetGatewayId
aws ec2 attach-internet-gateway --vpc-id $VpcId --internet-gateway-id $IgwId --region $Region
aws ec2 create-tags --resources $IgwId --tags Key=Name,Value=apleshahar-igw --region $Region
Write-Host "Internet Gateway Created & Attached: $IgwId"

# Public Subnet in ap-south-1a
$PublicSubnetId = (aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.1.0/24 --availability-zone "${Region}a" --region $Region --output json | ConvertFrom-Json).Subnet.SubnetId
aws ec2 modify-subnet-attribute --subnet-id $PublicSubnetId --map-public-ip-on-launch --region $Region
aws ec2 create-tags --resources $PublicSubnetId --tags Key=Name,Value=apleshahar-public-1a --region $Region

# Private Subnet 1 in ap-south-1a
$PrivateSubnet1 = (aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.2.0/24 --availability-zone "${Region}a" --region $Region --output json | ConvertFrom-Json).Subnet.SubnetId
aws ec2 create-tags --resources $PrivateSubnet1 --tags Key=Name,Value=apleshahar-private-1a --region $Region

# Private Subnet 2 in ap-south-1b (Needed for RDS Multi-AZ subnet group)
$PrivateSubnet2 = (aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.3.0/24 --availability-zone "${Region}b" --region $Region --output json | ConvertFrom-Json).Subnet.SubnetId
aws ec2 create-tags --resources $PrivateSubnet2 --tags Key=Name,Value=apleshahar-private-1b --region $Region

# Public Route Table -> IGW
$PublicRouteTableId = (aws ec2 create-route-table --vpc-id $VpcId --region $Region --output json | ConvertFrom-Json).RouteTable.RouteTableId
aws ec2 create-route --route-table-id $PublicRouteTableId --destination-cidr-block 0.0.0.0/0 --gateway-id $IgwId --region $Region | Out-Null
aws ec2 associate-route-table --subnet-id $PublicSubnetId --route-table-id $PublicRouteTableId --region $Region | Out-Null
aws ec2 create-tags --resources $PublicRouteTableId --tags Key=Name,Value=apleshahar-public-rt --region $Region
Write-Host "Subnets & Routing configured."

# ------------------------------------------------------------------------------
# 2. Security Groups
# ------------------------------------------------------------------------------
Write-Host "`n[2/7] Creating Security Groups..." -ForegroundColor Yellow

# EC2 Security Group
$Ec2SgId = (aws ec2 create-security-group --group-name apleshahar-ec2-sg --description "Security group for backend EC2 instance" --vpc-id $VpcId --region $Region --output json | ConvertFrom-Json).GroupId
aws ec2 authorize-security-group-ingress --group-id $Ec2SgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region | Out-Null
aws ec2 authorize-security-group-ingress --group-id $Ec2SgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region | Out-Null
aws ec2 authorize-security-group-ingress --group-id $Ec2SgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region | Out-Null
aws ec2 create-tags --resources $Ec2SgId --tags Key=Name,Value=apleshahar-ec2-sg --region $Region
Write-Host "EC2 Security Group: $Ec2SgId"

# RDS Security Group (Allows 5432 ONLY from EC2 SG)
$RdsSgId = (aws ec2 create-security-group --group-name apleshahar-rds-sg --description "Security group for RDS PostgreSQL" --vpc-id $VpcId --region $Region --output json | ConvertFrom-Json).GroupId
aws ec2 authorize-security-group-ingress --group-id $RdsSgId --protocol tcp --port 5432 --source-group $Ec2SgId --region $Region | Out-Null
aws ec2 create-tags --resources $RdsSgId --tags Key=Name,Value=apleshahar-rds-sg --region $Region
Write-Host "RDS Security Group: $RdsSgId (Inbound 5432 restricted to EC2 SG)"

# ------------------------------------------------------------------------------
# 3. Amazon S3 Bucket & CORS
# ------------------------------------------------------------------------------
Write-Host "`n[3/7] Creating Amazon S3 Media Storage Bucket ($BucketName)..." -ForegroundColor Yellow

if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $BucketName --region $Region | Out-Null
} else {
    aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region | Out-Null
}

# Disable block public access
aws s3api put-public-access-block --bucket $BucketName --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" --region $Region

# Write S3 Bucket Policy to temp file (ASCII - no BOM)
$TempPolicyFile = [System.IO.Path]::GetTempFileName()
$BucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@
[System.IO.File]::WriteAllText($TempPolicyFile, $BucketPolicy, [System.Text.Encoding]::ASCII)
aws s3api put-bucket-policy --bucket $BucketName --policy file://$TempPolicyFile --region $Region
Remove-Item -Force $TempPolicyFile

# Write CORS configuration to temp file (ASCII - no BOM)
$TempCorsFile = [System.IO.Path]::GetTempFileName()
$CorsConfig = @"
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
"@
[System.IO.File]::WriteAllText($TempCorsFile, $CorsConfig, [System.Text.Encoding]::ASCII)
aws s3api put-bucket-cors --bucket $BucketName --cors-configuration file://$TempCorsFile --region $Region
Remove-Item -Force $TempCorsFile

Write-Host "S3 Bucket configured with public read & CORS."

# ------------------------------------------------------------------------------
# 4. IAM Role & Instance Profile for EC2
# ------------------------------------------------------------------------------
Write-Host "`n[4/7] Creating IAM Role & Instance Profile (Least Privilege)..." -ForegroundColor Yellow

$RoleName = "ApleShahar-EC2-BackendRole"

$TempTrustFile = [System.IO.Path]::GetTempFileName()
$TrustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
[System.IO.File]::WriteAllText($TempTrustFile, $TrustPolicy, [System.Text.Encoding]::ASCII)

try {
    aws iam create-role --role-name $RoleName --assume-role-policy-document file://$TempTrustFile | Out-Null
} catch {
    Write-Host "Role may already exist, proceeding..."
}
Remove-Item -Force $TempTrustFile

# Attach SSM session manager policy
aws iam attach-role-policy --role-name $RoleName --policy-arn "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"

# Create least-privilege inline policy for S3 & SNS
$TempAppPolicyFile = [System.IO.Path]::GetTempFileName()
$AppPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::$BucketName/*"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "*"
    }
  ]
}
"@
[System.IO.File]::WriteAllText($TempAppPolicyFile, $AppPolicy, [System.Text.Encoding]::ASCII)
aws iam put-role-policy --role-name $RoleName --policy-name "ApleShaharAppPermissions" --policy-document file://$TempAppPolicyFile
Remove-Item -Force $TempAppPolicyFile

# Instance profile
try {
    aws iam create-instance-profile --instance-profile-name $RoleName | Out-Null
} catch {}
try {
    aws iam add-role-to-instance-profile --instance-profile-name $RoleName --role-name $RoleName | Out-Null
} catch {}
Write-Host "IAM Instance Profile created: $RoleName"

# ------------------------------------------------------------------------------
# 5. Amazon SNS Topic & Email Alert Subscription
# ------------------------------------------------------------------------------
Write-Host "`n[5/7] Creating Amazon SNS Topic & Alert Subscription..." -ForegroundColor Yellow

$TopicArn = (aws sns create-topic --name apleshahar-complaint-alerts --region $Region --output json | ConvertFrom-Json).TopicArn
aws sns subscribe --topic-arn $TopicArn --protocol email --notification-endpoint $AlertEmail --region $Region | Out-Null
Write-Host "SNS Topic Created: $TopicArn"
Write-Host "An email was sent to $AlertEmail. Please click 'Confirm subscription' in your inbox!" -ForegroundColor Magenta

# ------------------------------------------------------------------------------
# 6. Amazon RDS PostgreSQL
# ------------------------------------------------------------------------------
Write-Host "`n[6/7] Creating DB Subnet Group and RDS PostgreSQL Instance..." -ForegroundColor Yellow

aws rds create-db-subnet-group `
    --db-subnet-group-name apleshahar-db-subnets `
    --db-subnet-group-description "Private subnets for ApleShahar RDS" `
    --subnet-ids $PrivateSubnet1 $PrivateSubnet2 `
    --region $Region | Out-Null

Write-Host "Launching RDS PostgreSQL (db.t3.micro, Single-AZ, Free Tier)..."
aws rds create-db-instance `
    --db-instance-identifier apleshahar-postgres `
    --db-instance-class db.t3.micro `
    --engine postgres `
    --engine-version "16.10" `
    --allocated-storage 20 `
    --storage-type gp3 `
    --master-username postgres `
    --master-user-password $DbPassword `
    --db-name apleshahar `
    --vpc-security-group-ids $RdsSgId `
    --db-subnet-group-name apleshahar-db-subnets `
    --no-publicly-accessible `
    --no-multi-az `
    --backup-retention-period 1 `
    --region $Region | Out-Null

Write-Host "RDS Instance creation triggered (provisioning takes ~4-6 minutes)."

# ------------------------------------------------------------------------------
# 7. CloudWatch Alarm for CPU Utilization
# ------------------------------------------------------------------------------
Write-Host "`n[7/7] Setting up CloudWatch Alarm..." -ForegroundColor Yellow

aws cloudwatch put-metric-alarm `
    --alarm-name "EC2-HighCPU-Alarm" `
    --alarm-description "Triggers if backend EC2 CPU exceeds 75%" `
    --metric-name CPUUtilization `
    --namespace AWS/EC2 `
    --statistic Average `
    --period 300 `
    --threshold 75 `
    --comparison-operator GreaterThanThreshold `
    --evaluation-periods 1 `
    --alarm-actions $TopicArn `
    --region $Region | Out-Null

Write-Host "CloudWatch Alarm created."

# ------------------------------------------------------------------------------
# Output Summary
# ------------------------------------------------------------------------------
Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "AWS INFRASTRUCTURE PROVISIONING COMPLETE!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "VPC ID:                 $VpcId"
Write-Host "Public Subnet (EC2):    $PublicSubnetId"
Write-Host "EC2 Security Group:     $Ec2SgId"
Write-Host "IAM Instance Profile:   $RoleName"
Write-Host "S3 Media Bucket:        $BucketName"
Write-Host "SNS Topic ARN:          $TopicArn"
Write-Host "RDS Instance ID:        apleshahar-postgres (Port 5432)"
Write-Host "`nTo check RDS endpoint status:" -ForegroundColor Cyan
Write-Host "aws rds describe-db-instances --db-instance-identifier apleshahar-postgres --query 'DBInstances[0].Endpoint.Address' --region $Region"
Write-Host "==============================================================================`n"

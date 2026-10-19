#!/usr/bin/env bash
# ==============================================================================
# ApleShahar AWS Cloud Architecture Automated Deployment Script (Bash)
# ==============================================================================
# Compatible with: Linux, macOS, Git Bash, WSL, and AWS CloudShell.
# ==============================================================================

set -euo pipefail

REGION="${1:-ap-south-1}"
DB_PASSWORD="${2:-ApleShaharPassword123!}"
ALERT_EMAIL="${3:-your-email@example.com}"
BUCKET_PREFIX="${4:-apleshahar-media}"

RANDOM_SUFFIX=$((10000 + RANDOM % 90000))
BUCKET_NAME="${BUCKET_PREFIX}-${RANDOM_SUFFIX}"

echo "=============================================================================="
echo "🚀 Starting ApleShahar AWS Infrastructure Automation..."
echo "Region: $REGION | Email: $ALERT_EMAIL | Bucket: $BUCKET_NAME"
echo "=============================================================================="

# 1. Custom VPC, Internet Gateway & Subnets
echo "[1/7] Creating Custom VPC and Subnets..."
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region "$REGION" --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources "$VPC_ID" --tags Key=Name,Value=apleshahar-vpc --region "$REGION"
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames "{\"Value\":true}" --region "$REGION"

IGW_ID=$(aws ec2 create-internet-gateway --region "$REGION" --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID" --region "$REGION"
aws ec2 create-tags --resources "$IGW_ID" --tags Key=Name,Value=apleshahar-igw --region "$REGION"

PUBLIC_SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 --availability-zone "${REGION}a" --region "$REGION" --query 'Subnet.SubnetId' --output text)
aws ec2 modify-subnet-attribute --subnet-id "$PUBLIC_SUBNET_ID" --map-public-ip-on-launch --region "$REGION"
aws ec2 create-tags --resources "$PUBLIC_SUBNET_ID" --tags Key=Name,Value=apleshahar-public-1a --region "$REGION"

PRIVATE_SUBNET_1=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.2.0/24 --availability-zone "${REGION}a" --region "$REGION" --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$PRIVATE_SUBNET_1" --tags Key=Name,Value=apleshahar-private-1a --region "$REGION"

PRIVATE_SUBNET_2=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.3.0/24 --availability-zone "${REGION}b" --region "$REGION" --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$PRIVATE_SUBNET_2" --tags Key=Name,Value=apleshahar-private-1b --region "$REGION"

PUBLIC_RT_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --region "$REGION" --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id "$PUBLIC_RT_ID" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" --region "$REGION" >/dev/null
aws ec2 associate-route-table --subnet-id "$PUBLIC_SUBNET_ID" --route-table-id "$PUBLIC_RT_ID" --region "$REGION" >/dev/null
aws ec2 create-tags --resources "$PUBLIC_RT_ID" --tags Key=Name,Value=apleshahar-public-rt --region "$REGION"
echo "✅ VPC ($VPC_ID) and Subnets configured."

# 2. Security Groups
echo "[2/7] Creating Tiered Security Groups..."
EC2_SG_ID=$(aws ec2 create-security-group --group-name apleshahar-ec2-sg --description "EC2 Backend Security Group" --vpc-id "$VPC_ID" --region "$REGION" --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$REGION" >/dev/null
aws ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$REGION" >/dev/null
aws ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$REGION" >/dev/null
aws ec2 create-tags --resources "$EC2_SG_ID" --tags Key=Name,Value=apleshahar-ec2-sg --region "$REGION"

RDS_SG_ID=$(aws ec2 create-security-group --group-name apleshahar-rds-sg --description "RDS PostgreSQL Security Group" --vpc-id "$VPC_ID" --region "$REGION" --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id "$RDS_SG_ID" --protocol tcp --port 5432 --source-group "$EC2_SG_ID" --region "$REGION" >/dev/null
aws ec2 create-tags --resources "$RDS_SG_ID" --tags Key=Name,Value=apleshahar-rds-sg --region "$REGION"
echo "✅ EC2 SG: $EC2_SG_ID | RDS SG: $RDS_SG_ID"

# 3. Amazon S3 Bucket
echo "[3/7] Creating S3 Media Bucket ($BUCKET_NAME)..."
if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null
else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
fi

aws s3api put-public-access-block --bucket "$BUCKET_NAME" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" --region "$REGION"

cat <<EOF > /tmp/s3_policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/s3_policy.json --region "$REGION"

cat <<EOF > /tmp/cors.json
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
EOF
aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file:///tmp/cors.json --region "$REGION"
echo "✅ S3 Bucket configured with public read & CORS."

# 4. IAM Role & Instance Profile
echo "[4/7] Creating IAM Role & Instance Profile..."
ROLE_NAME="ApleShahar-EC2-BackendRole"
cat <<EOF > /tmp/trust_policy.json
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
EOF
aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file:///tmp/trust_policy.json 2>/dev/null || true
aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" 2>/dev/null || true

cat <<EOF > /tmp/app_policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "*"
    }
  ]
}
EOF
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name "ApleShaharAppPermissions" --policy-document file:///tmp/app_policy.json

aws iam create-instance-profile --instance-profile-name "$ROLE_NAME" 2>/dev/null || true
aws iam add-role-to-instance-profile --instance-profile-name "$ROLE_NAME" --role-name "$ROLE_NAME" 2>/dev/null || true
echo "✅ IAM Instance Profile created: $ROLE_NAME"

# 5. Amazon SNS Topic
echo "[5/7] Creating Amazon SNS Topic & Subscription..."
TOPIC_ARN=$(aws sns create-topic --name apleshahar-complaint-alerts --region "$REGION" --query 'TopicArn' --output text)
aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "$ALERT_EMAIL" --region "$REGION" >/dev/null
echo "✅ SNS Topic: $TOPIC_ARN"
echo "⚠️ Check $ALERT_EMAIL and click 'Confirm subscription'!"

# 6. Amazon RDS PostgreSQL
echo "[6/7] Creating DB Subnet Group and RDS PostgreSQL Instance..."
aws rds create-db-subnet-group \
    --db-subnet-group-name apleshahar-db-subnets \
    --db-subnet-group-description "Private subnets for ApleShahar RDS" \
    --subnet-ids "$PRIVATE_SUBNET_1" "$PRIVATE_SUBNET_2" \
    --region "$REGION" >/dev/null

aws rds create-db-instance \
    --db-instance-identifier apleshahar-postgres \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version "16.10" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --master-username postgres \
    --master-user-password "$DB_PASSWORD" \
    --db-name apleshahar \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --db-subnet-group-name apleshahar-db-subnets \
    --no-publicly-accessible \
    --no-multi-az \
    --backup-retention-period 1 \
    --region "$REGION" >/dev/null
echo "✅ RDS PostgreSQL triggered (db.t3.micro, Single-AZ, Free Tier)."

# 7. CloudWatch Alarm
echo "[7/7] Configuring CloudWatch CPU Alarm..."
aws cloudwatch put-metric-alarm \
    --alarm-name "EC2-HighCPU-Alarm" \
    --alarm-description "Triggers if backend EC2 CPU exceeds 75%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 75 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" >/dev/null
echo "✅ CloudWatch Alarm created."

echo "=============================================================================="
echo "🎉 INFRASTRUCTURE PROVISIONING COMPLETE!"
echo "=============================================================================="
echo "VPC ID:                 $VPC_ID"
echo "Public Subnet (EC2):    $PUBLIC_SUBNET_ID"
echo "EC2 Security Group:     $EC2_SG_ID"
echo "IAM Instance Profile:   $ROLE_NAME"
echo "S3 Media Bucket:        $BUCKET_NAME"
echo "SNS Topic ARN:          $TOPIC_ARN"
echo "=============================================================================="

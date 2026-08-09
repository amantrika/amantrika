#!/usr/bin/env bash
#
# Everything Amantrika owns in AWS, in one screen.
#
#   npm run aws:status
#
# Reads only — it creates nothing and changes nothing, so it is safe to run at
# any time. If `aws sts get-caller-identity` fails, your session has expired:
# run `aws login` again.
#
set -uo pipefail

ACCOUNT=477977196441
REGION=ap-southeast-1
POOL=ap-southeast-1_lkjHBiWu1

echo "════════ IDENTITY ════════"
aws sts get-caller-identity --query '{Account:Account,Identity:Arn}' --output table 2>&1

echo
echo "════════ DYNAMODB — the database ════════"
aws dynamodb describe-table --table-name amantrika --region "$REGION" \
  --query 'Table.{Status:TableStatus,Items:ItemCount,Bytes:TableSizeBytes,Billing:BillingModeSummary.BillingMode}' \
  --output table 2>&1
echo "Point-in-time recovery (must be ENABLED before the first real customer):"
aws dynamodb describe-continuous-backups --table-name amantrika --region "$REGION" \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
  --output text 2>&1

echo
echo "════════ COGNITO — sign-in ════════"
aws cognito-idp describe-user-pool --user-pool-id "$POOL" --region "$REGION" \
  --query 'UserPool.{Pool:Name,Id:Id,Tier:UserPoolTier,Users:EstimatedNumberOfUsers}' \
  --output table 2>&1

echo
echo "════════ SES — email ════════"
aws sesv2 get-account --region "$REGION" \
  --query '{ProductionAccess:ProductionAccessEnabled,Sending:SendingEnabled,DailyCap:SendQuota.Max24HourSend,SentToday:SendQuota.SentLast24Hours}' \
  --output table 2>&1

echo
echo "════════ SPEND ════════"
aws budgets describe-budgets --account-id "$ACCOUNT" \
  --query 'Budgets[].{Budget:BudgetName,Limit:BudgetLimit.Amount,Actual:CalculatedSpend.ActualSpend.Amount,Forecast:CalculatedSpend.ForecastedSpend.Amount}' \
  --output table 2>&1

echo
echo "════════ EVERY TAGGED RESOURCE ════════"
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=Amantrika \
  --region "$REGION" --query 'ResourceTagMappingList[].ResourceARN' --output text 2>&1 | tr '\t' '\n'

echo
echo "Console links (sign in as the Amantrika account first):"
echo "  Table    https://$REGION.console.aws.amazon.com/dynamodbv2/home?region=$REGION#item-explorer?table=amantrika"
echo "  Cognito  https://$REGION.console.aws.amazon.com/cognito/v2/idp/user-pools/$POOL/users?region=$REGION"
echo "  Billing  https://us-east-1.console.aws.amazon.com/costmanagement/home#/home"

#!/usr/bin/env bash
# ==============================================================================
# ApleShahar Team IAM Users Creation Script (Bash)
# ==============================================================================

set -euo pipefail

ACCOUNT_ALIAS="${1:-cclmp-apleshahar}"
USER1="${2:-teammate1}"
USER2="${3:-teammate2}"
INITIAL_PASSWORD="${4:-TempPassword123!}"

echo "Creating IAM Team Accounts and Permissions..."

# 1. Create Account Alias
aws iam create-account-alias --account-alias "$ACCOUNT_ALIAS" 2>/dev/null || echo "Account alias already set or unavailable, continuing..."

# 2. Create Developers Group and attach Administrator policy
aws iam create-group --group-name Developers 2>/dev/null || true
aws iam attach-group-policy --group-name Developers --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
echo "Developers group configured with AdministratorAccess."

# 3. Create User 1
aws iam create-user --user-name "$USER1" 2>/dev/null || true
aws iam add-user-to-group --user-name "$USER1" --group-name Developers
aws iam create-login-profile --user-name "$USER1" --password "$INITIAL_PASSWORD" --password-reset-required 2>/dev/null || \
aws iam update-login-profile --user-name "$USER1" --password "$INITIAL_PASSWORD" --password-reset-required
echo "User created: $USER1"

# 4. Create User 2
aws iam create-user --user-name "$USER2" 2>/dev/null || true
aws iam add-user-to-group --user-name "$USER2" --group-name Developers
aws iam create-login-profile --user-name "$USER2" --password "$INITIAL_PASSWORD" --password-reset-required 2>/dev/null || \
aws iam update-login-profile --user-name "$USER2" --password "$INITIAL_PASSWORD" --password-reset-required
echo "User created: $USER2"

echo "=============================================================================="
echo "IAM TEAM CREDENTIALS GENERATED"
echo "=============================================================================="
echo "Console Login URL:   https://${ACCOUNT_ALIAS}.signin.aws.amazon.com/console"
echo "Teammate 1 Username: ${USER1}"
echo "Teammate 2 Username: ${USER2}"
echo "Temporary Password:  ${INITIAL_PASSWORD}"
echo "=============================================================================="

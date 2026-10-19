# ==============================================================================
# ApleShahar Team IAM Users Creation Script (PowerShell)
# ==============================================================================
# This script:
# 1. Sets an Account Alias for a clean web console sign-in URL
# 2. Creates a 'Developers' IAM group with AdministratorAccess
# 3. Creates IAM user accounts for both teammates
# 4. Sets temporary passwords with required password reset on first login
# ==============================================================================

param(
    [string]$AccountAlias = "cclmp-apleshahar",
    [string]$User1 = "teammate1",
    [string]$User2 = "teammate2",
    [string]$InitialPassword = "TempPassword123!"
)

$ErrorActionPreference = "Stop"

Write-Host "Creating IAM Team Accounts and Permissions..." -ForegroundColor Cyan

# 1. Create Account Alias (clean sign-in URL)
try {
    aws iam create-account-alias --account-alias $AccountAlias
    Write-Host "Account alias set: $AccountAlias"
} catch {
    Write-Host "Account alias already set or unavailable, continuing..."
}

# 2. Create Developers Group and attach Administrator policy
try {
    aws iam create-group --group-name Developers | Out-Null
} catch {}

aws iam attach-group-policy --group-name Developers --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
Write-Host "Developers group configured with AdministratorAccess."

# 3. Create User 1
try {
    aws iam create-user --user-name $User1 | Out-Null
} catch {}
aws iam add-user-to-group --user-name $User1 --group-name Developers
try {
    aws iam create-login-profile --user-name $User1 --password $InitialPassword --password-reset-required | Out-Null
} catch {
    aws iam update-login-profile --user-name $User1 --password $InitialPassword --password-reset-required | Out-Null
}
Write-Host "User created: $User1"

# 4. Create User 2
try {
    aws iam create-user --user-name $User2 | Out-Null
} catch {}
aws iam add-user-to-group --user-name $User2 --group-name Developers
try {
    aws iam create-login-profile --user-name $User2 --password $InitialPassword --password-reset-required | Out-Null
} catch {
    aws iam update-login-profile --user-name $User2 --password $InitialPassword --password-reset-required | Out-Null
}
Write-Host "User created: $User2"

# Summary
Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "IAM TEAM CREDENTIALS GENERATED" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "Console Login URL:   https://$AccountAlias.signin.aws.amazon.com/console"
Write-Host "Teammate 1 Username: $User1"
Write-Host "Teammate 2 Username: $User2"
Write-Host "Temporary Password:  $InitialPassword"
Write-Host "Note: Both users will be forced to change this password on first login."
Write-Host "==============================================================================`n"

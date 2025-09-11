# Ask for commit message
$Message = Read-Host "Enter commit message (Enter to reuse last, q to cancel)"

# Cancel gracefully if 'q'
if ($Message -eq "q") {
    Write-Output "Release aborted by user."
    exit 0
}

# If message is empty, reuse last commit message
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = git log -1 --pretty=%B
    Write-Output "Reusing last commit message: '$Message'"
}

# Determine next version
$existing = git log --pretty=%B | Select-String -Pattern ("^" + [regex]::Escape($Message) + "( v(\d+))?$") -AllMatches
if ($existing.Count -eq 0) {
    $VersionedMessage = "$Message v1"
} else {
    $lastVersion = $existing.Matches | ForEach-Object { if ($_.Groups[2].Value) { [int]$_.Groups[2].Value } else { 1 } } | Sort-Object -Descending | Select-Object -First 1
    $nextVersion = $lastVersion + 1
    $VersionedMessage = "$Message v$nextVersion"
}

Write-Output "Using commit message: '$VersionedMessage'"

# Commit source changes (only if there are any)
git add .
if (git commit -m "$VersionedMessage" 2>$null) {
    # Build the project
    npm run build

    # Add build output and amend into the same commit
    git add dist
    git commit --amend --no-edit

    # Deploy + push
    npm run deploy
    git push origin main
}
else {
    Write-Output "No source changes, skipping build/deploy/push."
}

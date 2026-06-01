# Run as Administrator (right-click PowerShell → Run as administrator)
# Allows phones on your Wi-Fi to reach the GetGas backend on port 4000

$ruleName = 'GetGas API 4000'

# Remove old rule if it only allowed Private (common miss when Wi-Fi is "Public")
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 4000 `
  -Action Allow `
  -Profile Any `
  -Description 'GetGas Express API for mobile dev on local network'

Write-Host "Created/updated firewall rule '$ruleName' for ALL network profiles (Public + Private)."

Write-Host ""
Write-Host "Current Wi-Fi network category:"
Get-NetConnectionProfile | Select-Object Name, InterfaceAlias, NetworkCategory | Format-Table -AutoSize

Write-Host "LAN IPs:"
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.InterfaceAlias -notlike '*Loopback*' } |
  Select-Object IPAddress, InterfaceAlias |
  Format-Table -AutoSize

Write-Host "Test from phone: http://192.168.100.2:4000/health"
Write-Host ""
Write-Host "TIP: For home Wi-Fi, also consider: Settings → Network → Wi-Fi → your network → Private"

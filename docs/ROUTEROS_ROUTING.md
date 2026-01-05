# RouterOS Routing Configuration

## Overview

This document describes the RouterOS routing configuration that is automatically generated when exporting rules from Lilibox.

## Problem Statement

The system needs to route traffic for specific domains (resolved via static DNS) through a designated VPN gateway (10.10.10.17), while the RouterOS device connects to the internet via dial-up with IP 10.10.10.10.

## Solution

The export script generates a complete RouterOS configuration that includes:

1. **Routing Infrastructure**: Creates a separate routing table for VPN traffic
2. **Traffic Marking**: Uses firewall mangle rules to mark packets from/to addresses in the vpn_list
3. **Policy-Based Routing**: Routes marked traffic through the VPN gateway

## Generated Configuration Components

### 1. Global Variables

```routeros
:global vpn_dns_server
:global vpn_list "vpn_list"
:global vpn_gateway "10.10.10.17"
:global vpn_routing_mark "vpn_mark"
```

### 2. Routing Table

Creates a separate routing table for VPN traffic:

```routeros
/routing table add name=vpn_table fib comment="VPN routing table"
```

### 3. Firewall Mangle Rules

Marks connections and routing for traffic to/from addresses in the vpn_list:

```routeros
# Mark connections from source addresses in vpn_list
/ip firewall mangle add chain=prerouting src-address-list=vpn_list action=mark-connection new-connection-mark=vpn_conn passthrough=yes comment="Mark VPN connections (src)"

# Mark connections to destination addresses in vpn_list
/ip firewall mangle add chain=prerouting dst-address-list=vpn_list action=mark-connection new-connection-mark=vpn_conn passthrough=yes comment="Mark VPN connections (dst)"

# Mark routing for marked connections
/ip firewall mangle add chain=prerouting connection-mark=vpn_conn action=mark-routing new-routing-mark=$vpn_routing_mark passthrough=no comment="Mark routing for VPN traffic"
```

### 4. Route to VPN Gateway

Adds a default route in the VPN routing table that points to the gateway:

```routeros
/ip route add dst-address=0.0.0.0/0 gateway=$vpn_gateway routing-table=vpn_table comment="Route all VPN traffic via gateway"
```

### 5. Routing Rules

Routes traffic from/to the vpn_list through the VPN routing table:

```routeros
# Route traffic from addresses in vpn_list
/routing rule add src-address-list=vpn_list table=vpn_table comment="Use VPN table for marked source"

# Route traffic to addresses in vpn_list
/routing rule add dst-address-list=vpn_list table=vpn_table comment="Use VPN table for marked destination"
```

### 6. DNS Static Entries

For each domain in the rule lists:

```routeros
# Exact domain match
/ip dns static add name=example.com type=FWD forward-to=$vpn_dns_server address-list=vpn_list match-subdomain=no comment="vpn-dns: RuleName"

# Domain suffix match (includes subdomains)
/ip dns static add name=example.com type=FWD forward-to=$vpn_dns_server address-list=vpn_list match-subdomain=yes comment="vpn-dns: RuleName"
```

### 7. IP Address Lists

For each IP-CIDR rule:

```routeros
/ip firewall address-list add address=74.125.0.0/16 comment="vpn: RuleName" list=vpn_list
/ip firewall address-list add address=2620:120:e000::/40 comment="vpn: RuleName" list=vpn_list
```

## Traffic Flow

1. **DNS Resolution**: When a device queries a domain that has a static DNS entry:
   - The DNS server forwards the query to `$vpn_dns_server`
   - The resolved IP is automatically added to the `vpn_list` address-list

2. **Traffic Marking**: When traffic is sent to/from an address in `vpn_list`:
   - The firewall mangle rule marks the connection as `vpn_conn`
   - The routing mark `vpn_mark` is applied to packets in this connection

3. **Routing Decision**: Traffic with the `vpn_mark` routing mark:
   - Is evaluated against the routing rules
   - Matches the rule to use the `vpn_table` routing table
   - Is routed through the VPN gateway (10.10.10.17) instead of the default gateway

## Configuration Variables

Before running the generated script, you need to set the following variables:

```routeros
# Set your VPN DNS server (e.g., 8.8.8.8 or your VPN provider's DNS)
:global vpn_dns_server "8.8.8.8"
```

## Usage

1. Export the RouterOS script from Lilibox by selecting the desired rule links
2. Download the generated `.rsc` file
3. Set the `vpn_dns_server` variable in RouterOS
4. Upload and run the script on your RouterOS device:
   ```
   /import lilibox-export.rsc
   ```

## Network Topology

```
┌─────────────┐
│   Client    │
│  Devices    │
└──────┬──────┘
       │
       │ DNS Query
       ▼
┌─────────────────────────────────────┐
│        RouterOS Device              │
│  ┌───────────────────────────────┐  │
│  │   Static DNS Resolution       │  │
│  │   → Adds IP to vpn_list       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Firewall Mangle Rules       │  │
│  │   → Mark VPN connections      │  │
│  │   → Mark routing              │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Routing Decision            │  │
│  │   → Use vpn_table for marked  │  │
│  └───────────────────────────────┘  │
└──────┬─────────────────┬────────────┘
       │                 │
       │ Default         │ VPN Traffic
       │ Internet        │ (to vpn_list)
       ▼                 ▼
┌─────────────┐   ┌──────────────┐
│   ISP       │   │ VPN Gateway  │
│             │   │ 10.10.10.17  │
└─────────────┘   └──────────────┘
```

## Notes

- The configuration uses policy-based routing to ensure only traffic to/from specific addresses uses the VPN gateway
- All other traffic continues to use the default internet connection
- DNS resolution for VPN domains is forwarded to a separate DNS server to avoid DNS leaks
- The script is idempotent but may create duplicates if run multiple times. Clean up old rules before re-importing.

## Troubleshooting

### Traffic not routing through VPN

1. Check if the address is in the vpn_list:
   ```
   /ip firewall address-list print where list=vpn_list
   ```

2. Check if connections are being marked:
   ```
   /ip firewall mangle print
   ```

3. Verify the routing table exists:
   ```
   /routing table print
   ```

4. Check routing rules:
   ```
   /routing rule print
   ```

### DNS not resolving

1. Verify static DNS entries:
   ```
   /ip dns static print
   ```

2. Check if `vpn_dns_server` variable is set:
   ```
   :put $vpn_dns_server
   ```

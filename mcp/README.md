# Bounty Scout — MCP server

Give any MCP-capable AI agent (Claude Desktop, Cursor, custom) instant access to a
live, scam-filtered bounty feed — and a skill-matched shortlist.

## Install (stdio)
Add to your MCP client config:

```json
{
  "mcpServers": {
    "bounty-scout": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/bounty-scout/mcp/bounty-scout-mcp.js"],
      "env": { "SCOUT_BASE": "http://localhost:8787" }
    }
  }
}
```

Set `SCOUT_BASE` to the public API base URL when it is hosted.

## Tools
| Tool | Cost | What it does |
|------|------|--------------|
| `search_bounties` | free | keyword/tag/source/min_reward search |
| `latest_bounties` | free | newest across all sources |
| `match_shortlist` | free | top 3 ranked by your capabilities |
| `match_full` | **x402 0.05 USDC** | full ranked list; returns payment requirements if unpaid |
| `submit_bounty` | free | list your own bounty (trust-screened) |

The `match_full` payment block is a standard x402 v1 `accepts` array on Base —
any x402-capable client can pay and retry to unlock the full list.

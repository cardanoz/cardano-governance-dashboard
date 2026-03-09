# ADAtool API Responses - Phase 8, 10, 11, 14

Reference guide for all new API endpoints with example responses.

## Phase 8: Token & NFT Explorer

### GET `/tokens?page=1&limit=20`

**Request:**
```
GET /tokens?page=1&limit=5
```

**Response (200 OK):**
```json
[
  {
    "id": 1024567,
    "policy": "7efd3d87ae5b9a2c9d8e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b",
    "asset_name": "44f5f61746f6f6c",
    "display_name": "DFATool",
    "fingerprint": "asset1aqrdypg669jgazruv5ah07nuyqe0wxjhe2el6f",
    "tx_count": 15847
  },
  {
    "id": 1024568,
    "policy": "c0ff33e5c3aab7e2d1a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d",
    "asset_name": "424f424f",
    "display_name": "BOBO",
    "fingerprint": "asset1yx3k25uv4yq69fegzzukwjjsrx5uvqsmhjgyqh",
    "tx_count": 8234
  }
]
```

**Status codes:**
- 200: Success
- 400: Invalid page/limit parameters

---

### GET `/token/:fingerprint`

**Request:**
```
GET /token/asset1aqrdypg669jgazruv5ah07nuyqe0wxjhe2el6f
```

**Response (200 OK):**
```json
{
  "policy": "7efd3d87ae5b9a2c9d8e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b",
  "asset_name": "44f5f61746f6f6c",
  "display_name": "DFATool",
  "fingerprint": "asset1aqrdypg669jgazruv5ah07nuyqe0wxjhe2el6f",
  "total_minted": "1000000000",
  "tx_count": 15847
}
```

**Status codes:**
- 200: Success
- 404: Token not found (returns null)

---

### GET `/token/:fingerprint/holders?limit=20`

**Request:**
```
GET /token/asset1aqrdypg669jgazruv5ah07nuyqe0wxjhe2el6f/holders?limit=5
```

**Response (200 OK):**
```json
[
  {
    "address": "addr1qxl2gxfnakemqpf8nf5y0xzh8f8h8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8",
    "quantity": "500000000"
  },
  {
    "address": "addr1qy8e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9",
    "quantity": "250000000"
  },
  {
    "address": "addr1qz7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7",
    "quantity": "125000000"
  }
]
```

**Notes:**
- Uses DISTINCT ON for approximate holders
- Ordered by quantity DESC (highest first)
- Real UTXO balance requires off-chain processing

---

### GET `/tokens/mints?limit=20`

**Request:**
```
GET /tokens/mints?limit=3
```

**Response (200 OK):**
```json
[
  {
    "policy": "c0ff33e5c3aab7e2d1a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d",
    "display_name": "BOBO",
    "fingerprint": "asset1yx3k25uv4yq69fegzzukwjjsrx5uvqsmhjgyqh",
    "quantity": "1000000",
    "tx_hash": "3fa3e5a8c7d9e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8",
    "time": "2026-03-08T14:32:45.123Z"
  },
  {
    "policy": "7efd3d87ae5b9a2c9d8e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b",
    "display_name": "DFATool",
    "fingerprint": "asset1aqrdypg669jgazruv5ah07nuyqe0wxjhe2el6f",
    "quantity": "500000",
    "tx_hash": "2eb2d4b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0",
    "time": "2026-03-08T13:15:20.456Z"
  }
]
```

---

## Phase 10: Enhanced Search & Pagination

### GET `/blocks?page=1&limit=20`

**Request:**
```
GET /blocks?page=1&limit=3
```

**Response (200 OK):**
```json
[
  {
    "block_no": 10847532,
    "epoch_no": 486,
    "slot_no": 87653422,
    "hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    "time": "2026-03-09T10:15:32.000Z",
    "tx_count": 287
  },
  {
    "block_no": 10847531,
    "epoch_no": 486,
    "slot_no": 87653402,
    "hash": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "time": "2026-03-09T10:14:52.000Z",
    "tx_count": 312
  }
]
```

---

### GET `/txs?page=1&limit=20`

**Request:**
```
GET /txs?page=1&limit=3
```

**Response (200 OK):**
```json
[
  {
    "tx_hash": "3fa3e5a8c7d9e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8",
    "block_id": 10847532,
    "fee": "181000",
    "out_sum": "5000000000"
  },
  {
    "tx_hash": "2eb2d4b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0",
    "block_id": 10847532,
    "fee": "165000",
    "out_sum": "2500000000"
  }
]
```

---

### GET `/pool/:hash/delegators?limit=20`

**Request:**
```
GET /pool/pool1aqrdypg669jgazruv5ah07nuyqe0wxjhekup9xq/delegators?limit=3
```

**Response (200 OK):**
```json
[
  {
    "address": "stake1uyrdypg669jgazruv5ah07nuyqe0wxjhe0a7vx",
    "amount": "5000000000"
  },
  {
    "address": "stake1uyxl2gxfnakemqpf8nf5y0xzh8f8h8f8f8f8f8f8",
    "amount": "3500000000"
  },
  {
    "address": "stake1uy8e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9",
    "amount": "2750000000"
  }
]
```

**Notes:**
- Amount in lovelace (divide by 1,000,000 for ADA)
- Sorted by amount DESC (highest delegators first)
- Uses latest epoch_stake for current amounts

---

### GET `/pool/:hash/blocks?limit=20`

**Request:**
```
GET /pool/pool1aqrdypg669jgazruv5ah07nuyqe0wxjhekup9xq/blocks?limit=3
```

**Response (200 OK):**
```json
[
  {
    "block_no": 10847532,
    "epoch_no": 486,
    "slot_no": 87653422,
    "hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    "time": "2026-03-09T10:15:32.000Z",
    "tx_count": 287
  },
  {
    "block_no": 10847512,
    "epoch_no": 486,
    "slot_no": 87653022,
    "hash": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "time": "2026-03-09T09:45:12.000Z",
    "tx_count": 295
  }
]
```

---

### GET `/address/:addr/tokens`

**Request:**
```
GET /address/addr1qxl2gxfnakemqpf8nf5y0xzh8f8h8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8
```

**Response (200 OK):**
```json
[
  {
    "fingerprint": "asset1aqrdypg669jgazruv5ah07nuyqe0wxjhe2el6f",
    "display_name": "DFATool",
    "policy": "7efd3d87ae5b9a2c9d8e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b",
    "balance": "500000000"
  },
  {
    "fingerprint": "asset1yx3k25uv4yq69fegzzukwjjsrx5uvqsmhjgyqh",
    "display_name": "BOBO",
    "policy": "c0ff33e5c3aab7e2d1a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d",
    "balance": "125000000"
  }
]
```

**Notes:**
- Balance is sum of all ma_tx_out for that address
- Ordered by balance DESC (most holdings first)
- Only includes UTXO currently in tx_out table

---

### GET `/search?q=xxx`

**Request Examples:**
```
GET /search?q=addr1qxl2gxfnakemqpf8nf5y0xzh8f8h8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8
GET /search?q=3fa3e5a8c7d9e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8
GET /search?q=10847532
GET /search?q=MyPool
GET /search?q=asset1aqr
```

**Response (200 OK) - Multiple results possible:**
```json
[
  {
    "type": "address",
    "value": "addr1qxl2gxfnakemqpf8nf5y0xzh8f8h8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8",
    "label": "Address addr1qxl2gxfnakemqp..."
  },
  {
    "type": "pool",
    "value": "pool1aqrdypg669jgazruv5ah07nuyqe0wxjhekup9xq",
    "label": "[MYPL] MyPool"
  }
]
```

**Types returned:** `tx`, `block`, `address`, `epoch`, `pool`, `asset`

---

## Phase 11: Real-time Features

### GET `/stream/blocks` (Server-Sent Events)

**Request:**
```
GET /stream/blocks
Content-Type: text/event-stream
```

**Response (streaming):**
```
data: {"id":12345,"block_no":10847533,"hash":"c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3","time":"2026-03-09T10:16:32.000Z"}

data: {"id":12346,"block_no":10847534,"hash":"d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4","time":"2026-03-09T10:17:12.000Z"}

data: {"id":12347,"block_no":10847535,"hash":"e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5","time":"2026-03-09T10:17:52.000Z"}
```

**Notes:**
- Connection stays open and sends updates every 5 seconds
- New blocks sent as `data: {json}\n\n`
- Client can use `EventSource` API to listen
- Connection closes after client disconnect

**JavaScript Client Example:**
```javascript
const eventSource = new EventSource('/stream/blocks');
eventSource.onmessage = (event) => {
  const block = JSON.parse(event.data);
  console.log(`New block: #${block.block_no}`);
};
eventSource.onerror = () => eventSource.close();
```

---

### GET `/stats/live`

**Request:**
```
GET /stats/live
```

**Response (200 OK):**
```json
{
  "block_no": 10847535,
  "epoch_no": 486,
  "tx_count_today": 287432,
  "tps": "4.35"
}
```

**Cache:** 10 seconds (updates frequently)

**Fields:**
- `block_no`: Latest block number on chain
- `epoch_no`: Current epoch number
- `tx_count_today`: Transactions in last 24 hours
- `tps`: Estimated transactions/second (from last 20 blocks)

---

## Phase 14: Advanced Analytics

### GET `/analytics/network`

**Request:**
```
GET /analytics/network
```

**Response (200 OK) - 30 days of data:**
```json
[
  {
    "date": "2026-02-07",
    "tx_count": 245623,
    "addresses": 8743,
    "volume": "125000000000000"
  },
  {
    "date": "2026-02-08",
    "tx_count": 263412,
    "addresses": 8891,
    "volume": "134000000000000"
  },
  {
    "date": "2026-02-09",
    "tx_count": 287654,
    "addresses": 9125,
    "volume": "142500000000000"
  },
  ...
  {
    "date": "2026-03-09",
    "tx_count": 312847,
    "addresses": 9534,
    "volume": "156800000000000"
  }
]
```

**Notes:**
- Covers last 30 days from current date
- `tx_count`: Number of unique transactions that day
- `addresses`: COUNT(DISTINCT address) from tx_out
- `volume`: SUM(out_sum) in lovelace
- Ordered by date ASC (oldest first)
- Cache: 3600 seconds (1 hour)

---

### GET `/analytics/pool-landscape`

**Request:**
```
GET /analytics/pool-landscape
```

**Response (200 OK):**
```json
{
  "active_pools": 2847,
  "retired_pools": 1245,
  "delegated_to_pools": 2634
}
```

**Fields:**
- `active_pools`: Pools with no retirement record
- `retired_pools`: Total pools that have retired
- `delegated_to_pools`: Pools with active delegations
- Cache: 3600 seconds (1 hour)

**Calculations:**
- Active% = 2847 / (2847 + 1245) = 69.6%
- Adoption% = 2634 / 2847 = 92.5%

---

### GET `/analytics/governance-stats`

**Request:**
```
GET /analytics/governance-stats
```

**Response (200 OK):**
```json
{
  "total_dreps": 1247,
  "total_votes": 847392,
  "ratified_proposals": 42,
  "total_proposals": 156
}
```

**Fields:**
- `total_dreps`: Count of registered Delegation Representatives
- `total_votes`: Total voting procedures executed
- `ratified_proposals`: Proposals successfully ratified (have ratified_epoch)
- `total_proposals`: All submitted governance proposals
- Cache: 3600 seconds (1 hour)

**Calculations:**
- Ratification Rate = 42 / 156 = 26.9%
- Avg Votes/DRep = 847392 / 1247 = 679.4

---

## Error Responses

### Invalid Parameters
```json
{
  "error": "Invalid page/limit parameters"
}
```
Status: 400

### Not Found
```json
null
```
Status: 200 (returns null for not found items)

### Server Error
```json
{
  "error": "Database connection failed"
}
```
Status: 500

### Missing Required Param
```json
[]
```
Status: 200 (returns empty array)

---

## Rate Limiting

No explicit rate limiting implemented. Consider adding:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678429200
```

---

## Content Types

All endpoints return:
- **Content-Type:** `application/json` (except `/stream/blocks`)
- **Charset:** UTF-8
- **CORS:** Enabled for `https://adatool.net`, `http://localhost:3000`

---

## Pagination Parameters

All list endpoints support:
- `?page=1` - Page number (default: 1)
- `?limit=20` - Items per page (default: 20, max: 100)

Offset calculation: `offset = (page - 1) * limit`

---

## Response Time Expectations

| Endpoint | Typical | Max |
|----------|---------|-----|
| /tokens | 50ms | 200ms |
| /token/:fp | 20ms | 100ms |
| /tokens/mints | 30ms | 150ms |
| /blocks | 40ms | 180ms |
| /pool/:h/delegators | 60ms | 250ms |
| /analytics/network | 500ms | 2000ms |
| /analytics/governance-stats | 100ms | 500ms |
| /stream/blocks | Immediate | Streaming |

---

**API Version:** Phase 8, 10, 11, 14
**Last Updated:** 2026-03-09
**Database:** Cardano db-sync 13.6
**Framework:** Hono.js with Node.js

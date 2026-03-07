import { Hono } from "hono";
import { cors } from "hono/cors";
import { pool } from "./db/pool.js";
import { cached } from "./cache/redis.js";

const app = new Hono();

app.use("/*", cors({
  origin: ["https://adatool.net", "http://localhost:3000", "http://13.203.249.154:3000"],
  allowMethods: ["GET"],
}));

// ─── Health ────────────────────────────────────────
app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ─── Tip (chain tip) ──────────────────────────────
app.get("/tip", async (c) => {
  const data = await cached("tip", 10, async () => {
    const r = await pool.query(`
      SELECT block_no, epoch_no, slot_no, encode(hash,'hex') as hash, time
      FROM block ORDER BY block_no DESC LIMIT 1
    `);
    return r.rows[0];
  });
  return c.json(data);
});

// ─── Epoch ─────────────────────────────────────────
app.get("/epoch/latest", async (c) => {
  const data = await cached("epoch:latest", 30, async () => {
    const r = await pool.query(`
      SELECT no as epoch_no, start_time, end_time,
             tx_count, blk_count, out_sum::text, fees::text
      FROM epoch ORDER BY no DESC LIMIT 1
    `);
    return r.rows[0];
  });
  return c.json(data);
});

app.get("/epoch/:no", async (c) => {
  const no = parseInt(c.req.param("no"));
  const data = await cached(`epoch:${no}`, 300, async () => {
    const r = await pool.query(`
      SELECT no as epoch_no, start_time, end_time,
             tx_count, blk_count, out_sum::text, fees::text
      FROM epoch WHERE no = $1
    `, [no]);
    return r.rows[0] || null;
  });
  if (!data) return c.json({ error: "Epoch not found" }, 404);
  return c.json(data);
});

// ─── Blocks ────────────────────────────────────────
app.get("/blocks", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached(`blocks:${limit}`, 15, async () => {
    const r = await pool.query(`
      SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no, b.slot_no,
             b.time, b.tx_count, b.size,
             ph.view as pool_name,
             pod.ticker_name as pool_ticker
      FROM block b
      LEFT JOIN slot_leader sl ON b.slot_leader_id = sl.id
      LEFT JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id
        AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
      ORDER BY b.block_no DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/block/:hash", async (c) => {
  const hash = c.req.param("hash");
  const data = await cached(`block:${hash}`, 600, async () => {
    const r = await pool.query(`
      SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no, b.slot_no,
             b.time, b.tx_count, b.size,
             ph.view as pool_name,
             pod.ticker_name as pool_ticker
      FROM block b
      LEFT JOIN slot_leader sl ON b.slot_leader_id = sl.id
      LEFT JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id
        AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
      WHERE b.hash = decode($1, 'hex')
    `, [hash]);
    return r.rows[0] || null;
  });
  if (!data) return c.json({ error: "Block not found" }, 404);
  return c.json(data);
});

// ─── Transactions ──────────────────────────────────
app.get("/txs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached(`txs:${limit}`, 15, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as hash, b.block_no,
             b.time as block_time, tx.fee::text, tx.out_sum::text, tx.size
      FROM tx
      JOIN block b ON tx.block_id = b.id
      ORDER BY tx.id DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/tx/:hash", async (c) => {
  const hash = c.req.param("hash");
  const data = await cached(`tx:${hash}`, 600, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as hash, b.block_no,
             b.time as block_time, tx.fee::text, tx.out_sum::text, tx.size,
             tx.deposit::text, tx.invalid_before, tx.invalid_hereafter,
             tx.script_size
      FROM tx
      JOIN block b ON tx.block_id = b.id
      WHERE tx.hash = decode($1, 'hex')
    `, [hash]);
    if (!r.rows[0]) return null;

    const txRow = r.rows[0];

    // Get inputs
    const inputs = await pool.query(`
      SELECT encode(tx2.hash,'hex') as tx_hash, txi.tx_out_index,
             txo.value::text, txo.address
      FROM tx_in txi
      JOIN tx_out txo ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
      JOIN tx tx2 ON txo.tx_id = tx2.id
      WHERE txi.tx_in_id = (SELECT id FROM tx WHERE hash = decode($1,'hex'))
    `, [hash]);

    // Get outputs
    const outputs = await pool.query(`
      SELECT txo.index, txo.address, txo.value::text
      FROM tx_out txo
      JOIN tx ON txo.tx_id = tx.id
      WHERE tx.hash = decode($1,'hex')
      ORDER BY txo.index
    `, [hash]);

    return { ...txRow, inputs: inputs.rows, outputs: outputs.rows };
  });
  if (!data) return c.json({ error: "TX not found" }, 404);
  return c.json(data);
});

// ─── Address ───────────────────────────────────────
app.get("/address/:addr", async (c) => {
  const addr = c.req.param("addr");
  const data = await cached(`addr:${addr}`, 30, async () => {
    // Get stake address
    const stakeR = await pool.query(`
      SELECT sa.view as stake_address
      FROM tx_out txo
      LEFT JOIN stake_address sa ON txo.stake_address_id = sa.id
      WHERE txo.address = $1
      LIMIT 1
    `, [addr]);

    // Get balance and tx count
    const balR = await pool.query(`
      SELECT COALESCE(SUM(txo.value),0)::text as balance,
             COUNT(DISTINCT txo.tx_id) as tx_count
      FROM tx_out txo
      LEFT JOIN tx_in txi ON txo.tx_id = txi.tx_out_id AND txo.index = txi.tx_out_index
      WHERE txo.address = $1 AND txi.id IS NULL
    `, [addr]);

    // Get UTXOs (latest 50)
    const utxoR = await pool.query(`
      SELECT encode(tx.hash,'hex') as tx_hash, txo.index as tx_index,
             txo.value::text, b.time as block_time
      FROM tx_out txo
      JOIN tx ON txo.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      LEFT JOIN tx_in txi ON txo.tx_id = txi.tx_out_id AND txo.index = txi.tx_out_index
      WHERE txo.address = $1 AND txi.id IS NULL
      ORDER BY b.time DESC
      LIMIT 50
    `, [addr]);

    return {
      address: addr,
      stake_address: stakeR.rows[0]?.stake_address || null,
      balance: balR.rows[0]?.balance || "0",
      tx_count: parseInt(balR.rows[0]?.tx_count || "0"),
      utxos: utxoR.rows,
    };
  });
  return c.json(data);
});

// ─── Stake Pools ───────────────────────────────────
app.get("/pools", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const data = await cached(`pools:${limit}`, 120, async () => {
    const r = await pool.query(`
      WITH latest_update AS (
        SELECT DISTINCT ON (hash_id) hash_id, pledge, fixed_cost, margin,
               registered_tx_id
        FROM pool_update
        ORDER BY hash_id, registered_tx_id DESC
      ),
      pool_stakes AS (
        SELECT pool_hash_id,
               SUM(amount)::text as live_stake,
               COUNT(*) as delegator_count
        FROM epoch_stake
        WHERE epoch_no = (SELECT MAX(no) FROM epoch)
        GROUP BY pool_hash_id
      ),
      pool_blocks AS (
        SELECT sl.pool_hash_id, COUNT(*) as blocks_minted
        FROM block b
        JOIN slot_leader sl ON b.slot_leader_id = sl.id
        WHERE sl.pool_hash_id IS NOT NULL
        GROUP BY sl.pool_hash_id
      )
      SELECT ph.view as pool_hash,
             pod.ticker_name as ticker,
             pod.json->>'name' as name,
             lu.pledge::text,
             lu.fixed_cost::text,
             lu.margin,
             COALESCE(ps.live_stake, '0') as live_stake,
             COALESCE(ps.delegator_count, 0)::int as delegator_count,
             COALESCE(pb.blocks_minted, 0)::int as blocks_minted,
             CASE WHEN ps.live_stake IS NOT NULL
                  THEN ROUND(ps.live_stake::numeric / 68000000000000, 4)::float
                  ELSE 0 END as saturation
      FROM pool_hash ph
      JOIN latest_update lu ON lu.hash_id = ph.id
      LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id
        AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
      LEFT JOIN pool_stakes ps ON ps.pool_hash_id = ph.id
      LEFT JOIN pool_blocks pb ON pb.pool_hash_id = ph.id
      LEFT JOIN pool_retire pr ON pr.hash_id = ph.id
        AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch)
      WHERE pr.id IS NULL
      ORDER BY COALESCE(ps.live_stake::numeric, 0) DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

app.get("/pool/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cached(`pool:${id}`, 120, async () => {
    const r = await pool.query(`
      WITH latest_update AS (
        SELECT DISTINCT ON (hash_id) hash_id, pledge, fixed_cost, margin
        FROM pool_update
        ORDER BY hash_id, registered_tx_id DESC
      )
      SELECT ph.view as pool_hash,
             pod.ticker_name as ticker,
             pod.json->>'name' as name,
             pod.json->>'description' as description,
             pod.json->>'homepage' as homepage,
             lu.pledge::text,
             lu.fixed_cost::text,
             lu.margin
      FROM pool_hash ph
      JOIN latest_update lu ON lu.hash_id = ph.id
      LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id
        AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
      WHERE ph.view = $1
    `, [id]);
    return r.rows[0] || null;
  });
  if (!data) return c.json({ error: "Pool not found" }, 404);
  return c.json(data);
});

// ─── Native Assets ─────────────────────────────────
app.get("/assets", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const data = await cached(`assets:${limit}`, 120, async () => {
    const r = await pool.query(`
      SELECT encode(ma.policy,'hex') as policy_id,
             encode(ma.name,'hex') as asset_name,
             ma.fingerprint,
             COALESCE(mam.quantity, 0)::text as total_supply,
             (SELECT COUNT(*) FROM ma_tx_mint WHERE ident = ma.id)::int as mint_tx_count,
             convert_from(ma.name, 'UTF8') as name_ascii
      FROM multi_asset ma
      LEFT JOIN LATERAL (
        SELECT SUM(quantity) as quantity
        FROM ma_tx_mint WHERE ident = ma.id
      ) mam ON true
      ORDER BY mint_tx_count DESC
      LIMIT $1
    `, [limit]);
    return r.rows.map(row => ({
      ...row,
      name_ascii: row.name_ascii && /^[\x20-\x7E]+$/.test(row.name_ascii) ? row.name_ascii : null
    }));
  });
  return c.json(data);
});

// ─── Governance Actions ────────────────────────────
app.get("/governance/actions", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const data = await cached(`gov:actions:${limit}`, 60, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as tx_hash,
             gap.index as cert_index,
             gap.type,
             b.epoch_no as epoch,
             va.title,
             va.abstract,
             COALESCE((SELECT COUNT(*) FROM voting_procedure vp
                       WHERE vp.gov_action_proposal_id = gap.id AND vp.vote = 'Yes'), 0)::int as yes_votes,
             COALESCE((SELECT COUNT(*) FROM voting_procedure vp
                       WHERE vp.gov_action_proposal_id = gap.id AND vp.vote = 'No'), 0)::int as no_votes,
             COALESCE((SELECT COUNT(*) FROM voting_procedure vp
                       WHERE vp.gov_action_proposal_id = gap.id AND vp.vote = 'Abstain'), 0)::int as abstain_votes
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      LEFT JOIN LATERAL (
        SELECT va.title, va.abstract
        FROM voting_anchor va
        WHERE va.id = gap.voting_anchor_id
      ) va ON true
      ORDER BY gap.id DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Search ────────────────────────────────────────
app.get("/search", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q || q.length < 3) return c.json([]);

  const results = [];

  // If looks like a hex hash (64 chars)
  if (/^[a-fA-F0-9]{64}$/.test(q)) {
    const txR = await pool.query(
      `SELECT 1 FROM tx WHERE hash = decode($1,'hex') LIMIT 1`, [q]
    );
    if (txR.rows.length) results.push({ type: "tx", value: q, label: `TX ${q.slice(0,16)}...` });

    const blkR = await pool.query(
      `SELECT block_no FROM block WHERE hash = decode($1,'hex') LIMIT 1`, [q]
    );
    if (blkR.rows.length) results.push({ type: "block", value: q, label: `Block #${blkR.rows[0].block_no}` });
  }

  // If looks like a block number
  if (/^\d+$/.test(q) && parseInt(q) > 0) {
    const blkR = await pool.query(
      `SELECT encode(hash,'hex') as hash FROM block WHERE block_no = $1 LIMIT 1`, [parseInt(q)]
    );
    if (blkR.rows.length) results.push({ type: "block", value: blkR.rows[0].hash, label: `Block #${q}` });
  }

  // If looks like a Cardano address
  if (q.startsWith("addr") || q.startsWith("stake")) {
    const addrR = await pool.query(
      `SELECT address FROM tx_out WHERE address = $1 LIMIT 1`, [q]
    );
    if (addrR.rows.length) results.push({ type: "address", value: q, label: `Address ${q.slice(0,20)}...` });
  }

  // Pool search by ticker or name
  if (q.length >= 2 && q.length <= 10) {
    const poolR = await pool.query(`
      SELECT ph.view as pool_hash, pod.ticker_name as ticker, pod.json->>'name' as name
      FROM pool_hash ph
      JOIN pool_offline_data pod ON pod.pool_id = ph.id
        AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
      WHERE UPPER(pod.ticker_name) = UPPER($1)
         OR UPPER(pod.json->>'name') LIKE UPPER($2)
      LIMIT 5
    `, [q, `%${q}%`]);
    poolR.rows.forEach(p => {
      results.push({ type: "pool", value: p.pool_hash, label: `[${p.ticker || ""}] ${p.name || p.pool_hash}` });
    });
  }

  // Asset search by fingerprint or name
  if (q.startsWith("asset")) {
    const assetR = await pool.query(
      `SELECT fingerprint FROM multi_asset WHERE fingerprint = $1 LIMIT 1`, [q]
    );
    if (assetR.rows.length) results.push({ type: "asset", value: q, label: `Asset ${q}` });
  }

  return c.json(results);
});

// ─── Start ─────────────────────────────────────────
const port = parseInt(process.env.PORT || "3001");
console.log(`ADAtool API listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

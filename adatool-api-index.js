import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import pkg from "./db/pool.js";
const pool = pkg;
import cachePkg from "./cache/redis.js";
const { cached } = cachePkg;

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
      FROM block ORDER BY id DESC LIMIT 1
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
             ocpd.ticker_name as pool_ticker
      FROM block b
      LEFT JOIN slot_leader sl ON b.slot_leader_id = sl.id
      LEFT JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
      WHERE b.block_no IS NOT NULL
      ORDER BY b.id DESC
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
             ocpd.ticker_name as pool_ticker
      FROM block b
      LEFT JOIN slot_leader sl ON b.slot_leader_id = sl.id
      LEFT JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
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
      SELECT encode(tx_src.hash,'hex') as tx_hash, txi.tx_out_index,
             txo.value::text, txo.address
      FROM tx_in txi
      JOIN tx_out txo ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
      JOIN tx tx_src ON txo.tx_id = tx_src.id
      JOIN tx tx_cur ON txi.tx_in_id = tx_cur.id
      WHERE tx_cur.hash = decode($1,'hex')
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

    // Get balance (unspent UTXOs only, using consumed_by_tx_id)
    const balR = await pool.query(`
      SELECT COALESCE(SUM(txo.value),0)::text as balance,
             COUNT(*)::int as utxo_count
      FROM tx_out txo
      WHERE txo.address = $1 AND txo.consumed_by_tx_id IS NULL
    `, [addr]);

    // TX count
    const txCountR = await pool.query(`
      SELECT COUNT(DISTINCT txo.tx_id)::int as tx_count
      FROM tx_out txo
      WHERE txo.address = $1
    `, [addr]);

    // Get UTXOs (latest 50)
    const utxoR = await pool.query(`
      SELECT encode(tx.hash,'hex') as tx_hash, txo.index as tx_index,
             txo.value::text, b.time as block_time
      FROM tx_out txo
      JOIN tx ON txo.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      WHERE txo.address = $1 AND txo.consumed_by_tx_id IS NULL
      ORDER BY b.time DESC
      LIMIT 50
    `, [addr]);

    return {
      address: addr,
      stake_address: stakeR.rows[0]?.stake_address || null,
      balance: balR.rows[0]?.balance || "0",
      tx_count: txCountR.rows[0]?.tx_count || 0,
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
        SELECT DISTINCT ON (hash_id) hash_id, pledge, fixed_cost, margin
        FROM pool_update
        ORDER BY hash_id, registered_tx_id DESC
      ),
      latest_stat AS (
        SELECT DISTINCT ON (pool_hash_id) pool_hash_id,
               number_of_blocks, number_of_delegators, stake, voting_power
        FROM pool_stat
        ORDER BY pool_hash_id, epoch_no DESC
      )
      SELECT ph.view as pool_hash,
             ocpd.ticker_name as ticker,
             ocpd.json->>'name' as name,
             lu.pledge::text,
             lu.fixed_cost::text,
             lu.margin,
             COALESCE(ls.stake, 0)::text as live_stake,
             COALESCE(ls.number_of_delegators, 0)::int as delegator_count,
             COALESCE(ls.number_of_blocks, 0)::int as blocks_minted,
             CASE WHEN ls.stake IS NOT NULL AND ls.stake > 0
                  THEN ROUND(ls.stake / 68000000000000, 4)::float
                  ELSE 0 END as saturation
      FROM pool_hash ph
      JOIN latest_update lu ON lu.hash_id = ph.id
      LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
      LEFT JOIN latest_stat ls ON ls.pool_hash_id = ph.id
      LEFT JOIN pool_retire pr ON pr.hash_id = ph.id
        AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch)
      WHERE pr.id IS NULL
      ORDER BY COALESCE(ls.stake, 0) DESC
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
      ),
      latest_stat AS (
        SELECT DISTINCT ON (pool_hash_id) pool_hash_id,
               number_of_blocks, number_of_delegators, stake, voting_power
        FROM pool_stat
        ORDER BY pool_hash_id, epoch_no DESC
      )
      SELECT ph.view as pool_hash,
             ocpd.ticker_name as ticker,
             ocpd.json->>'name' as name,
             ocpd.json->>'description' as description,
             ocpd.json->>'homepage' as homepage,
             lu.pledge::text,
             lu.fixed_cost::text,
             lu.margin,
             COALESCE(ls.stake, 0)::text as live_stake,
             COALESCE(ls.number_of_delegators, 0)::int as delegator_count,
             COALESCE(ls.number_of_blocks, 0)::int as blocks_minted,
             COALESCE(ls.voting_power, 0)::text as voting_power
      FROM pool_hash ph
      JOIN latest_update lu ON lu.hash_id = ph.id
      LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
      LEFT JOIN latest_stat ls ON ls.pool_hash_id = ph.id
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
             COUNT(mtm.id)::int as mint_tx_count,
             COALESCE(SUM(mtm.quantity),0)::text as total_supply
      FROM ma_tx_mint mtm
      JOIN multi_asset ma ON ma.id = mtm.ident
      GROUP BY ma.id, ma.policy, ma.name, ma.fingerprint
      ORDER BY COUNT(mtm.id) DESC
      LIMIT $1
    `, [limit]);
    return r.rows.map(row => {
      let name_ascii = null;
      try {
        const buf = Buffer.from(row.asset_name, 'hex');
        const str = buf.toString('utf8');
        if (/^[\x20-\x7E]+$/.test(str)) name_ascii = str;
      } catch {}
      return { ...row, name_ascii };
    });
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
             gap.type::text,
             b.epoch_no as epoch,
             ocvgad.title,
             ocvgad.abstract,
             COALESCE((SELECT COUNT(*) FROM voting_procedure vp
                       WHERE vp.gov_action_proposal_id = gap.id AND vp.vote = 'Yes'), 0)::int as yes_votes,
             COALESCE((SELECT COUNT(*) FROM voting_procedure vp
                       WHERE vp.gov_action_proposal_id = gap.id AND vp.vote = 'No'), 0)::int as no_votes,
             COALESCE((SELECT COUNT(*) FROM voting_procedure vp
                       WHERE vp.gov_action_proposal_id = gap.id AND vp.vote = 'Abstain'), 0)::int as abstain_votes
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      ORDER BY gap.id DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── DReps ─────────────────────────────────────────
app.get("/dreps", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const data = await cached(`dreps:${limit}`, 120, async () => {
    const r = await pool.query(`
      SELECT encode(dh.raw,'hex') as drep_hash,
             dh.has_script,
             dr.deposit::text,
             COALESCE(dd.amount, 0)::text as voting_power,
             COALESCE(vc.vote_count, 0)::int as vote_count,
             va.url as anchor_url
      FROM drep_hash dh
      JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      LEFT JOIN drep_distr dd ON dd.hash_id = dh.id
        AND dd.epoch_no = (SELECT MAX(epoch_no) FROM drep_distr WHERE hash_id = dh.id)
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as vote_count FROM voting_procedure vp WHERE vp.drep_voter = dh.id
      ) vc ON true
      LEFT JOIN voting_anchor va ON dr.voting_anchor_id = va.id
      WHERE dr.deposit > 0
      ORDER BY COALESCE(dd.amount, 0) DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Epochs list ───────────────────────────────────
app.get("/epochs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "30"), 100);
  const data = await cached(`epochs:${limit}`, 60, async () => {
    const r = await pool.query(`
      SELECT no as epoch_no, start_time, end_time,
             tx_count, blk_count, out_sum::text, fees::text
      FROM epoch
      ORDER BY no DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Block by number ───────────────────────────────
app.get("/block/by-number/:no", async (c) => {
  const no = parseInt(c.req.param("no"));
  const data = await cached(`block:num:${no}`, 600, async () => {
    const r = await pool.query(`
      SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no, b.slot_no,
             b.time, b.tx_count, b.size,
             ph.view as pool_name,
             ocpd.ticker_name as pool_ticker
      FROM block b
      LEFT JOIN slot_leader sl ON b.slot_leader_id = sl.id
      LEFT JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
      WHERE b.block_no = $1
    `, [no]);
    return r.rows[0] || null;
  });
  if (!data) return c.json({ error: "Block not found" }, 404);
  return c.json(data);
});

// ─── Block transactions ────────────────────────────
app.get("/block/:hash/txs", async (c) => {
  const hash = c.req.param("hash");
  const data = await cached(`block:txs:${hash}`, 600, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as hash, tx.fee::text, tx.out_sum::text, tx.size
      FROM tx
      JOIN block b ON tx.block_id = b.id
      WHERE b.hash = decode($1, 'hex')
      ORDER BY tx.block_index
    `, [hash]);
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
      SELECT ph.view as pool_hash, ocpd.ticker_name as ticker, ocpd.json->>'name' as name
      FROM pool_hash ph
      JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
      WHERE UPPER(ocpd.ticker_name) = UPPER($1)
         OR UPPER(ocpd.json->>'name') LIKE UPPER($2)
      LIMIT 5
    `, [q, `%${q}%`]);
    poolR.rows.forEach(p => {
      results.push({ type: "pool", value: p.pool_hash, label: `[${p.ticker || ""}] ${p.name || p.pool_hash}` });
    });
  }

  // Asset search by fingerprint
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
serve({ fetch: app.fetch, port }, () => {
  console.log(`ADAtool API listening on port ${port}`);
});

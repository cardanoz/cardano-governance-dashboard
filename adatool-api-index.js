import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import pkg from "./db/pool.js";
const pool = pkg;
import cachePkg from "./cache/redis.js";
const { cached } = cachePkg;

const app = new Hono();

// ─── Shared helpers ──────────────────────────────
/** Normalize DBSync vote string to display form */
const normalizeVote = (v) => (v === 'voteyes' || v === 'yes') ? 'Yes' : (v === 'voteno' || v === 'no') ? 'No' : (v === 'abstain') ? 'Abstain' : v;

/** Parse limit query param with default & max */
const getLimit = (c, def = 20, max = 100) => Math.min(parseInt(c.req.query("limit") || String(def)), max);

/** Return 404 JSON response */
const notFound = (c, what) => c.json({ error: `${what} not found` }, 404);

/** Convert hex asset name to ASCII if printable */
const hexToAscii = (hex) => {
  try { const s = Buffer.from(hex, 'hex').toString('utf8'); return /^[\x20-\x7E]+$/.test(s) ? s : null; } catch { return null; }
};

/** SQL: latest off_chain_pool_data JOIN */
const POOL_META_JOIN = `LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
        AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)`;

app.use("/*", cors({
  origin: ["https://adatool.net", "http://localhost:3000", "http://13.203.249.154:3000", "http://13.203.249.154"],
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
  if (!data) return notFound(c, "Epoch");
  return c.json(data);
});

// ─── Blocks ────────────────────────────────────────
app.get("/blocks", async (c) => {
  const limit = getLimit(c);
  const data = await cached(`blocks:${limit}`, 15, async () => {
    const r = await pool.query(`
      SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no, b.slot_no,
             b.time, b.tx_count, b.size,
             ph.view as pool_name,
             ocpd.ticker_name as pool_ticker
      FROM block b
      LEFT JOIN slot_leader sl ON b.slot_leader_id = sl.id
      LEFT JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      ${POOL_META_JOIN}
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
      ${POOL_META_JOIN}
      WHERE b.hash = decode($1, 'hex')
    `, [hash]);
    return r.rows[0] || null;
  });
  if (!data) return notFound(c, "Block");
  return c.json(data);
});

// ─── Transactions ──────────────────────────────────
app.get("/txs", async (c) => {
  const limit = getLimit(c);
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
  if (!data) return notFound(c, "TX");
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
  const limit = getLimit(c, 50, 200);
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
      ${POOL_META_JOIN}
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
      ${POOL_META_JOIN}
      LEFT JOIN latest_stat ls ON ls.pool_hash_id = ph.id
      WHERE ph.view = $1
    `, [id]);
    return r.rows[0] || null;
  });
  if (!data) return notFound(c, "Pool");
  return c.json(data);
});

// ─── Native Assets ─────────────────────────────────
app.get("/assets", async (c) => {
  const limit = getLimit(c, 50, 200);
  const data = await cached(`assets:${limit}`, 300, async () => {
    // Use multi_asset table directly (much faster than GROUP BY on ma_tx_mint)
    const r = await pool.query(`
      SELECT encode(ma.policy,'hex') as policy_id,
             encode(ma.name,'hex') as asset_name,
             ma.fingerprint,
             0 as mint_tx_count,
             '0' as total_supply
      FROM multi_asset ma
      ORDER BY ma.id DESC
      LIMIT $1
    `, [limit]);
    return r.rows.map(row => ({ ...row, name_ascii: hexToAscii(row.asset_name) }));
  });
  return c.json(data);
});

// ─── Governance Actions ────────────────────────────
app.get("/governance/actions", async (c) => {
  const limit = getLimit(c);
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
  const limit = getLimit(c, 50, 200);
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
      WHERE (dr.deposit >= 0 OR dr.deposit IS NULL)
      ORDER BY COALESCE(dd.amount, 0) DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Epochs list ───────────────────────────────────
app.get("/epochs", async (c) => {
  const limit = getLimit(c, 30);
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
      ${POOL_META_JOIN}
      WHERE b.block_no = $1
    `, [no]);
    return r.rows[0] || null;
  });
  if (!data) return notFound(c, "Block");
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

// ─── Network Stats ─────────────────────────────────
app.get("/stats", async (c) => {
  const data = await cached("stats", 60, async () => {
    const [tipR, epochR, poolR, govR, txCountR] = await Promise.all([
      pool.query(`SELECT block_no, epoch_no, slot_no FROM block ORDER BY id DESC LIMIT 1`),
      pool.query(`SELECT no, tx_count, blk_count, fees::text, out_sum::text FROM epoch ORDER BY no DESC LIMIT 1`),
      pool.query(`SELECT COUNT(DISTINCT ph.id)::int as active_pools FROM pool_hash ph JOIN pool_update pu ON pu.hash_id = ph.id LEFT JOIN pool_retire pr ON pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch) WHERE pr.id IS NULL`),
      pool.query(`SELECT COUNT(*)::int as total_proposals FROM gov_action_proposal`),
      pool.query(`SELECT reltuples::bigint as est_count FROM pg_class WHERE relname = 'tx'`),
    ]);

    let adaR = { rows: [{ treasury: null, reserves: null, utxo: null }] };
    try {
      adaR = await pool.query(`SELECT treasury::text, reserves::text, utxo::text FROM ada_pots ORDER BY epoch_no DESC LIMIT 1`);
    } catch (e) {
      console.error("ada_pots query failed:", e.message);
    }

    return {
      block_no: tipR.rows[0]?.block_no,
      epoch_no: tipR.rows[0]?.epoch_no,
      epoch_tx_count: epochR.rows[0]?.tx_count,
      epoch_blk_count: epochR.rows[0]?.blk_count,
      epoch_fees: epochR.rows[0]?.fees,
      circulation: epochR.rows[0]?.out_sum || "0",
      treasury: adaR.rows[0]?.treasury || "0",
      reserves: adaR.rows[0]?.reserves || "0",
      active_pools: poolR.rows[0]?.active_pools || 0,
      total_proposals: govR.rows[0]?.total_proposals || 0,
      total_tx_count: txCountR.rows[0]?.est_count || 0,
    };
  });
  return c.json(data);
});

// ─── Asset detail ──────────────────────────────────
app.get("/asset/:fingerprint", async (c) => {
  const fp = c.req.param("fingerprint");
  const data = await cached(`asset:${fp}`, 120, async () => {
    const r = await pool.query(`
      SELECT encode(ma.policy,'hex') as policy_id,
             encode(ma.name,'hex') as asset_name,
             ma.fingerprint
      FROM multi_asset ma WHERE ma.fingerprint = $1
    `, [fp]);
    if (!r.rows[0]) return null;
    const asset = r.rows[0];

    const mintR = await pool.query(`
      SELECT mtm.quantity::text, encode(tx.hash,'hex') as tx_hash, b.time
      FROM ma_tx_mint mtm
      JOIN tx ON mtm.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      WHERE mtm.ident = (SELECT id FROM multi_asset WHERE fingerprint = $1)
      ORDER BY mtm.id DESC LIMIT 20
    `, [fp]);

    const supplyR = await pool.query(`
      SELECT COALESCE(SUM(quantity),0)::text as total_supply,
             COUNT(*)::int as mint_count
      FROM ma_tx_mint WHERE ident = (SELECT id FROM multi_asset WHERE fingerprint = $1)
    `, [fp]);

    const holdersR = await pool.query(`
      SELECT COUNT(DISTINCT txo.address)::int as holder_count
      FROM ma_tx_out mto
      JOIN tx_out txo ON mto.tx_out_id = txo.id
      WHERE mto.ident = (SELECT id FROM multi_asset WHERE fingerprint = $1)
        AND txo.consumed_by_tx_id IS NULL
    `, [fp]);

    return {
      ...asset,
      name_ascii: hexToAscii(asset.asset_name),
      total_supply: supplyR.rows[0]?.total_supply || "0",
      mint_count: supplyR.rows[0]?.mint_count || 0,
      holder_count: holdersR.rows[0]?.holder_count || 0,
      mint_history: mintR.rows,
    };
  });
  if (!data) return notFound(c, "Asset");
  return c.json(data);
});

// ─── Address tokens ────────────────────────────────
app.get("/address/:addr/tokens", async (c) => {
  const addr = c.req.param("addr");
  const data = await cached(`addr:tokens:${addr}`, 30, async () => {
    const r = await pool.query(`
      SELECT encode(ma.policy,'hex') as policy_id,
             encode(ma.name,'hex') as asset_name,
             ma.fingerprint,
             SUM(mto.quantity)::text as quantity
      FROM ma_tx_out mto
      JOIN tx_out txo ON mto.tx_out_id = txo.id
      JOIN multi_asset ma ON mto.ident = ma.id
      WHERE txo.address = $1 AND txo.consumed_by_tx_id IS NULL
      GROUP BY ma.id, ma.policy, ma.name, ma.fingerprint
      ORDER BY SUM(mto.quantity) DESC
      LIMIT 100
    `, [addr]);
    return r.rows.map(row => ({ ...row, name_ascii: hexToAscii(row.asset_name) }));
  });
  return c.json(data);
});

// ─── DRep detail ───────────────────────────────────
app.get("/drep/:hash", async (c) => {
  const hash = c.req.param("hash");
  const data = await cached(`drep:${hash}`, 120, async () => {
    const r = await pool.query(`
      SELECT encode(dh.raw,'hex') as drep_hash,
             dh.has_script,
             dr.deposit::text,
             COALESCE(dd.amount, 0)::text as voting_power,
             va.url as anchor_url
      FROM drep_hash dh
      JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      LEFT JOIN drep_distr dd ON dd.hash_id = dh.id
        AND dd.epoch_no = (SELECT MAX(epoch_no) FROM drep_distr WHERE hash_id = dh.id)
      LEFT JOIN voting_anchor va ON dr.voting_anchor_id = va.id
      WHERE encode(dh.raw,'hex') = $1
    `, [hash]);
    if (!r.rows[0]) return null;

    // Get voting history
    const votes = await pool.query(`
      SELECT vp.vote::text,
             gap.type::text as action_type,
             encode(gtx.hash,'hex') as action_tx_hash,
             gap.index as action_index,
             ocvgad.title as action_title,
             b.time as vote_time
      FROM voting_procedure vp
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      JOIN tx vtx ON vp.tx_id = vtx.id
      JOIN block b ON vtx.block_id = b.id
      JOIN drep_hash dh ON vp.drep_voter = dh.id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      WHERE encode(dh.raw,'hex') = $1
      ORDER BY vp.id DESC
      LIMIT 50
    `, [hash]);

    // Get delegation count
    const delR = await pool.query(`
      SELECT COUNT(DISTINCT dv.addr_id)::int as delegator_count
      FROM delegation_vote dv
      JOIN drep_hash dh ON dv.drep_hash_id = dh.id
      WHERE encode(dh.raw,'hex') = $1
        AND dv.id = (SELECT MAX(id) FROM delegation_vote dv2 WHERE dv2.addr_id = dv.addr_id)
    `, [hash]);

    return {
      ...r.rows[0],
      delegator_count: delR.rows[0]?.delegator_count || 0,
      votes: votes.rows,
    };
  });
  if (!data) return notFound(c, "DRep");
  return c.json(data);
});

// ─── Governance action detail ──────────────────────
app.get("/governance/action/:hash/:index", async (c) => {
  const hash = c.req.param("hash");
  const index = parseInt(c.req.param("index"));
  const data = await cached(`gov:action:${hash}:${index}`, 60, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as tx_hash,
             gap.index as cert_index,
             gap.type::text,
             b.epoch_no as epoch,
             gap.description,
             gap.expiration,
             gap.ratified_epoch,
             gap.enacted_epoch,
             gap.dropped_epoch,
             gap.expired_epoch,
             ocvgad.title, ocvgad.abstract, ocvgad.motivation, ocvgad.rationale
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      WHERE tx.hash = decode($1,'hex') AND gap.index = $2
    `, [hash, index]);
    if (!r.rows[0]) return null;

    // Get votes breakdown
    const votes = await pool.query(`
      SELECT vp.voter_role::text,
             vp.vote::text,
             CASE
               WHEN vp.drep_voter IS NOT NULL THEN encode(dh.raw,'hex')
               WHEN vp.pool_voter IS NOT NULL THEN ph.view
               ELSE 'committee'
             END as voter_id,
             CASE
               WHEN vp.drep_voter IS NOT NULL THEN 'drep'
               WHEN vp.pool_voter IS NOT NULL THEN 'pool'
               ELSE 'committee'
             END as voter_type
      FROM voting_procedure vp
      LEFT JOIN drep_hash dh ON vp.drep_voter = dh.id
      LEFT JOIN pool_hash ph ON vp.pool_voter = ph.id
      WHERE vp.gov_action_proposal_id = (
        SELECT gap2.id FROM gov_action_proposal gap2
        JOIN tx tx2 ON gap2.tx_id = tx2.id
        WHERE tx2.hash = decode($1,'hex') AND gap2.index = $2
      )
      ORDER BY vp.id
    `, [hash, index]);

    return { ...r.rows[0], votes: votes.rows };
  });
  if (!data) return notFound(c, "Action");
  return c.json(data);
});

// ─── Whale Tracker (large TXs) ────────────────────
app.get("/whales", async (c) => {
  const limit = getLimit(c, 50, 200);
  const threshold = c.req.query("min") || "1000000000000"; // default 1M ADA in lovelace
  const data = await cached(`whales:${limit}:${threshold}`, 30, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as hash, b.block_no, b.time as block_time,
             tx.out_sum::text, tx.fee::text,
             (SELECT COUNT(*) FROM tx_in WHERE tx_in_id = tx.id)::int as input_count,
             (SELECT COUNT(*) FROM tx_out WHERE tx_id = tx.id)::int as output_count
      FROM tx
      JOIN block b ON tx.block_id = b.id
      WHERE tx.out_sum >= $1::numeric
      ORDER BY tx.id DESC
      LIMIT $2
    `, [threshold, limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Rich List (by stake address, using epoch_stake) ──
app.get("/richlist", async (c) => {
  const limit = getLimit(c, 100, 200);
  const data = await cached(`richlist:${limit}`, 3600, async () => {
    // Use previous completed epoch (more likely to be indexed/faster)
    const epochR = await pool.query(`SELECT MAX(no) - 1 as epoch FROM epoch`);
    const epoch = epochR.rows[0]?.epoch || 0;
    const r = await pool.query(`
      SELECT sa.view as stake_address,
             sa.view as address,
             es.amount::text as balance,
             0 as utxo_count
      FROM epoch_stake es
      JOIN stake_address sa ON es.addr_id = sa.id
      WHERE es.epoch_no = $1
      ORDER BY es.amount DESC
      LIMIT $2
    `, [epoch, limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── TX Volume (daily aggregates) ─────────────────
app.get("/tx-volume", async (c) => {
  const days = Math.min(parseInt(c.req.query("days") || "30"), 90);
  const data = await cached(`txvol:${days}`, 300, async () => {
    const blocksR = await pool.query(`
      SELECT b.time::date as date,
             COUNT(DISTINCT b.id)::int as block_count,
             SUM(b.tx_count)::int as tx_count,
             COALESCE(SUM(tx.fee), 0)::text as total_fees
      FROM block b
      LEFT JOIN tx ON tx.block_id = b.id
      WHERE b.time >= NOW() - make_interval(days => $1)
        AND b.block_no IS NOT NULL
      GROUP BY b.time::date
      ORDER BY date ASC
    `, [days]);
    return blocksR.rows.map(r => ({
      ...r,
      total_output: "0",
    }));
  });
  return c.json(data);
});

// ─── Pool Blocks ──────────────────────────────────
app.get("/pool/:id/blocks", async (c) => {
  const id = c.req.param("id");
  const limit = getLimit(c, 50, 200);
  const data = await cached(`pool:blocks:${id}:${limit}`, 60, async () => {
    const r = await pool.query(`
      SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no, b.slot_no,
             b.time, b.tx_count, b.size
      FROM block b
      JOIN slot_leader sl ON b.slot_leader_id = sl.id
      JOIN pool_hash ph ON sl.pool_hash_id = ph.id
      WHERE ph.view = $1 AND b.block_no IS NOT NULL
      ORDER BY b.id DESC
      LIMIT $2
    `, [id, limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Asset Holders ────────────────────────────────
app.get("/asset/:fingerprint/holders", async (c) => {
  const fp = c.req.param("fingerprint");
  const limit = getLimit(c, 100, 200);
  const data = await cached(`asset:holders:${fp}:${limit}`, 300, async () => {
    const r = await pool.query(`
      SELECT txo.address, SUM(mto.quantity)::text as quantity
      FROM ma_tx_out mto
      JOIN tx_out txo ON mto.tx_out_id = txo.id
      WHERE mto.ident = (SELECT id FROM multi_asset WHERE fingerprint = $1)
        AND txo.consumed_by_tx_id IS NULL
      GROUP BY txo.address
      ORDER BY SUM(mto.quantity) DESC
      LIMIT $2
    `, [fp, limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Protocol Parameters ──────────────────────────
app.get("/protocol-params", async (c) => {
  const data = await cached("protocol-params", 600, async () => {
    const r = await pool.query(`SELECT * FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`);
    if (!r.rows[0]) return null;
    const p = r.rows[0];
    // Return all fields, converting bigints to strings
    const result = {};
    for (const [k, v] of Object.entries(p)) {
      if (v === null || v === undefined) result[k] = null;
      else if (typeof v === 'bigint' || (typeof v === 'number' && Math.abs(v) > 1e15)) result[k] = v.toString();
      else result[k] = v;
    }
    return result;
  });
  if (!data) return c.json({ error: "No params found" }, 404);
  return c.json(data);
});

// ─── Stake Distribution ───────────────────────────
app.get("/stake-distribution", async (c) => {
  const data = await cached("stake-dist", 3600, async () => {
    // Use previous completed epoch for speed
    const epochR = await pool.query(`SELECT MAX(no) - 1 as epoch FROM epoch`);
    const epoch = epochR.rows[0]?.epoch || 0;

    // Run stats and buckets in parallel (skip median - too slow on 1.3M rows)
    const [statsR, bucketsR] = await Promise.all([
      pool.query(`
        SELECT SUM(amount)::text as total_staked,
               COUNT(*)::int as total_stakers,
               AVG(amount)::bigint::text as avg_stake
        FROM epoch_stake
        WHERE epoch_no = $1
      `, [epoch]),
      pool.query(`
        SELECT
          CASE
            WHEN amount < 100000000 THEN '< 100 ADA'
            WHEN amount < 1000000000 THEN '100 - 1K ADA'
            WHEN amount < 10000000000 THEN '1K - 10K ADA'
            WHEN amount < 100000000000 THEN '10K - 100K ADA'
            WHEN amount < 1000000000000 THEN '100K - 1M ADA'
            ELSE '> 1M ADA'
          END as range,
          COUNT(*)::int as count,
          SUM(amount)::text as total_stake
        FROM epoch_stake
        WHERE epoch_no = $1
        GROUP BY 1
        ORDER BY MIN(amount)
      `, [epoch]),
    ]);

    const stats = statsR.rows[0] || {};
    return {
      total_staked: stats.total_staked || "0",
      total_stakers: stats.total_stakers || 0,
      avg_stake: stats.avg_stake || "0",
      median_stake: "0",
      buckets: bucketsR.rows,
    };
  });
  return c.json(data);
});

// ─── Constitutional Committee ─────────────────────
app.get("/committee", async (c) => {
  const data = await cached("committee", 300, async () => {
    // First discover the actual column names
    let members = [];
    try {
      const colsR = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'committee_member' ORDER BY ordinal_position
      `);
      const cols = colsR.rows.map(r => r.column_name);

      // committee_member might use committee_hash_id or committee_id
      const hashCol = cols.includes('committee_hash_id') ? 'committee_hash_id' : 'committee_id';

      const r = await pool.query(`
        SELECT encode(ch.raw, 'hex') as cc_hash,
               ch.has_script,
               cm.expiration_epoch,
               CASE
                 WHEN cm.expiration_epoch <= (SELECT MAX(no) FROM epoch) THEN 'Expired'
                 ELSE 'Active'
               END as status
        FROM committee_member cm
        JOIN committee_hash ch ON cm.${hashCol} = ch.id
        ORDER BY cm.expiration_epoch DESC
      `);

      // Get vote counts per member
      for (const m of r.rows) {
        let vote_count = 0, yes_votes = 0, no_votes = 0, abstain_votes = 0;
        try {
          const vc = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE vote = 'Yes') as yes,
                   COUNT(*) FILTER (WHERE vote = 'No') as no,
                   COUNT(*) FILTER (WHERE vote = 'Abstain') as abstain
            FROM voting_procedure vp
            JOIN committee_hash ch ON vp.committee_voter = ch.id
            WHERE encode(ch.raw,'hex') = $1
          `, [m.cc_hash]);
          if (vc.rows[0]) {
            vote_count = parseInt(vc.rows[0].total);
            yes_votes = parseInt(vc.rows[0].yes);
            no_votes = parseInt(vc.rows[0].no);
            abstain_votes = parseInt(vc.rows[0].abstain);
          }
        } catch {}
        members.push({ ...m, hot_key: null, vote_count, yes_votes, no_votes, abstain_votes });
      }
    } catch (e) {
      console.error("Committee query error:", e.message);
      return { threshold: 0.67, members: [], total_members: 0, active_members: 0 };
    }

    // Get threshold
    let threshold = 0.67;
    try {
      const tR = await pool.query(`
        SELECT dvt_committee_normal FROM epoch_param ORDER BY epoch_no DESC LIMIT 1
      `);
      if (tR.rows[0]?.dvt_committee_normal) {
        threshold = tR.rows[0].dvt_committee_normal;
      }
    } catch {}

    return {
      threshold,
      members,
      total_members: members.length,
      active_members: members.filter(m => m.status === "Active").length,
    };
  });
  return c.json(data);
});

// ─── Phase 5: Votes ───
app.get("/votes", async (c) => {
  try {
    const data = await cached("votes", 60, async () => {
      const result = await pool.query(`
        SELECT
          CASE
            WHEN vp.drep_voter IS NOT NULL THEN encode(dh.raw,'hex')
            WHEN vp.pool_voter IS NOT NULL THEN ph.view
            WHEN vp.committee_voter IS NOT NULL THEN encode(ch.raw,'hex')
            ELSE 'unknown'
          END as voter_id,
          vp.voter_role::text,
          vp.vote::text,
          gap.type::text AS action_type,
          encode(atx.hash,'hex') as action_tx_hash,
          gap.index as action_index,
          ocvgad.title as action_title,
          b.block_no,
          b.time as vote_time
        FROM voting_procedure vp
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx atx ON gap.tx_id = atx.id
        JOIN tx vtx ON vp.tx_id = vtx.id
        JOIN block b ON vtx.block_id = b.id
        LEFT JOIN drep_hash dh ON vp.drep_voter = dh.id
        LEFT JOIN pool_hash ph ON vp.pool_voter = ph.id
        LEFT JOIN committee_hash ch ON vp.committee_voter = ch.id
        LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
        LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 5: DRep Delegations ───
app.get("/drep-delegations", async (c) => {
  try {
    const data = await cached("drep_delegations", 120, async () => {
      const result = await pool.query(`
        SELECT
          sa.view AS delegator_address,
          encode(dh.raw,'hex') as drep_hash,
          encode(t.hash,'hex') as tx_hash,
          b.time,
          b.block_no
        FROM delegation_vote dv
        JOIN stake_address sa ON dv.addr_id = sa.id
        JOIN drep_hash dh ON dv.drep_hash_id = dh.id
        JOIN tx t ON dv.tx_id = t.id
        JOIN block b ON t.block_id = b.id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 5: Constitution ───
app.get("/constitution", async (c) => {
  try {
    const data = await cached("constitution", 3600, async () => {
      try {
        const result = await pool.query(`
          SELECT encode(c.script_hash,'hex') as script_hash,
                 va.url as anchor_url,
                 encode(va.data_hash,'hex') as anchor_hash
          FROM constitution c
          LEFT JOIN voting_anchor va ON c.voting_anchor_id = va.id
          ORDER BY c.id DESC LIMIT 1
        `);
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch {
        // Try off_chain_vote_data if constitution table doesn't exist
        const fallback = await pool.query(`
          SELECT
            url AS anchor_url,
            encode(data_hash,'hex') AS anchor_hash
          FROM voting_anchor
          LIMIT 1
        `);
        return fallback.rows.length > 0 ? fallback.rows[0] : null;
      }
    });
    return c.json(data || {});
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 5: Treasury Withdrawals ───
app.get("/treasury-withdrawals", async (c) => {
  try {
    const data = await cached("treasury_withdrawals", 300, async () => {
      try {
        const result = await pool.query(`
          SELECT
            tw.amount::text,
            gap.tx_id,
            encode(t.hash,'hex') as action_tx_hash,
            b.block_no,
            b.epoch_no,
            b.time
          FROM treasury_withdrawal tw
          JOIN gov_action_proposal gap ON tw.gov_action_proposal_id = gap.id
          JOIN tx t ON gap.tx_id = t.id
          JOIN block b ON t.block_id = b.id
          ORDER BY b.time DESC
          LIMIT 50
        `);
        return result.rows;
      } catch {
        return [];
      }
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 5: Transaction Metadata ───
app.get("/tx-metadata", async (c) => {
  try {
    const keyFilter = c.req.query("key");
    const cacheKey = `tx_metadata${keyFilter ? "_" + keyFilter : ""}`;

    const data = await cached(cacheKey, 30, async () => {
      let query = `
        SELECT
          encode(t.hash,'hex') AS tx_hash,
          tm.key::text,
          tm.json AS json_value,
          b.time,
          b.block_no
        FROM tx_metadata tm
        JOIN tx t ON tm.tx_id = t.id
        JOIN block b ON t.block_id = b.id
      `;

      if (keyFilter) {
        query += ` WHERE tm.key::text = $1`;
      }

      query += ` ORDER BY b.time DESC LIMIT 50`;

      const result = keyFilter
        ? await pool.query(query, [keyFilter])
        : await pool.query(query);

      return result.rows;
    });

    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 5: Contract Transactions ───
app.get("/contract-txs", async (c) => {
  try {
    const data = await cached("contract_txs", 30, async () => {
      const result = await pool.query(`
        SELECT
          encode(t.hash,'hex') AS tx_hash,
          b.time AS block_time,
          t.fee::text,
          t.script_size,
          (SELECT COUNT(*) FROM redeemer WHERE redeemer.tx_id = t.id)::int AS redeemer_count,
          STRING_AGG(DISTINCT r.purpose::text, ', ') AS redeemer_purposes
        FROM tx t
        JOIN block b ON t.block_id = b.id
        LEFT JOIN redeemer r ON t.id = r.tx_id
        WHERE t.script_size > 0 OR EXISTS (SELECT 1 FROM redeemer WHERE redeemer.tx_id = t.id)
        GROUP BY t.id, t.hash, b.time, t.fee, t.script_size
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 5: Rewards Withdrawals ───
app.get("/rewards-withdrawals", async (c) => {
  try {
    const data = await cached("rewards_withdrawals", 60, async () => {
      const result = await pool.query(`
        SELECT
          sa.view AS stake_address,
          w.amount::text,
          encode(t.hash,'hex') as tx_hash,
          b.time AS block_time,
          b.block_no
        FROM withdrawal w
        JOIN stake_address sa ON w.addr_id = sa.id
        JOIN tx t ON w.tx_id = t.id
        JOIN block b ON t.block_id = b.id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: Live Delegations ───
app.get("/delegations/live", async (c) => {
  try {
    const data = await cached("live_delegations", 60, async () => {
      const result = await pool.query(`
        SELECT
          sa.view AS stake_address,
          ph.view AS pool_hash,
          encode(t.hash,'hex') as tx_hash,
          b.time,
          b.block_no
        FROM delegation d
        JOIN stake_address sa ON d.addr_id = sa.id
        JOIN pool_hash ph ON d.pool_hash_id = ph.id
        JOIN tx t ON d.tx_id = t.id
        JOIN block b ON t.block_id = b.id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: New Pools ───
app.get("/pools/new", async (c) => {
  try {
    const data = await cached("new_pools", 300, async () => {
      const result = await pool.query(`
        SELECT
          ph.view AS pool_hash,
          COALESCE(ocpd.ticker_name, 'N/A') AS ticker,
          COALESCE(ocpd.json->>'name', 'N/A') AS name,
          b.time,
          b.block_no
        FROM pool_update pu
        JOIN pool_hash ph ON pu.hash_id = ph.id
        ${POOL_META_JOIN}
        JOIN tx t ON pu.registered_tx_id = t.id
        JOIN block b ON t.block_id = b.id
        WHERE pu.id = (
          SELECT id FROM pool_update pu2
          WHERE pu2.hash_id = ph.id
          ORDER BY pu2.registered_tx_id ASC
          LIMIT 1
        )
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: Retired Pools ───
app.get("/pools/retired", async (c) => {
  try {
    const data = await cached("retired_pools", 300, async () => {
      const result = await pool.query(`
        SELECT
          ph.view AS pool_hash,
          COALESCE(ocpd.ticker_name, 'N/A') AS ticker,
          COALESCE(ocpd.json->>'name', 'N/A') AS name,
          pr.retiring_epoch,
          b.time AS announced_time,
          b.block_no,
          encode(t.hash,'hex') as tx_hash
        FROM pool_retire pr
        JOIN pool_hash ph ON pr.hash_id = ph.id
        ${POOL_META_JOIN}
        JOIN tx t ON pr.announced_tx_id = t.id
        JOIN block b ON t.block_id = b.id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: Pool Updates ───
app.get("/pool-updates", async (c) => {
  try {
    const data = await cached("pool_updates", 120, async () => {
      const result = await pool.query(`
        SELECT
          ph.view AS pool_hash,
          COALESCE(ocpd.ticker_name, 'N/A') AS ticker,
          pu.pledge::text,
          pu.margin,
          pu.fixed_cost::text,
          encode(t.hash,'hex') as tx_hash,
          b.time,
          b.block_no
        FROM pool_update pu
        JOIN pool_hash ph ON pu.hash_id = ph.id
        ${POOL_META_JOIN}
        JOIN tx t ON pu.registered_tx_id = t.id
        JOIN block b ON t.block_id = b.id
        ORDER BY b.time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: Multi-Pool Delegators ───
app.get("/multi-pool-delegators", async (c) => {
  try {
    const data = await cached("multi_pool_delegators", 600, async () => {
      const currentEpoch = await pool.query(`SELECT MAX(no) FROM epoch`);
      const maxEpoch = currentEpoch.rows[0]?.max || 0;
      const minEpoch = Math.max(0, maxEpoch - 10);

      const result = await pool.query(`
        SELECT
          sa.view AS stake_address,
          COUNT(DISTINCT d.pool_hash_id) AS pool_count,
          MAX(b.time) AS last_delegation_time
        FROM delegation d
        JOIN stake_address sa ON d.addr_id = sa.id
        JOIN tx t ON d.tx_id = t.id
        JOIN block b ON t.block_id = b.id
        WHERE b.epoch_no >= $1
        GROUP BY sa.id, sa.view
        HAVING COUNT(DISTINCT d.pool_hash_id) > 1
        ORDER BY pool_count DESC, last_delegation_time DESC
        LIMIT 50
      `, [minEpoch]);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: Rewards Check ───
app.get("/rewards-check/:addr", async (c) => {
  try {
    const addr = c.req.param("addr");

    const data = await cached(`rewards_check_${addr}`, 120, async () => {
      const result = await pool.query(`
        SELECT
          r.type,
          r.amount::text,
          r.earned_epoch,
          r.spendable_epoch,
          ph.view AS pool_hash
        FROM reward r
        JOIN stake_address sa ON r.addr_id = sa.id
        LEFT JOIN pool_hash ph ON r.pool_id = ph.id
        WHERE sa.view = $1
        ORDER BY r.earned_epoch DESC
        LIMIT 100
      `, [addr]);
      return result.rows;
    });

    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 6: Certificates ───
app.get("/certificates", async (c) => {
  try {
    const data = await cached("certificates", 60, async () => {
      const result = await pool.query(`
        SELECT * FROM (
          SELECT
            'stake_registration' AS cert_type,
            sreg.tx_id,
            sreg.cert_index,
            sa.view AS stake_address,
            NULL::text AS pool_hash,
            NULL::int AS retiring_epoch,
            encode(t.hash,'hex') AS tx_hash,
            b.time,
            b.block_no
          FROM stake_registration sreg
          JOIN stake_address sa ON sreg.addr_id = sa.id
          JOIN tx t ON sreg.tx_id = t.id
          JOIN block b ON t.block_id = b.id

          UNION ALL

          SELECT
            'delegation' AS cert_type,
            d.tx_id,
            d.cert_index,
            sa.view AS stake_address,
            ph.view AS pool_hash,
            NULL::int,
            encode(t.hash,'hex'),
            b.time,
            b.block_no
          FROM delegation d
          JOIN stake_address sa ON d.addr_id = sa.id
          JOIN pool_hash ph ON d.pool_hash_id = ph.id
          JOIN tx t ON d.tx_id = t.id
          JOIN block b ON t.block_id = b.id

          UNION ALL

          SELECT
            'pool_retire' AS cert_type,
            pr.announced_tx_id,
            0::int,
            NULL::text,
            ph.view,
            pr.retiring_epoch,
            encode(t.hash,'hex'),
            b.time,
            b.block_no
          FROM pool_retire pr
          JOIN pool_hash ph ON pr.hash_id = ph.id
          JOIN tx t ON pr.announced_tx_id = t.id
          JOIN block b ON t.block_id = b.id
        ) certs
        ORDER BY time DESC
        LIMIT 50
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: ADA Pots ───
app.get("/pots", async (c) => {
  try {
    const data = await cached("ada_pots", 3600, async () => {
      const result = await pool.query(`
        SELECT
          epoch_no,
          treasury::text,
          reserves::text,
          utxo::text,
          rewards::text,
          deposits::text,
          fees::text
        FROM ada_pots
        ORDER BY epoch_no DESC
        LIMIT 30
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Treasury Projection ───
app.get("/treasury-projection", async (c) => {
  try {
    const data = await cached("treasury_projection", 3600, async () => {
      const result = await pool.query(`
        SELECT
          epoch_no,
          treasury::text,
          reserves::text,
          utxo::text,
          rewards::text,
          deposits::text,
          fees::text
        FROM ada_pots
        ORDER BY epoch_no DESC
        LIMIT 10
      `);

      const history = result.rows.reverse();
      const projection = [];

      if (history.length >= 2) {
        const lastTreasury = parseFloat(history[history.length - 1].treasury);
        const prevTreasury = parseFloat(history[history.length - 2].treasury);
        const growthRate = (lastTreasury - prevTreasury) / prevTreasury;

        let projectedTreasury = lastTreasury;
        const currentEpoch = parseInt(history[history.length - 1].epoch_no);

        for (let i = 1; i <= 12; i++) {
          projectedTreasury = projectedTreasury * (1 + growthRate);
          projection.push({
            epoch_no: currentEpoch + i,
            treasury: projectedTreasury.toString(),
            projected: true
          });
        }
      }

      return { history, projection };
    });

    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Top Addresses ───
app.get("/top-addresses", async (c) => {
  try {
    const data = await cached("top_addresses", 3600, async () => {
      const result = await pool.query(`
        SELECT
          txo.address,
          SUM(txo.value)::text AS total_value,
          COUNT(*)::int AS utxo_count,
          sa.view as stake_address
        FROM tx_out txo
        LEFT JOIN stake_address sa ON txo.stake_address_id = sa.id
        WHERE txo.consumed_by_tx_id IS NULL
        GROUP BY txo.address, sa.view
        ORDER BY SUM(txo.value) DESC
        LIMIT 100
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Top Stakers ───
app.get("/top-stakers", async (c) => {
  try {
    const data = await cached("top_stakers", 3600, async () => {
      const result = await pool.query(`
        SELECT
          sa.view AS stake_address,
          es.amount::text AS stake_amount,
          es.epoch_no
        FROM epoch_stake es
        JOIN stake_address sa ON es.addr_id = sa.id
        WHERE es.epoch_no = (SELECT MAX(epoch_no) - 1 FROM epoch_stake)
        ORDER BY es.amount DESC
        LIMIT 100
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Wealth Composition ───
app.get("/wealth-composition", async (c) => {
  try {
    const data = await cached("wealth_composition", 3600, async () => {
      const result = await pool.query(`
        WITH recent_epochs AS (
          SELECT DISTINCT epoch_no FROM epoch_stake
          ORDER BY epoch_no DESC LIMIT 2
        )
        SELECT es.epoch_no,
          CASE
            WHEN es.amount < 100000000 THEN '< 100 ADA'
            WHEN es.amount < 1000000000 THEN '100 - 1K ADA'
            WHEN es.amount < 10000000000 THEN '1K - 10K ADA'
            WHEN es.amount < 100000000000 THEN '10K - 100K ADA'
            WHEN es.amount < 1000000000000 THEN '100K - 1M ADA'
            ELSE '> 1M ADA'
          END as range,
          COUNT(*)::int as count,
          SUM(es.amount)::text as total_stake
        FROM epoch_stake es
        WHERE es.epoch_no IN (SELECT epoch_no FROM recent_epochs)
        GROUP BY es.epoch_no, 2
        ORDER BY es.epoch_no DESC, MIN(es.amount)
      `);

      const epochs = {};
      result.rows.forEach(row => {
        if (!epochs[row.epoch_no]) {
          epochs[row.epoch_no] = [];
        }
        epochs[row.epoch_no].push({
          range: row.range,
          count: row.count,
          total_stake: row.total_stake
        });
      });

      return epochs;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Block Versions ───
app.get("/block-versions", async (c) => {
  try {
    const data = await cached("block_versions", 3600, async () => {
      const result = await pool.query(`
        SELECT
          proto_major,
          proto_minor,
          COUNT(*)::int AS block_count
        FROM block
        WHERE block_no >= (SELECT MAX(block_no) - 10000 FROM block)
        GROUP BY proto_major, proto_minor
        ORDER BY block_count DESC
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Genesis Addresses ───
app.get("/genesis-addresses", async (c) => {
  try {
    const data = await cached("genesis_addresses", 86400, async () => {
      const result = await pool.query(`
        SELECT
          address,
          SUM(value)::text AS total_value
        FROM tx_out
        WHERE tx_id IN (SELECT id FROM tx WHERE block_id = (
          SELECT id FROM block WHERE epoch_no = 0 AND block_no = 0 LIMIT 1
        ))
        AND consumed_by_tx_id IS NULL
        GROUP BY address
        ORDER BY SUM(value) DESC
        LIMIT 100
      `);
      return result.rows;
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Phase 7: Transaction Charts ───
app.get("/tx-charts", async (c) => {
  try {
    const metric = c.req.query("metric") || "daily-count";
    const days = Math.min(parseInt(c.req.query("days") || "30"), 90);
    const cacheKey = `tx_charts_${metric}_${days}`;

    const data = await cached(cacheKey, 300, async () => {
      let query = "";

      switch (metric) {
        case "daily-count":
          query = `
            SELECT
              DATE(b.time) AS date,
              COUNT(*)::int AS count
            FROM tx t
            JOIN block b ON t.block_id = b.id
            WHERE b.time >= NOW() - make_interval(days => $1)
            GROUP BY DATE(b.time)
            ORDER BY DATE(b.time) DESC
          `;
          break;

        case "daily-fees":
          query = `
            SELECT
              DATE(b.time) AS date,
              SUM(t.fee)::text AS total_fees
            FROM tx t
            JOIN block b ON t.block_id = b.id
            WHERE b.time >= NOW() - make_interval(days => $1)
            GROUP BY DATE(b.time)
            ORDER BY DATE(b.time) DESC
          `;
          break;

        case "daily-volume":
          query = `
            SELECT
              DATE(b.time) AS date,
              SUM(to_out.value)::text AS volume
            FROM tx t
            JOIN block b ON t.block_id = b.id
            JOIN tx_out to_out ON t.id = to_out.tx_id
            WHERE b.time >= NOW() - make_interval(days => $1)
            GROUP BY DATE(b.time)
            ORDER BY DATE(b.time) DESC
          `;
          break;

        case "avg-tx-size":
          query = `
            SELECT
              DATE(b.time) AS date,
              AVG(t.size)::int AS avg_size
            FROM tx t
            JOIN block b ON t.block_id = b.id
            WHERE b.time >= NOW() - make_interval(days => $1)
            GROUP BY DATE(b.time)
            ORDER BY DATE(b.time) DESC
          `;
          break;

        default:
          query = `
            SELECT
              DATE(b.time) AS date,
              COUNT(*)::int AS count
            FROM tx t
            JOIN block b ON t.block_id = b.id
            WHERE b.time >= NOW() - make_interval(days => $1)
            GROUP BY DATE(b.time)
            ORDER BY DATE(b.time) DESC
          `;
      }

      const result = await pool.query(query, [days]);
      return result.rows;
    });

    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
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
      ${POOL_META_JOIN}
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

// ─── Wallet Lookup (replaces Blockfrost for ADA Holder dashboard) ───
app.get("/wallet/:stakeAddr", async (c) => {
  const stakeAddr = c.req.param("stakeAddr");
  if (!stakeAddr.startsWith("stake")) return c.json({ error: "Invalid stake address" }, 400);

  const data = await cached(`wallet:${stakeAddr}`, 120, async () => {
    const epochR = await pool.query("SELECT MAX(no) - 1 as e FROM epoch");
    const prevEpoch = epochR.rows[0]?.e || 0;

    // Get stake address ID and balance
    const saR = await pool.query(`
      SELECT sa.id, sa.view, es.amount::text as balance
      FROM stake_address sa
      LEFT JOIN epoch_stake es ON es.addr_id = sa.id AND es.epoch_no = $2
      WHERE sa.view = $1
    `, [stakeAddr, prevEpoch]);
    if (!saR.rows.length) return { error: "not_found" };
    const sa = saR.rows[0];
    const balAda = Number(sa.balance || "0") / 1e6;

    // Pool delegation
    let pool_ticker = null, pool_name = null, pool_id = null;
    try {
      const pdR = await pool.query(`
        SELECT ph.view as pool_id, ocpd.json->>'ticker' as ticker, ocpd.json->>'name' as name
        FROM delegation d
        JOIN pool_hash ph ON ph.id = d.pool_hash_id
        ${POOL_META_JOIN}
        WHERE d.addr_id = $1 ORDER BY d.tx_id DESC LIMIT 1
      `, [sa.id]);
      if (pdR.rows.length) { pool_id = pdR.rows[0].pool_id; pool_ticker = pdR.rows[0].ticker; pool_name = pdR.rows[0].name; }
    } catch(e) {}

    // DRep delegation
    let drep_id = null, drep_view = null;
    try {
      const dvR = await pool.query(`
        SELECT dh.view, dh.raw FROM delegation_vote dv
        JOIN drep_hash dh ON dh.id = dv.drep_hash_id
        WHERE dv.addr_id = $1 ORDER BY dv.tx_id DESC LIMIT 1
      `, [sa.id]);
      if (dvR.rows.length) { drep_view = dvR.rows[0].view; drep_id = dvR.rows[0].view; }
    } catch(e) {}

    // Rewards (last 30 epochs)
    let rewards = [];
    try {
      const rwR = await pool.query(`
        SELECT r.earned_epoch as epoch, r.amount::text
        FROM reward r WHERE r.addr_id = $1
        ORDER BY r.earned_epoch DESC LIMIT 30
      `, [sa.id]);
      rewards = rwR.rows.map((r) => ({ epoch: r.epoch, ada: Number(r.amount) / 1e6 }));
    } catch(e) {}

    // Total rewards
    let totalRewards = 0;
    try {
      const trR = await pool.query(`
        SELECT COALESCE(SUM(amount),0)::text as total FROM reward WHERE addr_id = $1
      `, [sa.id]);
      totalRewards = Number(trR.rows[0]?.total || "0") / 1e6;
    } catch(e) {}

    // Total withdrawals
    let totalWithdrawals = 0;
    try {
      const twR = await pool.query(`
        SELECT COALESCE(SUM(amount),0)::text as total FROM withdrawal WHERE addr_id = $1
      `, [sa.id]);
      totalWithdrawals = Number(twR.rows[0]?.total || "0") / 1e6;
    } catch(e) {}

    return {
      stake_address: stakeAddr,
      balance_ada: balAda,
      balance_lovelace: sa.balance || "0",
      pool: pool_id ? { id: pool_id, ticker: pool_ticker, name: pool_name } : null,
      drep: drep_id ? { id: drep_id, view: drep_view } : null,
      rewards_available: totalRewards - totalWithdrawals,
      rewards_total: totalRewards,
      reward_history: rewards.reverse(),
      epoch: prevEpoch,
      active: balAda > 0,
    };
  });
  return c.json(data);
});

// Resolve addr1 -> stake address
app.get("/address-to-stake/:addr", async (c) => {
  const addr = c.req.param("addr");
  const data = await cached(`a2s:${addr}`, 600, async () => {
    const r = await pool.query(`
      SELECT sa.view as stake_address FROM tx_out txo
      JOIN stake_address sa ON sa.id = txo.stake_address_id
      WHERE txo.address = $1 LIMIT 1
    `, [addr]);
    return r.rows[0] || { error: "not_found" };
  });
  return c.json(data);
});

// ============================================================
// CONSOLIDATED EXPLORER API ENDPOINTS
// ============================================================

// --- Explorer: Chain (blocks + txs + epochs) ---
app.get("/explorer/chain", async (c) => {
  const data = await cached("exp:chain", 15, async () => {
    const [latestBlocks, latestTxs, epochs] = await Promise.all([
      pool.query(`SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no,
        b.slot_no, b.time, b.size, b.tx_count,
        ph.view as pool_id
        FROM block b
        LEFT JOIN slot_leader sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash ph ON ph.id = sl.pool_hash_id
        WHERE b.block_no IS NOT NULL
        ORDER BY b.block_no DESC LIMIT 30`),
      pool.query(`SELECT encode(t.hash,'hex') as hash, t.fee::text, t.out_sum::text,
        t.size, b.time, b.epoch_no, b.block_no
        FROM tx t JOIN block b ON b.id = t.block_id
        ORDER BY t.id DESC LIMIT 30`),
      pool.query(`SELECT e.no, e.start_time, e.end_time, e.blk_count as blocks,
        e.fees::text as fees, e.out_sum::text as out_sum, e.tx_count
        FROM epoch e ORDER BY e.no DESC LIMIT 15`)
    ]);
    return { latestBlocks: latestBlocks.rows, latestTxs: latestTxs.rows, epochs: epochs.rows };
  });
  return c.json(data);
});

// --- Explorer: Staking (pools + delegations + stake dist + rewards) ---
app.get("/explorer/staking", async (c) => {
  const data = await cached("exp:staking", 30, async () => {
    const epochR = await pool.query("SELECT MAX(no) - 1 as e FROM epoch");
    const prevEpoch = epochR.rows[0]?.e || 0;
    const [pools, recentDelegations, stakeDist, stats] = await Promise.all([
      pool.query(`WITH pool_stakes AS (
        SELECT pool_id, COUNT(*) as delegators, COALESCE(SUM(amount),0)::text as stake
        FROM epoch_stake WHERE epoch_no = $1 GROUP BY pool_id
      )
      SELECT ph.view as pool_id, ocpd.json->>'name' as name, ocpd.json->>'ticker' as ticker,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        COALESCE(ps.delegators,0) as delegators, COALESCE(ps.stake,'0') as stake
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
        ${POOL_META_JOIN}
        LEFT JOIN pool_stakes ps ON ps.pool_id = ph.id
        WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= $1 + 1)
        ORDER BY ps.stake::numeric DESC NULLS LAST LIMIT 50`, [prevEpoch]),
      pool.query(`SELECT d.id, sa.view as stake_addr, ph.view as pool_id,
        ocpd.json->>'name' as pool_name, b.time, b.epoch_no
        FROM delegation d
        JOIN stake_address sa ON sa.id = d.addr_id
        JOIN pool_hash ph ON ph.id = d.pool_hash_id
        ${POOL_META_JOIN}
        JOIN tx t ON t.id = d.tx_id
        JOIN block b ON b.id = t.block_id
        ORDER BY d.id DESC LIMIT 30`),
      pool.query(`WITH buckets AS (
        SELECT CASE
          WHEN amount < 1000000000 THEN '< 1K ADA'
          WHEN amount < 10000000000 THEN '1K-10K'
          WHEN amount < 100000000000 THEN '10K-100K'
          WHEN amount < 1000000000000 THEN '100K-1M'
          ELSE '> 1M ADA'
        END as bucket,
        COUNT(*) as cnt, COALESCE(SUM(amount),0)::text as total
        FROM epoch_stake WHERE epoch_no = $1
        GROUP BY bucket)
        SELECT * FROM buckets ORDER BY total DESC`, [prevEpoch]),
      pool.query(`SELECT
        (SELECT COALESCE(SUM(amount),0)::text FROM epoch_stake WHERE epoch_no = $1) as total_staked,
        (SELECT COUNT(DISTINCT addr_id) FROM epoch_stake WHERE epoch_no = $1) as total_stakers,
        (SELECT COUNT(*) FROM pool_hash ph WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= $1 + 1)) as active_pools`, [prevEpoch])
    ]);
    return { pools: pools.rows, recentDelegations: recentDelegations.rows, stakeDistribution: stakeDist.rows, stats: stats.rows[0] || {} };
  });
  return c.json(data);
});

// --- Explorer: Governance ---
app.get("/explorer/governance", async (c) => {
  const data = await cached("exp:governance", 60, async () => {
    const [proposals, dreps, committee, votes, constitution, params] = await Promise.all([
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text, gp.expiration,
        va.url as anchor_url,
        b.time, b.epoch_no,
        gp.ratified_epoch, gp.enacted_epoch, gp.dropped_epoch, gp.expired_epoch,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id) as vote_count
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
        ORDER BY b.time DESC LIMIT 30`),
      pool.query(`SELECT encode(dh.raw,'hex') as drep_hash, dh.view, dh.has_script,
        (SELECT COUNT(*) FROM delegation_vote dv WHERE dv.drep_hash_id = dh.id) as delegations
        FROM drep_hash dh
        ORDER BY delegations DESC LIMIT 30`),
      pool.query(`SELECT ch.id, encode(ch.raw,'hex') as cred_hash, ch.has_script,
        cm.expiration_epoch
        FROM committee_member cm
        JOIN committee_hash ch ON ch.id = cm.committee_hash_id`),
      pool.query(`SELECT gp.type as proposal_type,
        vp.vote, vp.voter_role,
        CASE WHEN vp.voter_role='DRep' THEN encode(dh.raw,'hex')
             WHEN vp.voter_role='SPO' THEN ph.view
             WHEN vp.voter_role='ConstitutionalCommittee' THEN encode(ch.raw,'hex')
        END as voter_id,
        b.time
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN drep_hash dh ON dh.id = vp.drep_voter
        LEFT JOIN pool_hash ph ON ph.id = vp.pool_voter
        LEFT JOIN committee_hash ch ON ch.id = vp.committee_voter
        ORDER BY b.time DESC LIMIT 50`),
      pool.query(`SELECT c.script_hash, va.url, va.data_hash
        FROM constitution c
        LEFT JOIN voting_anchor va ON va.id = c.voting_anchor_id
        ORDER BY c.id DESC LIMIT 1`),
      pool.query(`SELECT epoch_no, min_fee_a, min_fee_b, key_deposit::text,
        pool_deposit::text, optimal_pool_count, min_pool_cost::text,
        monetary_expand_rate, treasury_growth_rate, protocol_major, protocol_minor
        FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`)
    ]);
    return {
      proposals: proposals.rows, dreps: dreps.rows, committee: committee.rows,
      recentVotes: votes.rows, constitution: constitution.rows[0] || null,
      protocolParams: params.rows[0] || {}
    };
  });
  return c.json(data);
});

// --- Explorer: Tokens ---
app.get("/explorer/tokens", async (c) => {
  const data = await cached("exp:tokens", 30, async () => {
    const [tokens, recentMints] = await Promise.all([
      pool.query(`SELECT ma.fingerprint, encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as name_hex,
        (SELECT COALESCE(SUM(mto.quantity),0)::text FROM ma_tx_out mto
         JOIN tx_out tao ON tao.id = mto.tx_out_id
         LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
         WHERE mto.ident = ma.id AND ti.id IS NULL) as supply
        FROM multi_asset ma
        ORDER BY ma.id DESC LIMIT 50`),
      pool.query(`SELECT ma.fingerprint, encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as name_hex,
        mam.quantity::text, b.time, b.epoch_no
        FROM ma_tx_mint mam
        JOIN multi_asset ma ON ma.id = mam.ident
        JOIN tx t ON t.id = mam.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE mam.quantity > 0
        ORDER BY t.id DESC LIMIT 30`)
    ]);
    return { tokens: tokens.rows, recentMints: recentMints.rows };
  });
  return c.json(data);
});

// --- Explorer: Analytics (optimized: uses epoch table columns directly) ---
app.get("/explorer/analytics", async (c) => {
  const data = await cached("exp:analytics", 60, async () => {
    const [epochTrend, pots, wealth, blockVersions] = await Promise.all([
      pool.query(`SELECT e.no, e.start_time,
        e.blk_count as blocks, e.tx_count, e.fees::text as total_fees
        FROM epoch e ORDER BY e.no DESC LIMIT 20`),
      pool.query(`SELECT epoch_no, treasury::text, reserves::text, rewards::text,
        utxo::text, deposits_stake::text, fees::text
        FROM ada_pots ORDER BY epoch_no DESC LIMIT 15`),
      pool.query(`SELECT sa.view as stake_address, es.amount::text as balance
        FROM epoch_stake es
        JOIN stake_address sa ON sa.id = es.addr_id
        WHERE es.epoch_no = (SELECT MAX(no) - 1 FROM epoch)
        ORDER BY es.amount DESC LIMIT 100`),
      pool.query(`SELECT b.proto_major, b.proto_minor, COUNT(*) as block_count
        FROM block b WHERE b.epoch_no = (SELECT MAX(no) FROM epoch)
        GROUP BY b.proto_major, b.proto_minor ORDER BY block_count DESC`)
    ]);
    // Compute wealth stats from top 100 stakers
    const topBalances = epochTrend.rows.length > 0 ? wealth.rows : [];
    let wealthTotal = BigInt(0), wealthMin = BigInt(0), wealthMax = BigInt(0);
    for (const r of topBalances) {
      const b = BigInt(r.balance || "0");
      wealthTotal += b;
      if (wealthMin === BigInt(0) || b < wealthMin) wealthMin = b;
      if (b > wealthMax) wealthMax = b;
    }
    return {
      epochTrend: epochTrend.rows, adaPots: pots.rows,
      wealthStats: { count: topBalances.length, total: wealthTotal.toString(), min_bal: wealthMin.toString(), max_bal: wealthMax.toString() },
      blockVersions: blockVersions.rows
    };
  });
  return c.json(data);
});

// --- Explorer: Addresses (rich list + whales) ---
app.get("/explorer/addresses", async (c) => {
  const data = await cached("exp:addresses", 120, async () => {
    const prevEpochR = await pool.query("SELECT MAX(no) - 1 as e FROM epoch");
    const prevEpoch = prevEpochR.rows[0]?.e || 0;
    const [topStakers] = await Promise.all([
      pool.query(`SELECT sa.view as stake_address,
        es.amount::text as balance,
        ph.view as pool_id,
        pod.json->>'name' as pool_name
        FROM epoch_stake es
        JOIN stake_address sa ON sa.id = es.addr_id
        LEFT JOIN delegation d ON d.addr_id = sa.id AND d.id = (SELECT MAX(d2.id) FROM delegation d2 WHERE d2.addr_id = sa.id)
        LEFT JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN off_chain_pool_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM off_chain_pool_data pod2 WHERE pod2.pool_id = ph.id)
        WHERE es.epoch_no = $1
        ORDER BY es.amount DESC LIMIT 50`, [prevEpoch])
    ]);
    return { richList: topStakers.rows, topStakers: topStakers.rows };
  });
  return c.json(data);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Rich List V2 - Unified ranking: Byron + Enterprise + Stake addresses
// ═══════════════════════════════════════════════════════════════════════════════

const EXCHANGE_POOL_TICKERS = new Set([
  // Binance
  "BINA","BNP","BNP1","BNP2","BNP3","BNP4","BNP5","BNP6","BNP7","BNP8",
  // Coinbase
  "COIN","COINBASE","CB1","CB2",
  // Kraken
  "KRKN","KRAK","KRAK1","KRAK2",
  // BitGo / Bitfinex / BitMEX
  "BTCM","BITGO","BFIN","BITMEX",
  // Other exchanges
  "NEXO","WHLP","ETORO","UPBIT","UPBI",
  "HUOBI","HTX","GATE","OKEX","OKX","BYBIT","BISO","ROBH",
  "HASH","HASH0","HASH1","HASH2",
  // Additional exchanges
  "MEXC","KUCN","KUCOIN","BITTREX","GEMNI","GEMINI",
  "CRYPTO","CDC","SWISSBORG","LUNO","BITPANDA",
  "EMURG","YOROI",
]);

app.get("/richlist-v2", async (c) => {
  const limit = getLimit(c, 200, 500);
  const data = await cached(`richlist_v2:${limit}`, 3600, async () => {
    const epochR = await pool.query("SELECT MAX(no) - 1 as e FROM epoch");
    const prevEpoch = epochR.rows[0]?.e || 0;

    // 1) Top staked addresses (fast - uses indexed epoch_stake)
    const stakedR = await pool.query(`
      SELECT sa.id as addr_id, sa.view as identifier, 'stake' as addr_type,
             es.amount::text as balance
      FROM epoch_stake es
      JOIN stake_address sa ON sa.id = es.addr_id
      WHERE es.epoch_no = $1
      ORDER BY es.amount DESC LIMIT $2
    `, [prevEpoch, limit]);

    // 2) Top non-staked UTXOs (Byron + Enterprise) >= 100K ADA
    // Use dedicated client with statement_timeout to prevent runaway queries
    let unstakedR = { rows: [] };
    try {
      const client = await pool.connect();
      try {
        await client.query("SET statement_timeout = '60s'");
        unstakedR = await client.query(`
          SELECT txo.address as identifier,
                 CASE WHEN txo.address LIKE 'DdzFF%' OR txo.address LIKE 'Ae2%' THEN 'byron' ELSE 'enterprise' END as addr_type,
                 SUM(txo.value)::text as balance
          FROM tx_out txo
          WHERE txo.stake_address_id IS NULL
            AND NOT EXISTS (SELECT 1 FROM tx_in txi WHERE txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index)
          GROUP BY txo.address
          HAVING SUM(txo.value) >= 100000000000
          ORDER BY SUM(txo.value) DESC LIMIT $1
        `, [limit]);
      } finally { client.release(); }
    } catch(e) {
      console.warn("richlist-v2: unstaked UTXO query timed out, returning staked-only results");
    }

    // 3) Merge & sort
    const all = [...stakedR.rows, ...unstakedR.rows];
    all.sort((a, b) => { const d = BigInt(b.balance||"0") - BigInt(a.balance||"0"); return d > 0n ? 1 : d < 0n ? -1 : 0; });
    const top = all.slice(0, limit);

    // 4) Pool & DRep delegation for staked entries
    const stakeIds = top.filter(e => e.addr_type === "stake" && e.addr_id).map(e => e.addr_id);
    let poolDels = {}, drepDels = {}, stakeLast = {}, stakeTxCnt = {};
    if (stakeIds.length > 0) {
      const pdR = await pool.query(`
        SELECT DISTINCT ON (d.addr_id) d.addr_id,
               ph.view as pool_id, ocpd.json->>'ticker' as pool_ticker, ocpd.json->>'name' as pool_name
        FROM delegation d
        JOIN pool_hash ph ON ph.id = d.pool_hash_id
        ${POOL_META_JOIN}
        WHERE d.addr_id = ANY($1::bigint[])
        ORDER BY d.addr_id, d.tx_id DESC
      `, [stakeIds]);
      for (const r of pdR.rows) poolDels[r.addr_id] = { pool_id: r.pool_id, pool_ticker: r.pool_ticker, pool_name: r.pool_name };

      try {
        const dvR = await pool.query(`
          SELECT DISTINCT ON (dv.addr_id) dv.addr_id, dh.view as drep_id, dh.has_script
          FROM delegation_vote dv JOIN drep_hash dh ON dh.id = dv.drep_hash_id
          WHERE dv.addr_id = ANY($1::bigint[]) ORDER BY dv.addr_id, dv.tx_id DESC
        `, [stakeIds]);
        for (const r of dvR.rows) drepDels[r.addr_id] = { drep_id: r.drep_id, has_script: r.has_script };
      } catch(e) {}

      const ltR = await pool.query(`
        SELECT sa_id, MAX(tx_time) as last_tx FROM (
          SELECT txo.stake_address_id as sa_id, b.time as tx_time
          FROM tx_out txo JOIN tx t ON t.id = txo.tx_id JOIN block b ON b.id = t.block_id
          WHERE txo.stake_address_id = ANY($1::bigint[]) ORDER BY t.id DESC LIMIT 5000
        ) sub GROUP BY sa_id
      `, [stakeIds]);
      for (const r of ltR.rows) stakeLast[r.sa_id] = r.last_tx;

      const tcR = await pool.query(`
        SELECT txo.stake_address_id as sa_id, COUNT(DISTINCT txo.tx_id)::int as tx_count
        FROM tx_out txo WHERE txo.stake_address_id = ANY($1::bigint[]) GROUP BY txo.stake_address_id
      `, [stakeIds]);
      for (const r of tcR.rows) stakeTxCnt[r.sa_id] = r.tx_count;
    }

    // 5) Tx info for non-staked addresses
    const nsAddrs = top.filter(e => e.addr_type !== "stake").map(e => e.identifier);
    let addrTxInfo = {};
    for (let i = 0; i < nsAddrs.length; i += 50) {
      const batch = nsAddrs.slice(i, i + 50);
      const r = await pool.query(`
        SELECT txo.address, COUNT(DISTINCT txo.tx_id)::int as tx_count, MAX(b.time) as last_tx
        FROM tx_out txo JOIN tx t ON t.id = txo.tx_id JOIN block b ON b.id = t.block_id
        WHERE txo.address = ANY($1::text[]) GROUP BY txo.address
      `, [batch]);
      for (const row of r.rows) addrTxInfo[row.address] = { tx_count: row.tx_count, last_tx: row.last_tx };
    }

    // 6) Assemble with flags
    const now = new Date();
    let totBal=0n, exBal=0n, lostBal=0n, byronBal=0n, entBal=0n, stBal=0n;
    let exCnt=0, lostCnt=0, byronCnt=0, entCnt=0, stCnt=0;

    const entries = top.map((e, idx) => {
      const isStk = e.addr_type === "stake";
      const aid = e.addr_id;
      const pd = isStk ? poolDels[aid] || null : null;
      const dd = isStk ? drepDels[aid] || null : null;
      let txCnt = isStk ? (stakeTxCnt[aid]||0) : (addrTxInfo[e.identifier]?.tx_count||0);
      let lastTx = isStk ? (stakeLast[aid]||null) : (addrTxInfo[e.identifier]?.last_tx||null);

      let isEx = false, exReason = null;
      if (pd?.pool_ticker && EXCHANGE_POOL_TICKERS.has(pd.pool_ticker.toUpperCase())) {
        isEx = true; exReason = "Exchange pool: " + pd.pool_ticker;
      }
      if (!isEx && txCnt > 50000) { isEx = true; exReason = "High tx count: " + txCnt; }

      let isLost = false, lostReason = null;
      const bal = BigInt(e.balance||"0");
      if (lastTx) {
        const yrs = (now - new Date(lastTx)) / (365.25*24*60*60*1000);
        if (e.addr_type === "byron" && yrs > 4) { isLost = true; lostReason = `Byron inactive ${yrs.toFixed(1)}y`; }
        else if (yrs > 5 && bal > 10000000000n) { isLost = true; lostReason = `Inactive ${yrs.toFixed(1)}y`; }
        else if (!isStk && !isEx && yrs > 3) { isLost = true; lostReason = `Non-staked inactive ${yrs.toFixed(1)}y`; }
      } else if (e.addr_type === "byron") { isLost = true; lostReason = "Byron, no recent activity"; }

      totBal += bal;
      if (isEx) { exBal += bal; exCnt++; }
      if (isLost) { lostBal += bal; lostCnt++; }
      if (e.addr_type==="byron") { byronBal += bal; byronCnt++; }
      if (e.addr_type==="enterprise") { entBal += bal; entCnt++; }
      if (e.addr_type==="stake") { stBal += bal; stCnt++; }

      return {
        rank: idx+1, identifier: e.identifier, addr_type: e.addr_type,
        balance: e.balance, tx_count: txCnt, last_tx: lastTx,
        pool: pd, drep: dd,
        is_exchange: isEx, exchange_reason: exReason,
        is_likely_lost: isLost, lost_reason: lostReason,
      };
    });

    return {
      summary: {
        epoch: prevEpoch, total_entries: entries.length,
        total_balance: totBal.toString(),
        exchange: { count: exCnt, balance: exBal.toString() },
        likely_lost: { count: lostCnt, balance: lostBal.toString() },
        by_type: {
          byron: { count: byronCnt, balance: byronBal.toString() },
          enterprise: { count: entCnt, balance: entBal.toString() },
          stake: { count: stCnt, balance: stBal.toString() },
        },
      },
      entries,
    };
  });
  return c.json(data);
});

// ─── Lost ADA Analysis ──
app.get("/lost-ada-analysis", async (c) => {
  const data = await cached("lost_ada_analysis", 7200, async () => {
    const now = new Date();
    const buckets = {
      active_recent: { label: "< 1 year", count: 0, balance: BigInt(0) },
      dormant_1_3: { label: "1-3 years", count: 0, balance: BigInt(0) },
      dormant_3_5: { label: "3-5 years", count: 0, balance: BigInt(0) },
      likely_lost_5plus: { label: "5+ years (likely lost)", count: 0, balance: BigInt(0) },
      unknown: { label: "Unknown last activity", count: 0, balance: BigInt(0) },
    };
    let entries = [];

    try {
      const client = await pool.connect();
      try {
        await client.query("SET statement_timeout = '90s'");
        const byronR = await client.query(`
          SELECT txo.address as identifier, SUM(txo.value)::text as balance,
                 COUNT(DISTINCT txo.tx_id)::int as tx_count, MAX(b.time) as last_tx
          FROM tx_out txo JOIN tx t ON t.id = txo.tx_id JOIN block b ON b.id = t.block_id
          WHERE txo.stake_address_id IS NULL
            AND (txo.address LIKE 'DdzFF%' OR txo.address LIKE 'Ae2%')
            AND NOT EXISTS (SELECT 1 FROM tx_in txi WHERE txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index)
          GROUP BY txo.address HAVING SUM(txo.value) >= 1000000000
          ORDER BY SUM(txo.value) DESC LIMIT 500
        `);

        entries = byronR.rows.map(row => {
          const bal = BigInt(row.balance||"0");
          let cat = "unknown", yrs = null;
          if (row.last_tx) {
            yrs = (now - new Date(row.last_tx)) / (365.25*24*60*60*1000);
            cat = yrs < 1 ? "active_recent" : yrs < 3 ? "dormant_1_3" : yrs < 5 ? "dormant_3_5" : "likely_lost_5plus";
          }
          buckets[cat].count++;
          buckets[cat].balance += bal;
          return {
            address: row.identifier.slice(0,30)+"...", full_address: row.identifier,
            balance: row.balance, tx_count: row.tx_count, last_tx: row.last_tx,
            years_since_last_tx: yrs ? yrs.toFixed(1) : null, category: cat,
          };
        });
      } finally { client.release(); }
    } catch(e) {
      console.warn("lost-ada-analysis: Byron UTXO query timed out");
    }

    const bucketsOut = {};
    for (const [k,v] of Object.entries(buckets)) bucketsOut[k] = { ...v, balance: v.balance.toString() };

    // Enterprise lost analysis (also with timeout)
    let entLostBal = BigInt(0), entLostCnt = 0;
    try {
      const client2 = await pool.connect();
      try {
        await client2.query("SET statement_timeout = '90s'");
        const entR = await client2.query(`
          SELECT txo.address, SUM(txo.value)::text as balance, MAX(b.time) as last_tx
          FROM tx_out txo JOIN tx t ON t.id = txo.tx_id JOIN block b ON b.id = t.block_id
          WHERE txo.stake_address_id IS NULL AND txo.address NOT LIKE 'DdzFF%' AND txo.address NOT LIKE 'Ae2%'
            AND NOT EXISTS (SELECT 1 FROM tx_in txi WHERE txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index)
          GROUP BY txo.address HAVING SUM(txo.value) >= 10000000000
          ORDER BY SUM(txo.value) DESC LIMIT 200
        `);
        for (const r of entR.rows) {
          if (r.last_tx) {
            const yrs = (now - new Date(r.last_tx)) / (365.25*24*60*60*1000);
            if (yrs > 3) { entLostBal += BigInt(r.balance||"0"); entLostCnt++; }
          }
        }
      } finally { client2.release(); }
    } catch(e) {
      console.warn("lost-ada-analysis: Enterprise UTXO query timed out");
    }

    return {
      byron_analysis: { total_entries: entries.length, buckets: bucketsOut, top_entries: entries.slice(0,100) },
      enterprise_analysis: { likely_lost_count: entLostCnt, likely_lost_balance: entLostBal.toString() },
    };
  });
  return c.json(data);
});

// ─── Price Proxy (cached CoinGecko) ──────────────────
app.get("/prices", async (c) => {
  const ids = c.req.query("ids") || "cardano";
  const vs = c.req.query("vs") || "usd,jpy";
  const data = await cached(`prices:${ids}:${vs}`, 300, async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true&include_market_cap=true`;
      const r = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
      return await r.json();
    } catch(e) { return { error: e.message }; }
  });
  return c.json(data);
});

app.get("/price-history/:id", async (c) => {
  const id = c.req.param("id") || "cardano";
  const days = Math.min(parseInt(c.req.query("days") || "30"), 365);
  const vs = c.req.query("vs") || "usd";
  const data = await cached(`priceH:${id}:${days}:${vs}`, 1800, async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${vs}&days=${days}`;
      const r = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
      const d = await r.json();
      return { prices: (d.prices||[]).map(([t,p]) => ({ t, p: Math.round(p*10000)/10000 })) };
    } catch(e) { return { error: e.message }; }
  });
  return c.json(data);
});

// ─── SPO Dashboard API ──────────────────────────────
// Search pools by ticker or name
app.get("/pools/search/:q", async (c) => {
  const q = c.req.param("q");
  const data = await cached(`pool_search:${q}`, 120, async () => {
    const r = await pool.query(`
      SELECT ph.view as pool_id, ocpd.ticker_name as ticker, ocpd.json->>'name' as name,
             COALESCE(ps.stake, 0)::text as live_stake,
             COALESCE(ps.number_of_delegators, 0)::int as delegators
      FROM pool_hash ph
      ${POOL_META_JOIN}
      LEFT JOIN pool_stat ps ON ps.pool_hash_id = ph.id
        AND ps.epoch_no = (SELECT MAX(epoch_no) FROM pool_stat WHERE pool_hash_id = ph.id)
      WHERE (ocpd.ticker_name ILIKE $1 OR ocpd.json->>'name' ILIKE $1 OR ph.view ILIKE $1)
        AND NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))
      ORDER BY COALESCE(ps.stake, 0) DESC LIMIT 20
    `, [`%${q}%`]);
    return r.rows;
  });
  return c.json(data);
});

// Comprehensive SPO dashboard data for a pool
app.get("/dashboard/spo/:poolId", async (c) => {
  const poolId = c.req.param("poolId");
  const data = await cached(`spo_dash:${poolId}`, 120, async () => {
    // 1) Pool basic info
    const infoR = await pool.query(`
      SELECT ph.id as hash_id, ph.view as pool_id,
             ocpd.ticker_name as ticker, ocpd.json->>'name' as name,
             ocpd.json->>'description' as description, ocpd.json->>'homepage' as homepage
      FROM pool_hash ph
      ${POOL_META_JOIN}
      WHERE ph.view = $1
    `, [poolId]);
    if (!infoR.rows[0]) return null;
    const info = infoR.rows[0];
    const hashId = info.hash_id;

    // 2) Latest registration params
    const paramsR = await pool.query(`
      SELECT pu.pledge::text, pu.fixed_cost::text, pu.margin,
             sa.view as reward_address, pu.vrf_key_hash,
             encode(pu.meta_hash, 'hex') as meta_hash
      FROM pool_update pu
      LEFT JOIN stake_address sa ON sa.id = pu.reward_addr_id
      WHERE pu.hash_id = $1
      ORDER BY pu.registered_tx_id DESC LIMIT 1
    `, [hashId]);
    const params = paramsR.rows[0] || {};

    // 3) Pool stats history (last 20 epochs for trend)
    const statsR = await pool.query(`
      SELECT ps.epoch_no, ps.stake::text as active_stake,
             ps.number_of_delegators::int as delegators,
             ps.number_of_blocks::int as blocks
      FROM pool_stat ps
      WHERE ps.pool_hash_id = $1
      ORDER BY ps.epoch_no DESC LIMIT 20
    `, [hashId]);

    // 4) Recent blocks (last 50)
    const blocksR = await pool.query(`
      SELECT b.block_no, b.epoch_no, b.slot_no, b.time, b.tx_count, b.size,
             encode(b.hash,'hex') as hash
      FROM block b
      JOIN slot_leader sl ON b.slot_leader_id = sl.id
      WHERE sl.pool_hash_id = $1 AND b.block_no IS NOT NULL
      ORDER BY b.id DESC LIMIT 50
    `, [hashId]);

    // 5) Top delegators
    const delegR = await pool.query(`
      SELECT DISTINCT ON (d.addr_id) sa.view as stake_address,
             COALESCE(es.amount, 0)::text as delegated_amount
      FROM delegation d
      JOIN stake_address sa ON sa.id = d.addr_id
      LEFT JOIN epoch_stake es ON es.addr_id = d.addr_id
        AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
      WHERE d.pool_hash_id = $1
        AND NOT EXISTS (SELECT 1 FROM delegation d2 WHERE d2.addr_id = d.addr_id AND d2.tx_id > d.tx_id)
      ORDER BY d.addr_id, d.tx_id DESC
    `, [hashId]);
    // Sort by amount desc, take top 20
    const topDelegators = delegR.rows
      .sort((a, b) => { const d = BigInt(b.delegated_amount||"0") - BigInt(a.delegated_amount||"0"); return d > 0n ? 1 : d < 0n ? -1 : 0; })
      .slice(0, 20);

    // 6) Update history (registrations/re-registrations)
    const updR = await pool.query(`
      SELECT pu.pledge::text, pu.fixed_cost::text, pu.margin,
             b.epoch_no, b.time
      FROM pool_update pu
      JOIN tx t ON t.id = pu.registered_tx_id
      JOIN block b ON b.id = t.block_id
      WHERE pu.hash_id = $1
      ORDER BY pu.registered_tx_id DESC LIMIT 20
    `, [hashId]);

    // 7) Reward history
    const rewardR = await pool.query(`
      SELECT r.earned_epoch, SUM(r.amount)::text as total_reward, COUNT(*)::int as delegator_rewards
      FROM reward r
      WHERE r.pool_id = $1 AND r.type = 'leader'
      GROUP BY r.earned_epoch
      ORDER BY r.earned_epoch DESC LIMIT 20
    `, [hashId]);

    // 8) Fee income estimate (cost + margin * rewards for each epoch)
    const feeR = await pool.query(`
      SELECT r.earned_epoch,
             SUM(r.amount)::text as total_pool_rewards
      FROM reward r
      WHERE r.pool_id = $1 AND r.type IN ('leader','member')
      GROUP BY r.earned_epoch
      ORDER BY r.earned_epoch DESC LIMIT 20
    `, [hashId]);

    // 9) Check retirement
    const retireR = await pool.query(`
      SELECT pr.retiring_epoch, b.time as announced_time
      FROM pool_retire pr
      JOIN tx t ON t.id = pr.announced_tx_id
      JOIN block b ON b.id = t.block_id
      WHERE pr.hash_id = $1
      ORDER BY pr.id DESC LIMIT 1
    `, [hashId]);

    // 10) Governance votes by this pool
    const votesR = await pool.query(`
      SELECT vp.gov_action_proposal_id, vp.vote::text,
             gap.type::text as proposal_type,
             encode(gap_tx.hash, 'hex') as proposal_tx_hash, gap.index as proposal_index,
             b.time as vote_time
      FROM voting_procedure vp
      JOIN gov_action_proposal gap ON gap.id = vp.gov_action_proposal_id
      JOIN tx gap_tx ON gap_tx.id = gap.tx_id
      JOIN tx vt ON vt.id = vp.tx_id
      JOIN block b ON b.id = vt.block_id
      WHERE vp.voter_role = 'SPO'
        AND vp.committee_voter = $1
      ORDER BY vp.tx_id DESC LIMIT 50
    `, [hashId]);

    return {
      pool_id: info.pool_id, ticker: info.ticker, name: info.name,
      description: info.description, homepage: info.homepage,
      params, retirement: retireR.rows[0] || null,
      stats_history: statsR.rows.reverse(),
      recent_blocks: blocksR.rows,
      top_delegators: topDelegators,
      total_delegators: delegR.rows.length,
      update_history: updR.rows,
      reward_history: rewardR.rows.reverse(),
      fee_history: feeR.rows.reverse(),
      governance_votes: votesR.rows,
    };
  });
  if (!data) return notFound(c, "Pool");
  return c.json(data);
});

// Multi-pool aggregate (for SPOs running multiple pools)
app.get("/dashboard/spo-multi", async (c) => {
  const ids = (c.req.query("pools") || "").split(",").filter(Boolean).slice(0, 10);
  if (ids.length === 0) return c.json({ error: "Provide ?pools=pool1...,pool1..." }, 400);
  const key = `spo_multi:${ids.sort().join(",")}`;
  const data = await cached(key, 120, async () => {
    const results = [];
    for (const pid of ids) {
      const r = await pool.query(`
        SELECT ph.id as hash_id, ph.view as pool_id,
               ocpd.ticker_name as ticker, ocpd.json->>'name' as name,
               COALESCE(ps.stake, 0)::text as live_stake,
               COALESCE(ps.number_of_delegators, 0)::int as delegators,
               COALESCE(ps.number_of_blocks, 0)::int as lifetime_blocks
        FROM pool_hash ph
        ${POOL_META_JOIN}
        LEFT JOIN pool_stat ps ON ps.pool_hash_id = ph.id
          AND ps.epoch_no = (SELECT MAX(epoch_no) FROM pool_stat WHERE pool_hash_id = ph.id)
        WHERE ph.view = $1
      `, [pid]);
      if (r.rows[0]) results.push(r.rows[0]);
    }
    const totalStake = results.reduce((s, r) => s + BigInt(r.live_stake||"0"), BigInt(0));
    const totalDelegators = results.reduce((s, r) => s + (r.delegators||0), 0);
    const totalBlocks = results.reduce((s, r) => s + (r.lifetime_blocks||0), 0);
    return {
      pools: results,
      aggregate: {
        total_stake: totalStake.toString(),
        total_delegators: totalDelegators,
        total_lifetime_blocks: totalBlocks,
        pool_count: results.length,
      }
    };
  });
  return c.json(data);
});

// ─── Governance Dashboard API ───────────────────────
// Voting matrix: all votes on active proposals
app.get("/governance/voting-matrix", async (c) => {
  const data = await cached("gov_voting_matrix", 300, async () => {
    // Active/recent governance proposals
    const propsR = await pool.query(`
      SELECT gap.id, gap.type::text, gap.index,
             encode(tx.hash, 'hex') as tx_hash,
             gap.description as meta,
             b.time as proposed_time
      FROM gov_action_proposal gap
      JOIN tx ON tx.id = gap.tx_id
      JOIN block b ON b.id = tx.block_id
      WHERE gap.ratified_epoch IS NULL AND gap.dropped_epoch IS NULL AND gap.expired_epoch IS NULL
      ORDER BY gap.id DESC LIMIT 30
    `);

    // All votes on these proposals
    const propIds = propsR.rows.map(p => p.id);
    let votes = [];
    if (propIds.length > 0) {
      const votesR = await pool.query(`
        SELECT vp.gov_action_proposal_id as prop_id,
               vp.voter_role::text,
               CASE
                 WHEN vp.voter_role = 'DRep' THEN dh.view
                 WHEN vp.voter_role = 'SPO' THEN ph.view
                 WHEN vp.voter_role = 'ConstitutionalCommittee' THEN ch.raw::text
                 ELSE 'unknown'
               END as voter_id,
               vp.vote::text
        FROM voting_procedure vp
        LEFT JOIN drep_hash dh ON vp.drep_voter = dh.id
        LEFT JOIN pool_hash ph ON vp.committee_voter = ph.id
        LEFT JOIN committee_hash ch ON vp.committee_voter = ch.id AND vp.voter_role = 'ConstitutionalCommittee'
        WHERE vp.gov_action_proposal_id = ANY($1::bigint[])
      `, [propIds]);
      votes = votesR.rows;
    }

    // Vote summary per proposal
    const summaries = propsR.rows.map(p => {
      const pVotes = votes.filter(v => v.prop_id === p.id);
      const byRole = {};
      for (const v of pVotes) {
        if (!byRole[v.voter_role]) byRole[v.voter_role] = { yes: 0, no: 0, abstain: 0 };
        const key = v.vote === 'VoteYes' ? 'yes' : v.vote === 'VoteNo' ? 'no' : 'abstain';
        byRole[v.voter_role][key]++;
      }
      return { ...p, vote_summary: byRole, total_votes: pVotes.length };
    });

    return { proposals: summaries, all_votes: votes };
  });
  return c.json(data);
});

// Reward simulator data (protocol params + pool stats for calculation)
app.get("/governance/reward-params", async (c) => {
  const data = await cached("gov_reward_params", 600, async () => {
    const ppR = await pool.query(`
      SELECT ep.min_fee_a, ep.min_fee_b, ep.key_deposit::text, ep.pool_deposit::text,
             ep.max_epoch, ep.optimal_pool_count, ep.influence,
             ep.monetary_expand_rate, ep.treasury_growth_rate,
             ep.decentralisation, ep.min_pool_cost::text,
             ep.epoch_no
      FROM epoch_param ep ORDER BY ep.epoch_no DESC LIMIT 1
    `);
    const supplyR = await pool.query(`
      SELECT ap.reserves::text, ap.treasury::text, ap.rewards::text, ap.utxo::text
      FROM ada_pots ap ORDER BY ap.epoch_no DESC LIMIT 1
    `);
    const poolCountR = await pool.query(`
      SELECT COUNT(DISTINCT ps.pool_hash_id)::int as active_pools,
             SUM(ps.stake)::text as total_stake
      FROM pool_stat ps
      WHERE ps.epoch_no = (SELECT MAX(epoch_no) FROM pool_stat)
    `);
    return {
      protocol_params: ppR.rows[0] || {},
      ada_pots: supplyR.rows[0] || {},
      pool_stats: poolCountR.rows[0] || {},
    };
  });
  return c.json(data);
});

// ─── DRep Dashboard API ─────────────────────────────
// Comprehensive DRep dashboard
app.get("/dashboard/drep/:drepId", async (c) => {
  const drepId = c.req.param("drepId");
  const data = await cached(`drep_dash:${drepId}`, 120, async () => {
    // 1) DRep info
    const infoR = await pool.query(`
      SELECT dh.id as hash_id, dh.view as drep_id, dh.has_script,
             dr.deposit::text, dr.voting_anchor_id
      FROM drep_hash dh
      LEFT JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      WHERE dh.view = $1
    `, [drepId]);
    if (!infoR.rows[0]) return null;
    const info = infoR.rows[0];

    // 2) Delegation to this DRep
    const delegR = await pool.query(`
      SELECT COUNT(DISTINCT dv.addr_id)::int as delegator_count,
             COALESCE(SUM(es.amount), 0)::text as total_voting_power
      FROM delegation_vote dv
      LEFT JOIN epoch_stake es ON es.addr_id = dv.addr_id
        AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
      WHERE dv.drep_hash_id = $1
        AND NOT EXISTS (SELECT 1 FROM delegation_vote dv2 WHERE dv2.addr_id = dv.addr_id AND dv2.tx_id > dv.tx_id)
    `, [info.hash_id]);

    // 3) Voting history
    const votesR = await pool.query(`
      SELECT vp.gov_action_proposal_id, vp.vote::text,
             gap.type::text as proposal_type,
             encode(gap_tx.hash, 'hex') as proposal_tx_hash, gap.index as proposal_index,
             b.time as vote_time,
             va.url as anchor_url, encode(va.data_hash, 'hex') as anchor_hash
      FROM voting_procedure vp
      JOIN gov_action_proposal gap ON gap.id = vp.gov_action_proposal_id
      JOIN tx gap_tx ON gap_tx.id = gap.tx_id
      JOIN tx vt ON vt.id = vp.tx_id
      JOIN block b ON b.id = vt.block_id
      LEFT JOIN voting_anchor va ON va.id = vp.voting_anchor_id
      WHERE vp.voter_role = 'DRep' AND vp.drep_voter = $1
      ORDER BY vp.tx_id DESC LIMIT 100
    `, [info.hash_id]);

    // 4) Delegation trend (last 10 epochs)
    const trendR = await pool.query(`
      SELECT es.epoch_no,
             COUNT(DISTINCT dv.addr_id)::int as delegators,
             COALESCE(SUM(es.amount), 0)::text as voting_power
      FROM delegation_vote dv
      JOIN epoch_stake es ON es.addr_id = dv.addr_id
      WHERE dv.drep_hash_id = $1
        AND NOT EXISTS (SELECT 1 FROM delegation_vote dv2 WHERE dv2.addr_id = dv.addr_id AND dv2.tx_id > dv.tx_id)
        AND es.epoch_no >= (SELECT MAX(no)-10 FROM epoch)
      GROUP BY es.epoch_no
      ORDER BY es.epoch_no ASC
    `, [info.hash_id]);

    // 5) Registration anchor (metadata)
    let metadata = null;
    if (info.voting_anchor_id) {
      const anchorR = await pool.query(`
        SELECT va.url, encode(va.data_hash, 'hex') as data_hash
        FROM voting_anchor va WHERE va.id = $1
      `, [info.voting_anchor_id]);
      metadata = anchorR.rows[0] || null;
    }

    return {
      drep_id: info.drep_id, has_script: info.has_script, deposit: info.deposit,
      delegator_count: parseInt(delegR.rows[0]?.delegator_count || "0"),
      total_voting_power: delegR.rows[0]?.total_voting_power || "0",
      voting_history: votesR.rows,
      delegation_trend: trendR.rows,
      registration_metadata: metadata,
    };
  });
  if (!data) return notFound(c, "DRep");
  return c.json(data);
});

// DRep search
app.get("/dreps/search/:q", async (c) => {
  const q = c.req.param("q");
  const data = await cached(`drep_search:${q}`, 120, async () => {
    const r = await pool.query(`
      SELECT dh.view as drep_id, dh.has_script,
             COALESCE(ps.cnt, 0)::int as delegators
      FROM drep_hash dh
      LEFT JOIN (
        SELECT dv.drep_hash_id, COUNT(DISTINCT dv.addr_id) as cnt
        FROM delegation_vote dv
        WHERE NOT EXISTS (SELECT 1 FROM delegation_vote dv2 WHERE dv2.addr_id = dv.addr_id AND dv2.tx_id > dv.tx_id)
        GROUP BY dv.drep_hash_id
      ) ps ON ps.drep_hash_id = dh.id
      WHERE dh.view ILIKE $1
      ORDER BY COALESCE(ps.cnt, 0) DESC LIMIT 20
    `, [`%${q}%`]);
    return r.rows;
  });
  return c.json(data);
});

// ─── Chain Analyst Dashboard API ────────────────────
app.get("/dashboard/chain-overview", async (c) => {
  const data = await cached("chain_overview", 60, async () => {
    const [tipR, epochR, txR, poolR, drepR] = await Promise.all([
      pool.query(`SELECT block_no, epoch_no, slot_no, time FROM block ORDER BY id DESC LIMIT 1`),
      pool.query(`SELECT no, start_time, end_time, tx_count, blk_count, fees::text, out_sum::text FROM epoch ORDER BY no DESC LIMIT 5`),
      pool.query(`SELECT COUNT(*)::int as tx_24h FROM tx t JOIN block b ON b.id = t.block_id WHERE b.time >= NOW() - INTERVAL '24 hours'`),
      pool.query(`SELECT COUNT(DISTINCT ps.pool_hash_id)::int as active_pools FROM pool_stat ps WHERE ps.epoch_no = (SELECT MAX(epoch_no) FROM pool_stat)`),
      pool.query(`SELECT COUNT(DISTINCT dh.id)::int as active_dreps FROM drep_hash dh JOIN drep_registration dr ON dr.drep_hash_id = dh.id`),
    ]);
    return {
      tip: tipR.rows[0],
      recent_epochs: epochR.rows,
      tx_24h: txR.rows[0]?.tx_24h || 0,
      active_pools: poolR.rows[0]?.active_pools || 0,
      active_dreps: drepR.rows[0]?.active_dreps || 0,
    };
  });
  return c.json(data);
});

// ─── Blockfrost-compatible endpoints for governance dashboard ─────
// These endpoints return data in formats compatible with the governance
// dashboard frontend (originally built for Blockfrost API)

// GET /bf/dreps — All DReps with bech32 IDs, paginated Blockfrost-style
app.get("/bf/dreps", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const count = Math.min(parseInt(c.req.query("count") || "100"), 100);
  const offset = (page - 1) * count;
  const data = await cached(`bf_dreps:${page}:${count}`, 120, async () => {
    const r = await pool.query(`
      SELECT dh.view as drep_id,
             encode(dh.raw,'hex') as drep_hash,
             dh.has_script,
             dr.deposit::text,
             COALESCE(dd.amount, 0)::text as amount,
             va.url as anchor_url,
             COALESCE(vc.vote_count, 0)::int as vote_count
      FROM drep_hash dh
      JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      LEFT JOIN drep_distr dd ON dd.hash_id = dh.id
        AND dd.epoch_no = (SELECT MAX(epoch_no) FROM drep_distr WHERE hash_id = dh.id)
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as vote_count FROM voting_procedure vp WHERE vp.drep_voter = dh.id
      ) vc ON true
      LEFT JOIN voting_anchor va ON dr.voting_anchor_id = va.id
      WHERE (dr.deposit >= 0 OR dr.deposit IS NULL)
      ORDER BY COALESCE(dd.amount, 0) DESC
      LIMIT $1 OFFSET $2
    `, [count, offset]);
    return r.rows;
  });
  return c.json(data);
});

// GET /bf/drep/:id — DRep detail (supports both bech32 drep1... and hex)
app.get("/bf/drep/:id", async (c) => {
  const id = c.req.param("id");
  const isBech32 = id.startsWith("drep1") || id.startsWith("drep_script1");
  const data = await cached(`bf_drep:${id}`, 120, async () => {
    const whereClause = isBech32 ? "dh.view = $1" : "encode(dh.raw,'hex') = $1";
    const r = await pool.query(`
      SELECT dh.view as drep_id,
             encode(dh.raw,'hex') as drep_hash,
             dh.has_script,
             dr.deposit::text,
             COALESCE(dd.amount, 0)::text as amount,
             va.url as anchor_url,
             CASE
               WHEN EXISTS(SELECT 1 FROM drep_registration dr2 WHERE dr2.drep_hash_id = dh.id AND dr2.deposit < 0) THEN true
               ELSE false
             END as retired
      FROM drep_hash dh
      JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      LEFT JOIN drep_distr dd ON dd.hash_id = dh.id
        AND dd.epoch_no = (SELECT MAX(epoch_no) FROM drep_distr WHERE hash_id = dh.id)
      LEFT JOIN voting_anchor va ON dr.voting_anchor_id = va.id
      WHERE ${whereClause}
    `, [id]);
    if (!r.rows[0]) return null;

    // Delegation count
    const delR = await pool.query(`
      SELECT COUNT(DISTINCT dv.addr_id)::int as delegator_count
      FROM delegation_vote dv
      JOIN drep_hash dh ON dv.drep_hash_id = dh.id
      WHERE ${whereClause}
        AND dv.id = (SELECT MAX(id) FROM delegation_vote dv2 WHERE dv2.addr_id = dv.addr_id)
    `, [id]);

    return {
      ...r.rows[0],
      delegators: delR.rows[0]?.delegator_count || 0,
      expired: false,
    };
  });
  if (!data) return notFound(c, "DRep");
  return c.json(data);
});

// GET /bf/drep/:id/metadata — DRep metadata from anchor URL
app.get("/bf/drep/:id/metadata", async (c) => {
  const id = c.req.param("id");
  const isBech32 = id.startsWith("drep1") || id.startsWith("drep_script1");
  const data = await cached(`bf_drep_meta:${id}`, 600, async () => {
    const whereClause = isBech32 ? "dh.view = $1" : "encode(dh.raw,'hex') = $1";
    const r = await pool.query(`
      SELECT va.url as anchor_url, encode(va.data_hash,'hex') as anchor_hash
      FROM drep_hash dh
      JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      LEFT JOIN voting_anchor va ON dr.voting_anchor_id = va.id
      WHERE ${whereClause}
    `, [id]);
    if (!r.rows[0]?.anchor_url) return null;

    // Try to fetch metadata from anchor URL
    try {
      let url = r.rows[0].anchor_url;
      if (url.startsWith("ipfs://")) {
        url = "https://ipfs.io/ipfs/" + url.slice(7);
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      // Return in Blockfrost-compatible format
      return {
        drep_id: id,
        hex: r.rows[0].anchor_hash,
        url: r.rows[0].anchor_url,
        json_metadata: json,
      };
    } catch (e) {
      return null;
    }
  });
  return c.json(data);
});

// GET /bf/drep/:id/votes — All votes for a DRep, paginated
app.get("/bf/drep/:id/votes", async (c) => {
  const id = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1");
  const count = Math.min(parseInt(c.req.query("count") || "100"), 100);
  const offset = (page - 1) * count;
  const isBech32 = id.startsWith("drep1") || id.startsWith("drep_script1");
  const data = await cached(`bf_drep_votes:${id}:${page}`, 120, async () => {
    const whereClause = isBech32 ? "dh.view = $1" : "encode(dh.raw,'hex') = $1";
    const r = await pool.query(`
      SELECT encode(gtx.hash,'hex') as proposal_tx_hash,
             gap.index as proposal_cert_index,
             LOWER(vp.vote::text) as vote,
             gap.type::text as action_type,
             b.epoch_no as epoch,
             b.time as vote_time
      FROM voting_procedure vp
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      JOIN tx vtx ON vp.tx_id = vtx.id
      JOIN block b ON vtx.block_id = b.id
      JOIN drep_hash dh ON vp.drep_voter = dh.id
      WHERE ${whereClause}
      ORDER BY vp.id DESC
      LIMIT $2 OFFSET $3
    `, [id, count, offset]);
    return r.rows;
  });
  return c.json(data);
});

// GET /bf/proposal/:hash/:index — Proposal detail in Blockfrost format
app.get("/bf/proposal/:hash/:index", async (c) => {
  const hash = c.req.param("hash");
  const index = parseInt(c.req.param("index"));
  const data = await cached(`bf_proposal:${hash}:${index}`, 120, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as tx_hash,
             gap.index as cert_index,
             gap.type::text as governance_type,
             b.epoch_no as epoch,
             gap.expiration,
             gap.ratified_epoch,
             gap.enacted_epoch,
             gap.dropped_epoch,
             gap.expired_epoch,
             gap.description,
             ocvgad.title, ocvgad.abstract, ocvgad.motivation, ocvgad.rationale,
             va.url as anchor_url
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      LEFT JOIN voting_anchor va ON gap.voting_anchor_id = va.id
      WHERE encode(tx.hash,'hex') = $1 AND gap.index = $2
    `, [hash, index]);
    if (!r.rows[0]) return null;

    // Get vote tallies
    const votesR = await pool.query(`
      SELECT vp.voter_role::text, vp.vote::text, COUNT(*)::int as cnt
      FROM voting_procedure vp
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx ON gap.tx_id = tx.id
      WHERE encode(tx.hash,'hex') = $1 AND gap.index = $2
      GROUP BY vp.voter_role, vp.vote
    `, [hash, index]);

    const summary = {};
    for (const v of votesR.rows) {
      if (!summary[v.voter_role]) summary[v.voter_role] = { yes: 0, no: 0, abstain: 0 };
      const key = v.vote === 'VoteYes' ? 'yes' : v.vote === 'VoteNo' ? 'no' : 'abstain';
      summary[v.voter_role][key] = v.cnt;
    }

    return { ...r.rows[0], vote_summary: summary };
  });
  if (!data) return notFound(c, "Proposal");
  return c.json(data);
});

// GET /bf/proposal/:hash/:index/metadata — Proposal metadata
app.get("/bf/proposal/:hash/:index/metadata", async (c) => {
  const hash = c.req.param("hash");
  const index = parseInt(c.req.param("index"));
  const data = await cached(`bf_proposal_meta:${hash}:${index}`, 600, async () => {
    const r = await pool.query(`
      SELECT ocvgad.title, ocvgad.abstract, ocvgad.motivation, ocvgad.rationale,
             va.url as anchor_url, encode(va.data_hash,'hex') as anchor_hash
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      LEFT JOIN voting_anchor va ON gap.voting_anchor_id = va.id
      WHERE encode(tx.hash,'hex') = $1 AND gap.index = $2
    `, [hash, index]);
    if (!r.rows[0]) return null;
    // Return in Blockfrost-compatible format
    const row = r.rows[0];
    return {
      url: row.anchor_url,
      hash: row.anchor_hash,
      json_metadata: {
        body: {
          title: row.title || null,
          abstract: row.abstract || null,
          motivation: row.motivation || null,
          rationale: row.rationale || null,
        }
      }
    };
  });
  if (!data) return c.json(null);
  return c.json(data);
});

// GET /bf/governance-info — Comprehensive governance summary (for static data replacement)
app.get("/bf/governance-info", async (c) => {
  const data = await cached("bf_gov_info", 300, async () => {
    // Proposal summaries with vote tallies by role
    const propsR = await pool.query(`
      SELECT gap.id, gap.type::text, gap.index,
             encode(tx.hash, 'hex') as tx_hash,
             gap.expiration,
             gap.ratified_epoch, gap.enacted_epoch, gap.dropped_epoch, gap.expired_epoch,
             ocvgad.title, ocvgad.abstract,
             b.epoch_no as proposed_epoch,
             b.time as proposed_time
      FROM gov_action_proposal gap
      JOIN tx ON tx.id = gap.tx_id
      JOIN block b ON b.id = tx.block_id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      ORDER BY gap.id DESC
      LIMIT 200
    `);

    // All votes on these proposals
    const propIds = propsR.rows.map(p => p.id);
    let allVotes = [];
    if (propIds.length > 0) {
      const votesR = await pool.query(`
        SELECT vp.gov_action_proposal_id as prop_id,
               vp.voter_role::text,
               vp.vote::text,
               CASE
                 WHEN vp.drep_voter IS NOT NULL THEN dh.view
                 WHEN vp.pool_voter IS NOT NULL THEN ph.view
                 WHEN vp.committee_voter IS NOT NULL THEN 'committee_' || encode(ch.raw,'hex')
                 ELSE 'unknown'
               END as voter_id
        FROM voting_procedure vp
        LEFT JOIN drep_hash dh ON vp.drep_voter = dh.id
        LEFT JOIN pool_hash ph ON vp.pool_voter = ph.id
        LEFT JOIN committee_hash ch ON vp.committee_voter = ch.id
        WHERE vp.gov_action_proposal_id = ANY($1::bigint[])
      `, [propIds]);
      allVotes = votesR.rows;
    }

    // Build proposal summaries with vote counts per role
    const proposalSummaries = {};
    for (const p of propsR.rows) {
      const key = `${p.tx_hash}#${p.index}`;
      const pVotes = allVotes.filter(v => v.prop_id === p.id);
      const byRole = { drep: { yes: 0, no: 0, abstain: 0, yes_pct: 0, no_pct: 0 }, spo: { yes_votes_cast: 0, no_votes_cast: 0, yes_pct: 0, no_pct: 0 }, cc: { yes: 0, no: 0, abstain: 0 } };
      for (const v of pVotes) {
        const vote = v.vote === 'VoteYes' ? 'yes' : v.vote === 'VoteNo' ? 'no' : 'abstain';
        if (v.voter_role === 'DRep') byRole.drep[vote]++;
        else if (v.voter_role === 'SPO') {
          if (vote === 'yes') byRole.spo.yes_votes_cast++;
          else if (vote === 'no') byRole.spo.no_votes_cast++;
        }
        else if (v.voter_role === 'ConstitutionalCommittee') byRole.cc[vote]++;
      }
      // Calc percentages
      const drepTotal = byRole.drep.yes + byRole.drep.no + byRole.drep.abstain;
      if (drepTotal > 0) { byRole.drep.yes_pct = byRole.drep.yes / drepTotal * 100; byRole.drep.no_pct = byRole.drep.no / drepTotal * 100; }
      const spoTotal = byRole.spo.yes_votes_cast + byRole.spo.no_votes_cast;
      if (spoTotal > 0) { byRole.spo.yes_pct = byRole.spo.yes_votes_cast / spoTotal * 100; byRole.spo.no_pct = byRole.spo.no_votes_cast / spoTotal * 100; }
      proposalSummaries[key] = byRole;
    }

    // Protocol params
    const ppR = await pool.query(`SELECT * FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`);

    return {
      proposalSummaries,
      protocolParams: ppR.rows[0] || {},
      currentEpoch: ppR.rows[0]?.epoch_no || 0,
    };
  });
  return c.json(data);
});

// GET /bf/drep-stake-history — DRep stake distribution per epoch (for Stake Analytics)
app.get("/bf/drep-stake-history", async (c) => {
  const limit = getLimit(c, 100, 200);
  const topN = Math.min(parseInt(c.req.query("topN") || "10"), 50);
  const data = await cached(`bf_drep_stake_hist:${limit}:${topN}`, 600, async () => {
    // Get top N DReps by current voting power
    const topR = await pool.query(`
      SELECT dh.id as hash_id, dh.view as drep_id
      FROM drep_hash dh
      JOIN drep_registration dr ON dr.drep_hash_id = dh.id
        AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
      LEFT JOIN drep_distr dd ON dd.hash_id = dh.id
        AND dd.epoch_no = (SELECT MAX(epoch_no) FROM drep_distr WHERE hash_id = dh.id)
      WHERE (dr.deposit >= 0 OR dr.deposit IS NULL)
      ORDER BY COALESCE(dd.amount, 0) DESC
      LIMIT $1
    `, [topN]);

    const hashIds = topR.rows.map(r => r.hash_id);
    if (hashIds.length === 0) return { snapshots: [], dreps: [] };

    // Get stake history for these DReps
    const histR = await pool.query(`
      SELECT dd.epoch_no, dd.hash_id, dd.amount::text
      FROM drep_distr dd
      WHERE dd.hash_id = ANY($1::bigint[])
      ORDER BY dd.epoch_no DESC
      LIMIT $2
    `, [hashIds, limit * topN]);

    // Group by epoch
    const byEpoch = {};
    for (const row of histR.rows) {
      if (!byEpoch[row.epoch_no]) byEpoch[row.epoch_no] = {};
      const drep = topR.rows.find(d => d.hash_id === row.hash_id);
      if (drep) byEpoch[row.epoch_no][drep.drep_id] = row.amount;
    }

    const snapshots = Object.entries(byEpoch)
      .map(([epoch, stakes]) => ({ epoch: parseInt(epoch), stakes }))
      .sort((a, b) => a.epoch - b.epoch);

    return {
      snapshots,
      dreps: topR.rows.map(r => ({ drep_id: r.drep_id })),
    };
  });
  return c.json(data);
});

// ─── Debug: check DB table structure and DRep/CC name resolution ─
app.get("/bf/debug-schema", async (c) => {
  try {
    const result = {};

    // 1) How many rows in off_chain_vote_drep_data?
    try {
      const cnt = await pool.query(`SELECT COUNT(*) as cnt FROM off_chain_vote_drep_data`);
      result.off_chain_vote_drep_data_count = cnt.rows[0].cnt;
    } catch(e) { result.off_chain_vote_drep_data_error = e.message; }

    // 2) Sample DRep names from off_chain_vote_drep_data
    try {
      const sample = await pool.query(`SELECT ocvdd.id, ocvdd.off_chain_vote_data_id, ocvdd.given_name, ocvdd.image_url FROM off_chain_vote_drep_data ocvdd LIMIT 10`);
      result.drep_data_samples = sample.rows;
    } catch(e) { result.drep_data_samples_error = e.message; }

    // 3) Test the full DRep JOIN chain - how many get names?
    try {
      const test = await pool.query(`
        SELECT dh.view as drep_id, va.url as anchor_url, ocvd.id as ocvd_id, ocvdd.given_name
        FROM drep_hash dh
        JOIN drep_registration dr ON dr.drep_hash_id = dh.id
          AND dr.id = (SELECT MAX(id) FROM drep_registration WHERE drep_hash_id = dh.id)
        LEFT JOIN voting_anchor va ON dr.voting_anchor_id = va.id
        LEFT JOIN LATERAL (
          SELECT id FROM off_chain_vote_data WHERE voting_anchor_id = va.id ORDER BY id DESC LIMIT 1
        ) ocvd ON true
        LEFT JOIN LATERAL (
          SELECT given_name FROM off_chain_vote_drep_data WHERE off_chain_vote_data_id = ocvd.id LIMIT 1
        ) ocvdd ON true
        WHERE (dr.deposit >= 0 OR dr.deposit IS NULL)
        ORDER BY COALESCE((SELECT amount FROM drep_distr WHERE hash_id = dh.id ORDER BY epoch_no DESC LIMIT 1), 0) DESC
        LIMIT 30
      `);
      const withName = test.rows.filter(r => r.given_name);
      const withAnchor = test.rows.filter(r => r.anchor_url);
      const withOcvd = test.rows.filter(r => r.ocvd_id);
      result.drep_join_test = {
        total: test.rows.length,
        with_anchor_url: withAnchor.length,
        with_ocvd_id: withOcvd.length,
        with_given_name: withName.length,
        rows: test.rows.map(r => ({
          drep_id: r.drep_id?.slice(0, 25),
          has_anchor: !!r.anchor_url,
          has_ocvd: !!r.ocvd_id,
          name: r.given_name ? (typeof r.given_name === 'string' ? r.given_name.slice(0,40) : JSON.stringify(r.given_name).slice(0,40)) : null
        }))
      };
    } catch(e) { result.drep_join_test_error = e.message; }

    // 4) CC member name test (from JSON authors field)
    try {
      const ccTest = await pool.query(`
        SELECT encode(ch.raw,'hex') as cc_hash,
               COALESCE(vc.cnt, 0)::int as vote_count,
               auth.name as name,
               latest_vote.va_id
        FROM committee_member cm
        JOIN committee_hash ch ON cm.committee_hash_id = ch.id
        LEFT JOIN LATERAL (SELECT COUNT(*) as cnt FROM voting_procedure vp WHERE vp.committee_voter = ch.id) vc ON true
        LEFT JOIN LATERAL (
          SELECT vp2.voting_anchor_id as va_id FROM voting_procedure vp2
          WHERE vp2.committee_voter = ch.id AND vp2.voting_anchor_id IS NOT NULL
          ORDER BY vp2.id DESC LIMIT 1
        ) latest_vote ON true
        LEFT JOIN LATERAL (
          SELECT ocvd.json->'authors'->0->>'name' as name
          FROM off_chain_vote_data ocvd
          WHERE ocvd.voting_anchor_id = latest_vote.va_id
          AND ocvd.json->'authors'->0->>'name' IS NOT NULL
          ORDER BY ocvd.id DESC LIMIT 1
        ) auth ON true
        LIMIT 10
      `);
      const ccWithName = ccTest.rows.filter(r => r.name);
      result.cc_name_test = {
        total: ccTest.rows.length,
        with_va_id: ccTest.rows.filter(r => r.va_id).length,
        with_name: ccWithName.length,
        rows: ccTest.rows.map(r => ({
          cc_hash: r.cc_hash?.slice(0,16),
          votes: r.vote_count,
          has_va_id: !!r.va_id,
          name: r.name
        }))
      };
    } catch(e) { result.cc_name_test_error = e.message; }

    // 5) Check off_chain_vote_author table
    try {
      const authCnt = await pool.query(`SELECT COUNT(*) as cnt FROM off_chain_vote_author`);
      result.off_chain_vote_author_count = authCnt.rows[0].cnt;
      const authSample = await pool.query(`SELECT * FROM off_chain_vote_author LIMIT 5`);
      result.off_chain_vote_author_samples = authSample.rows;
    } catch(e) { result.off_chain_vote_author_error = e.message; }

    // 6) Alternative: check if off_chain_vote_data.json has DRep givenName
    try {
      const jsonTest = await pool.query(`
        SELECT ocvd.id, ocvd.voting_anchor_id,
               ocvd.json->'body'->'givenName' as json_given_name
        FROM off_chain_vote_data ocvd
        WHERE ocvd.json->'body'->'givenName' IS NOT NULL
        LIMIT 5
      `);
      result.json_given_name_test = {
        count_with_name: jsonTest.rows.length,
        samples: jsonTest.rows
      };
    } catch(e) { result.json_given_name_error = e.message; }

    return c.json(result);
  } catch(e) { return c.json({ error: e.message }); }
});

// ─── Dashboard Bundle: ALL governance data in one response (cached 30min) ─
app.get("/bf/dashboard-bundle", async (c) => {
  const data = await cached("bf_dashboard_bundle", 1800, async () => {
    console.time("dashboard-bundle");
    const t0 = Date.now();

    // Shared SQL fragments for rationale text extraction from off_chain_vote_data
    const RAT_COALESCE = `COALESCE(
      ocvd.json->'body'->>'comment', ocvd.json->'body'->'comment'->>'@value', ocvd.json->>'comment',
      ocvd.json->'body'->>'rationale', ocvd.json->'body'->>'rationaleStatement',
      ocvd.json->'body'->'rationaleStatement'->>'@value',
      ocvd.json->'body'->>'summary', ocvd.json->'body'->>'conclusion',
      ocvd.json->'body'->>'abstract', ocvd.json->>'abstract', ocvd.json->>'summary',
      ocvd.json->>'rationale', ocvd.json->>'rationaleStatement',
      ocvd.json->'body'->>'content', ocvd.json->>'content',
      ocvd.json->'body'->>'reason', ocvd.json->>'reason',
      ocvd.json->'body'->'references'->0->>'label'
    )`;
    const RAT_RAW_JSON = `CASE WHEN ocvd.json IS NOT NULL AND ${RAT_COALESCE} IS NULL THEN ocvd.json::text ELSE NULL END`;
    const RAT_JOIN = `LEFT JOIN voting_anchor va ON vp.voting_anchor_id = va.id
        LEFT JOIN LATERAL (
          SELECT json FROM off_chain_vote_data WHERE voting_anchor_id = va.id ORDER BY id DESC LIMIT 1
        ) ocvd ON true`;

    // ── Phase 1: Fire ALL independent queries in parallel ──
    const [drepsR, votesR, propsR, ccR, ccvR, spoVR, spoPoolR, ppR, drepRatR, ccRatR] = await Promise.all([
      // 1) DReps — CTE-optimized, no per-row subqueries
      pool.query(`
        WITH latest_reg AS (
          SELECT DISTINCT ON (drep_hash_id) id, drep_hash_id, deposit, voting_anchor_id
          FROM drep_registration ORDER BY drep_hash_id, id DESC
        ),
        latest_distr AS (
          SELECT DISTINCT ON (hash_id) hash_id, amount
          FROM drep_distr ORDER BY hash_id, epoch_no DESC
        ),
        vote_counts AS (
          SELECT drep_voter, COUNT(*) as vote_count FROM voting_procedure
          WHERE drep_voter IS NOT NULL GROUP BY drep_voter
        ),
        latest_ocvd AS (
          SELECT DISTINCT ON (voting_anchor_id) id, voting_anchor_id
          FROM off_chain_vote_data ORDER BY voting_anchor_id, id DESC
        )
        SELECT dh.view as drep_id, encode(dh.raw,'hex') as drep_hash, dh.has_script,
               lr.deposit::text, COALESCE(ld.amount, 0)::text as amount,
               va.url as anchor_url, COALESCE(vc.vote_count, 0)::int as vote_count,
               ocvdd.given_name as name, ocvdd.image_url as image_url
        FROM drep_hash dh
        JOIN latest_reg lr ON lr.drep_hash_id = dh.id
        LEFT JOIN latest_distr ld ON ld.hash_id = dh.id
        LEFT JOIN vote_counts vc ON vc.drep_voter = dh.id
        LEFT JOIN voting_anchor va ON lr.voting_anchor_id = va.id
        LEFT JOIN latest_ocvd locvd ON locvd.voting_anchor_id = va.id
        LEFT JOIN LATERAL (
          SELECT given_name, image_url FROM off_chain_vote_drep_data WHERE off_chain_vote_data_id = locvd.id LIMIT 1
        ) ocvdd ON true
        ORDER BY COALESCE(ld.amount, 0) DESC
      `).catch(e => { console.warn("[bundle] DReps error:", e.message); return { rows: [] }; }),

      // 2) All DRep votes
      pool.query(`
        SELECT dh.view as drep_id, encode(gtx.hash,'hex') as ptx, gap.index as pidx,
               LOWER(vp.vote::text) as vote, gap.type::text as atype
        FROM voting_procedure vp
        JOIN drep_hash dh ON vp.drep_voter = dh.id
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx gtx ON gap.tx_id = gtx.id
      `),

      // 3) All proposals with metadata
      pool.query(`
        SELECT encode(tx.hash,'hex') as tx_hash, gap.index as cert_index,
               gap.type::text as governance_type, b.epoch_no,
               gap.expiration, gap.ratified_epoch, gap.enacted_epoch, gap.dropped_epoch, gap.expired_epoch,
               ocvgad.title, ocvgad.abstract, va.url as anchor_url
        FROM gov_action_proposal gap
        JOIN tx ON gap.tx_id = tx.id
        JOIN block b ON b.id = tx.block_id
        LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
        LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
        LEFT JOIN voting_anchor va ON gap.voting_anchor_id = va.id
      `),

      // 4) CC Members — merge committee_member + voting CC from voting_procedure
      // Note: committee_member and voting_procedure may reference DIFFERENT committee_hash IDs
      // for the same CC member (same raw hash). We join on raw hash to unify them.
      pool.query(`
        WITH max_epoch AS (SELECT MAX(no) as no FROM epoch),
        -- All CC members from committee_member table (deduplicated, latest expiration)
        cm_members AS (
          SELECT DISTINCT ON (ch.raw) ch.raw, ch.has_script,
                 cm.expiration_epoch
          FROM committee_member cm
          JOIN committee_hash ch ON cm.committee_hash_id = ch.id
          ORDER BY ch.raw, cm.expiration_epoch DESC
        ),
        -- All CC members who voted (from voting_procedure)
        vp_members AS (
          SELECT ch.raw, ch.id as voter_id, COUNT(*) as vote_count
          FROM voting_procedure vp
          JOIN committee_hash ch ON vp.committee_voter = ch.id
          WHERE vp.committee_voter IS NOT NULL
          GROUP BY ch.raw, ch.id
        ),
        -- Latest voting anchor per voter for name lookup
        cc_latest_anchor AS (
          SELECT DISTINCT ON (vp.committee_voter) vp.committee_voter, vp.voting_anchor_id
          FROM voting_procedure vp
          WHERE vp.committee_voter IS NOT NULL AND vp.voting_anchor_id IS NOT NULL
          ORDER BY vp.committee_voter, vp.id DESC
        )
        SELECT encode(COALESCE(cm.raw, vpm.raw),'hex') as cc_hash,
               COALESCE(cm.has_script, false) as has_script,
               cm.expiration_epoch,
               CASE WHEN cm.expiration_epoch IS NULL THEN 'active'
                    WHEN cm.expiration_epoch <= me.no THEN 'expired' ELSE 'active' END as status,
               COALESCE(vpm.vote_count, 0)::int as vote_count,
               (SELECT COALESCE(
                  ocvd.json->'authors'->0->>'name',
                  ocvd.json->'body'->'authors'->0->>'name',
                  ocvd.json->>'name',
                  ocvd.json->'body'->>'name',
                  ocvd.json->'body'->'givenName'->>'@value',
                  ocvd.json->'body'->>'givenName'
                ) FROM off_chain_vote_data ocvd
                WHERE ocvd.voting_anchor_id = cla.voting_anchor_id
                AND (ocvd.json->'authors'->0->>'name' IS NOT NULL
                  OR ocvd.json->'body'->'authors'->0->>'name' IS NOT NULL
                  OR ocvd.json->>'name' IS NOT NULL
                  OR ocvd.json->'body'->>'name' IS NOT NULL
                  OR ocvd.json->'body'->'givenName'->>'@value' IS NOT NULL
                  OR ocvd.json->'body'->>'givenName' IS NOT NULL)
                ORDER BY ocvd.id DESC LIMIT 1) as name
        FROM cm_members cm
        FULL OUTER JOIN vp_members vpm ON vpm.raw = cm.raw
        CROSS JOIN max_epoch me
        LEFT JOIN cc_latest_anchor cla ON cla.committee_voter = vpm.voter_id
        ORDER BY cm.expiration_epoch DESC NULLS LAST, COALESCE(vpm.vote_count, 0) DESC
      `).catch(e => { console.warn("[bundle] CC error:", e.message); return { rows: [] }; }),

      // 5) CC Votes
      pool.query(`
        SELECT encode(ch.raw,'hex') as cc_hash,
               encode(gtx.hash,'hex') as proposal_tx_hash, gap.index as proposal_cert_index,
               LOWER(vp.vote::text) as vote
        FROM voting_procedure vp
        JOIN committee_hash ch ON vp.committee_voter = ch.id
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx gtx ON gap.tx_id = gtx.id
      `).catch(e => { console.warn("[bundle] CC votes error:", e.message); return { rows: [] }; }),

      // 6) SPO Votes
      pool.query(`
        SELECT ph.view as pool_id, encode(gtx.hash,'hex') as ptx, gap.index as pidx,
               LOWER(vp.vote::text) as vote
        FROM voting_procedure vp
        JOIN pool_hash ph ON vp.pool_voter = ph.id
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx gtx ON gap.tx_id = gtx.id
      `).catch(e => { console.warn("[bundle] SPO votes error:", e.message); return { rows: [] }; }),

      // 7) SPO Pool info (with active_stake from pool_stat)
      pool.query(`
        SELECT ph.view as pool_id, pod.ticker_name as ticker, pod.json->'name' as pool_name,
               dh_vote.view as pledge_drep,
               COALESCE(ps.stake, 0)::text as active_stake
        FROM pool_hash ph
        LEFT JOIN LATERAL (SELECT id FROM off_chain_pool_data WHERE pool_id = ph.id ORDER BY id DESC LIMIT 1) lm ON true
        LEFT JOIN off_chain_pool_data pod ON pod.id = lm.id
        LEFT JOIN LATERAL (
          SELECT stake FROM pool_stat WHERE pool_hash_id = ph.id ORDER BY epoch_no DESC LIMIT 1
        ) ps ON true
        LEFT JOIN LATERAL (
          SELECT pu.reward_addr_id FROM pool_update pu WHERE pu.hash_id = ph.id ORDER BY pu.id DESC LIMIT 1
        ) latest_pu ON true
        LEFT JOIN LATERAL (
          SELECT dv.drep_hash_id FROM delegation_vote dv WHERE dv.addr_id = latest_pu.reward_addr_id ORDER BY dv.id DESC LIMIT 1
        ) latest_dv ON true
        LEFT JOIN drep_hash dh_vote ON dh_vote.id = latest_dv.drep_hash_id
        WHERE ph.id IN (SELECT DISTINCT pool_voter FROM voting_procedure WHERE pool_voter IS NOT NULL)
      `).catch(e => { console.warn("[bundle] SPO pools error:", e.message); return { rows: [] }; }),

      // 8) Protocol params
      pool.query(`SELECT * FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`).catch(e => { console.warn("[bundle] Epoch param error:", e.message); return { rows: [] }; }),

      // 9) DRep rationales — uses shared RAT_COALESCE / RAT_RAW_JSON / RAT_JOIN
      pool.query(`
        SELECT dh.view as did, encode(gtx.hash,'hex') as ptx, gap.index as pidx,
               va.url as anchor_url, ${RAT_COALESCE} as rationale_text, ${RAT_RAW_JSON} as raw_json
        FROM voting_procedure vp
        JOIN drep_hash dh ON vp.drep_voter = dh.id
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx gtx ON gap.tx_id = gtx.id
        ${RAT_JOIN}
        WHERE va.id IS NOT NULL
      `).catch(e => { console.warn("[bundle] DRep rationales error:", e.message); return { rows: [] }; }),

      // 10) CC rationales — uses shared RAT_COALESCE / RAT_RAW_JSON / RAT_JOIN
      pool.query(`
        SELECT encode(ch.raw,'hex') as cid, encode(gtx.hash,'hex') as ptx, gap.index as pidx,
               va.url as anchor_url, ${RAT_COALESCE} as rationale_text, ${RAT_RAW_JSON} as raw_json
        FROM voting_procedure vp
        JOIN committee_hash ch ON vp.committee_voter = ch.id
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx gtx ON gap.tx_id = gtx.id
        ${RAT_JOIN}
        WHERE va.id IS NOT NULL
      `).catch(e => { console.warn("[bundle] CC rationales error:", e.message); return { rows: [] }; }),
    ]);
    console.log(`[bundle] All parallel queries done in ${Date.now()-t0}ms — DReps:${drepsR.rows.length} Votes:${votesR.rows.length} Props:${propsR.rows.length}`);

    // ── Phase 2: Process results (CPU only, no I/O) ──

    // Votes
    const votes = {};
    const propStubs = {};
    for (const r of votesR.rows) {
      const k = r.ptx + "#" + r.pidx;
      const flatKey = r.drep_id + "__" + k;
      const v = r.vote;
      votes[flatKey] = normalizeVote(v);
      if (!propStubs[k]) propStubs[k] = { proposal_id: k, tx_hash: r.ptx, cert_index: r.pidx, action_type: r.atype || 'Unknown' };
    }

    // Proposals
    const proposals = {};
    for (const r of propsR.rows) {
      const k = r.tx_hash + "#" + r.cert_index;
      proposals[k] = { ...propStubs[k], ...r, proposal_id: k, action_type: r.governance_type };
    }

    // CC Members — enrich names from GHA data (match by voted proposal overlap)
    let ccMembers = ccR.rows.map(r => ({ ...r, cc_id: r.cc_hash }));
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const ghaRes = await fetch('https://adatool.net/data/cc-members.json?v=' + Date.now(), { signal: ctrl.signal });
      clearTimeout(timer);
      if (ghaRes.ok) {
        const ghaCC = await ghaRes.json();
        // Build proposal sets for each DBSync CC member
        const dbCCProps = {};
        for (const r of ccvR.rows) {
          const pid = r.proposal_tx_hash + "#" + r.proposal_cert_index;
          if (!dbCCProps[r.cc_hash]) dbCCProps[r.cc_hash] = new Set();
          dbCCProps[r.cc_hash].add(pid);
        }
        // Match GHA CC members to DBSync by eligible_proposals overlap
        for (const gm of ghaCC) {
          if (!gm.name || !gm.eligible_proposals) continue;
          const ghaPropsSet = new Set(gm.eligible_proposals);
          let bestMatch = null, bestOverlap = 0;
          for (const [hash, propSet] of Object.entries(dbCCProps)) {
            let overlap = 0;
            for (const p of propSet) { if (ghaPropsSet.has(p)) overlap++; }
            if (overlap > bestOverlap) { bestOverlap = overlap; bestMatch = hash; }
          }
          if (bestMatch && bestOverlap >= 3) {
            const cm = ccMembers.find(c => c.cc_id === bestMatch);
            if (cm && !cm.name) {
              cm.name = gm.name;
              cm.eligible_proposals = gm.eligible_proposals;
              console.log(`[bundle] CC name matched: ${bestMatch.slice(0,12)}… → ${gm.name} (${bestOverlap} proposal overlap)`);
            }
          }
        }
      }
    } catch(e) { console.warn("[bundle] GHA CC name fetch failed:", e.message); }

    // Hardcoded CC name map for well-known members (hex hash prefix → name)
    const ccNameMap = {
      "df0e83bde65416dade5b1f97e7f115e105ccc5a2297588": "Input | Output (IOG)",
      "e8c03a03c0b2ddbea4195caf39f41e669f7d251ecf221f": "Cardano Foundation",
      "b6012034ba0a516ffdaebf1ad31dc1ceb88c94faedd109": "EMURGO",
      "6796d87d65ab0a20b9a3709c3d1624e6a4504ea6cf1280": "Intersect",
      "4012cab55e44e6a1bfc79e0ca1509d5478b0955ab8f0755": "Cardano Atlantic Council",
      "85c47dd4a3c81233e9e96d15c48a8cac13c104bf64": "Mike Hornan",
      "89ee15deeb45d272e62c51e44f8b97f66af65be8e6f788": "Adam Rusch",
      "ce0075f09ce3f41019fd34cc5b48075e3c3e5b559c2245": "Kevin Hammond",
      "db1bc3c3f99ce68977ceaf27ab4dd917123ef90e56ec76": "Tsz Wai Wu",
      "2f308c13e6a743dbb448c0a86122a3b5244e66d11c58f8": "Mercy Fordwoo",
    };
    for (const cm of ccMembers) {
      if (cm.name) continue;
      for (const [prefix, name] of Object.entries(ccNameMap)) {
        if (cm.cc_id && cm.cc_id.startsWith(prefix)) { cm.name = name; break; }
      }
    }

    // CC Votes
    const ccVotes = {};
    for (const r of ccvR.rows) {
      const propId = r.proposal_tx_hash + "#" + r.proposal_cert_index;
      ccVotes[r.cc_hash + "__" + propId] = normalizeVote(r.vote);
    }

    // SPO Votes
    const spoVotes = {};
    for (const r of spoVR.rows) {
      spoVotes[r.pool_id + "__" + r.ptx + "#" + r.pidx] = normalizeVote(r.vote);
    }

    // SPO Pools
    const spoPools = {};
    for (const r of spoPoolR.rows) {
      spoPools[r.pool_id] = { ticker: r.ticker, name: r.pool_name, pledge_drep: r.pledge_drep || null, active_stake: r.active_stake || "0" };
    }

    // Proposal summaries — compute vote percentages AND voting power per role
    const proposalSummaries = {};
    // Build DRep power map: drep_id -> amount (lovelace)
    const drepPowerMap = {};
    for (const d of drepsR.rows) { drepPowerMap[d.drep_id] = Number(d.amount) || 0; }
    const mkPS = () => ({ drep: { yes: 0, no: 0, abstain: 0, yes_pct: 0, no_pct: 0, yes_power: 0, no_power: 0, abstain_power: 0 }, spo: { yes_votes_cast: 0, no_votes_cast: 0, yes_pct: 0, no_pct: 0, yes_power: 0, no_power: 0 }, cc: { yes: 0, no: 0, abstain: 0, yes_pct: 0 } });
    // DRep votes per proposal (with power)
    for (const r of votesR.rows) {
      const k = r.ptx + "#" + r.pidx;
      if (!proposalSummaries[k]) proposalSummaries[k] = mkPS();
      const nv = normalizeVote(r.vote);
      const pw = drepPowerMap[r.drep_id] || 0;
      const d = proposalSummaries[k].drep;
      if (nv === 'Yes') { d.yes++; d.yes_power += pw; }
      else if (nv === 'No') { d.no++; d.no_power += pw; }
      else { d.abstain++; d.abstain_power += pw; }
    }
    // CC votes per proposal
    for (const r of ccvR.rows) {
      const k = r.proposal_tx_hash + "#" + r.proposal_cert_index;
      if (!proposalSummaries[k]) proposalSummaries[k] = mkPS();
      const nv = normalizeVote(r.vote);
      const cc = proposalSummaries[k].cc;
      if (nv === 'Yes') cc.yes++; else if (nv === 'No') cc.no++; else cc.abstain++;
    }
    // SPO votes per proposal (with power)
    for (const r of spoVR.rows) {
      const k = r.ptx + "#" + r.pidx;
      if (!proposalSummaries[k]) proposalSummaries[k] = mkPS();
      const nv = normalizeVote(r.vote);
      const pw = Number((spoPools[r.pool_id] || {}).active_stake || 0);
      const s = proposalSummaries[k].spo;
      if (nv === 'Yes') { s.yes_votes_cast++; s.yes_power += pw; }
      else if (nv === 'No') { s.no_votes_cast++; s.no_power += pw; }
    }
    // Calculate percentages
    for (const ps of Object.values(proposalSummaries)) {
      const dPT = ps.drep.yes_power + ps.drep.no_power + ps.drep.abstain_power;
      if (dPT > 0) { ps.drep.yes_pct = ps.drep.yes_power / dPT * 100; ps.drep.no_pct = ps.drep.no_power / dPT * 100; }
      const sPT = ps.spo.yes_power + ps.spo.no_power;
      if (sPT > 0) { ps.spo.yes_pct = ps.spo.yes_power / sPT * 100; ps.spo.no_pct = ps.spo.no_power / sPT * 100; }
      const cT = ps.cc.yes + ps.cc.no + ps.cc.abstain;
      if (cT > 0) { ps.cc.yes_pct = ps.cc.yes / cT * 100; }
    }

    // Gov info
    const govInfo = { protocolParams: ppR.rows[0] || {}, currentEpoch: ppR.rows[0]?.epoch_no || 0, proposalSummaries };

    // Simulator — build from votes already loaded
    const drepVoteCounts = {};
    let maxVotes = 0;
    for (const r of votesR.rows) {
      if (!r.drep_id) continue;
      drepVoteCounts[r.drep_id] = (drepVoteCounts[r.drep_id] || 0) + 1;
    }
    for (const vc of Object.values(drepVoteCounts)) { if (vc > maxVotes) maxVotes = vc; }
    const proposalExpirations = {};
    for (const [k, p] of Object.entries(proposals)) { if (p.expiration) proposalExpirations[k] = p.expiration; }
    const simulator = { drepVoteCounts, maxVotes, proposalExpirations, drepVotedProposals: {} };

    // DRep rationales — use DB text when available, server-side fetch for missing
    // Server-side fetch helpers (defined before use)
    const IPFS_GATEWAYS = ["https://ipfs.io/ipfs/", "https://dweb.link/ipfs/", "https://cf-ipfs.com/ipfs/", "https://gateway.pinata.cloud/ipfs/"];
    const extractRatFromJson = (json) => {
      if (!json) return null;
      const body = json.body || json;
      // CIP-100 fields
      const cip100 = body?.comment?.["@value"] || body?.comment || body?.rationale || body?.summary || body?.conclusion || body?.abstract || body?.content || body?.reason || json?.abstract || json?.summary || json?.rationale || json?.content;
      if (cip100) return typeof cip100 === 'object' ? JSON.stringify(cip100) : String(cip100);
      // CIP-136 fields
      const parts = [];
      if (body?.rationaleStatement) parts.push(typeof body.rationaleStatement === 'object' ? (body.rationaleStatement["@value"] || JSON.stringify(body.rationaleStatement)) : body.rationaleStatement);
      if (body?.precedentDiscussion) parts.push("Precedent: " + (typeof body.precedentDiscussion === 'object' ? (body.precedentDiscussion["@value"] || JSON.stringify(body.precedentDiscussion)) : body.precedentDiscussion));
      if (body?.counterargumentDiscussion) parts.push("Counterargument: " + (typeof body.counterargumentDiscussion === 'object' ? (body.counterargumentDiscussion["@value"] || JSON.stringify(body.counterargumentDiscussion)) : body.counterargumentDiscussion));
      if (body?.conclusion) parts.push("Conclusion: " + (typeof body.conclusion === 'object' ? (body.conclusion["@value"] || JSON.stringify(body.conclusion)) : body.conclusion));
      if (parts.length > 0) return parts.join('\n');
      // Fallback: any long string value
      const keys = Object.keys(body).filter(k => typeof body[k] === 'string' && body[k].length > 10);
      if (keys.length > 0) return keys.map(k => body[k]).join('\n');
      return null;
    };
    const fetchRatText = async (url, timeout = 8000) => {
      try {
        let u = url;
        const isIpfs = u.startsWith("ipfs://") || u.startsWith("ipfs:");
        const cid = isIpfs ? u.replace(/^ipfs:\/?\/?/, '') : null;
        if (isIpfs) u = IPFS_GATEWAYS[0] + cid;
        const tryFetch = async (fetchUrl) => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), timeout);
          const res = await fetch(fetchUrl, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
          clearTimeout(timer);
          if (!res.ok) return null;
          const json = await res.json();
          return extractRatFromJson(json);
        };
        // Try primary URL
        let text = await tryFetch(u);
        if (text) return text;
        // For IPFS: try other gateways
        if (cid) {
          for (let g = 1; g < IPFS_GATEWAYS.length; g++) {
            text = await tryFetch(IPFS_GATEWAYS[g] + cid);
            if (text) return text;
          }
        }
        return null;
      } catch { return null; }
    };
    // Shared rationale row processor: parses DB rows into { rationales, toFetch }
    const processRatRows = (rows, idField) => {
      const rationales = {};
      const toFetch = [];
      for (const r of rows) {
        const key = r[idField] + "__" + r.ptx + "#" + r.pidx;
        if (r.rationale_text) { rationales[key] = { text: r.rationale_text }; }
        else if (r.raw_json) {
          try {
            const j = typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : r.raw_json;
            const txt = extractRatFromJson(j);
            if (txt) { rationales[key] = { text: txt }; continue; }
          } catch(e) { /* ignore */ }
          if (r.anchor_url) toFetch.push({ key, url: r.anchor_url });
        } else if (r.anchor_url) { toFetch.push({ key, url: r.anchor_url }); }
      }
      return { rationales, toFetch };
    };
    const drep = processRatRows(drepRatR.rows, 'did');
    const cc = processRatRows(ccRatR.rows, 'cid');
    const drepRationales = drep.rationales;
    const ccRationales = cc.rationales;

    // Server-side fetch for rationales not in DB (batched, with timeout)
    const MAX_FETCH = 300;
    const allToFetch = [...drep.toFetch.slice(0, MAX_FETCH), ...cc.toFetch.slice(0, MAX_FETCH)];
    if (allToFetch.length > 0) {
      console.log(`[bundle] Server-side fetching ${allToFetch.length} rationale URLs...`);
      const drepKeySet = new Set(drep.toFetch.map(r => r.key));
      const BATCH = 20;
      for (let i = 0; i < allToFetch.length; i += BATCH) {
        const batch = allToFetch.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(async ({ key, url }) => ({ key, text: await fetchRatText(url) })));
        for (const { key, text } of results) {
          if (text) (drepKeySet.has(key) ? drepRationales : ccRationales)[key] = { text };
        }
      }
      console.log(`[bundle] Server-side fetch done. DRep rationales: ${Object.keys(drepRationales).length}, CC: ${Object.keys(ccRationales).length}`);
    }

    // ── Phase 3: Stake history (depends on drepsR) ──
    let stakeHistory = [];
    try {
      const topIds = drepsR.rows.slice(0, 50).map(r => r.drep_id);
      // Get hash_ids for top DReps
      if (topIds.length > 0) {
        const topR = await pool.query(`SELECT id as hash_id, view as drep_id FROM drep_hash WHERE view = ANY($1::text[])`, [topIds]);
        const hids = topR.rows.map(r => r.hash_id);
        if (hids.length > 0) {
          const hR = await pool.query(`SELECT dd.epoch_no, dd.hash_id, dd.amount::text FROM drep_distr dd WHERE dd.hash_id = ANY($1::bigint[]) ORDER BY dd.epoch_no`, [hids]);
          const byEpoch = {};
          for (const r of hR.rows) {
            if (!byEpoch[r.epoch_no]) byEpoch[r.epoch_no] = {};
            const d = topR.rows.find(x => x.hash_id === r.hash_id);
            if (d) byEpoch[r.epoch_no][d.drep_id] = r.amount;
          }
          const drepNameMap = {};
          for (const d of drepsR.rows) { drepNameMap[d.drep_id] = d.name || null; }
          stakeHistory = Object.entries(byEpoch).map(([epochStr, stakes]) => {
            const epoch = parseInt(epochStr);
            const top = Object.entries(stakes).map(([drep_id, amount]) => ({
              id: drep_id, name: drepNameMap[drep_id] || null, amount
            })).sort((a, b) => Number(b.amount) - Number(a.amount));
            const totalStake = top.reduce((s, d) => s + Number(d.amount), 0);
            return { epoch, total_stake: String(totalStake), drep_count: top.length, top };
          }).sort((a, b) => a.epoch - b.epoch);
        }
      }
    } catch(e) { console.warn("[bundle] Stake history error:", e.message); }

    console.timeEnd("dashboard-bundle");
    console.log(`[bundle] Total: ${Date.now()-t0}ms`);

    // Normalize DRep names — given_name may contain JSON-LD strings like {"@value": "Name"}
    const dreps = drepsR.rows.map(d => {
      if (d.name && typeof d.name === "object") {
        d.name = d.name["@value"] || d.name.givenName || JSON.stringify(d.name);
      } else if (typeof d.name === "string" && d.name.startsWith("{")) {
        try {
          const parsed = JSON.parse(d.name);
          d.name = parsed["@value"] || parsed.givenName || d.name;
        } catch {}
      }
      return d;
    });

    return {
      dreps,
      votes,
      proposals,
      govInfo,
      ccMembers,
      ccVotes,
      spoVotes,
      spoPools,
      simulator,
      stakeHistory,
      drepRationales,
      ccRationales,
      _ts: new Date().toISOString(),
    };
  });
  return c.json(data);
});

// ─── Bulk: all DRep votes + proposals in one query (fast full load) ─
app.get("/bf/all-votes", async (c) => {
  const data = await cached("bf_all_votes", 120, async () => {
    // All DRep votes with proposal info in one query
    const r = await pool.query(`
      SELECT dh.view as drep_id,
             encode(gtx.hash, 'hex') as proposal_tx_hash,
             gap.index as proposal_cert_index,
             LOWER(vp.vote::text) as vote,
             gap.type::text as action_type,
             b.epoch_no as epoch
      FROM voting_procedure vp
      JOIN drep_hash dh ON vp.drep_voter = dh.id
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      JOIN tx vtx ON vp.tx_id = vtx.id
      JOIN block b ON vtx.block_id = b.id
      ORDER BY vp.id DESC
    `);
    // Build votes map: { drep_id: { "hash#idx": "Yes"|"No"|"Abstain" } }
    // and proposals map: { "hash#idx": { tx_hash, cert_index, action_type } }
    const votes = {};
    const proposals = {};
    for (const row of r.rows) {
      const propId = `${row.proposal_tx_hash}#${row.proposal_cert_index}`;
      if (!votes[row.drep_id]) votes[row.drep_id] = {};
      votes[row.drep_id][propId] = normalizeVote(row.vote);
      if (!proposals[propId]) {
        proposals[propId] = {
          proposal_id: propId,
          tx_hash: row.proposal_tx_hash,
          cert_index: row.proposal_cert_index,
          action_type: row.action_type || 'Unknown',
        };
      }
    }
    return { votes, proposals, totalVotes: r.rows.length };
  });
  return c.json(data);
});

// ─── Bulk: all proposals with details (fast full load) ──────────────
app.get("/bf/all-proposals", async (c) => {
  const data = await cached("bf_all_proposals", 120, async () => {
    const r = await pool.query(`
      SELECT encode(tx.hash,'hex') as tx_hash,
             gap.index as cert_index,
             gap.type::text as governance_type,
             b.epoch_no as epoch,
             gap.expiration,
             gap.ratified_epoch, gap.enacted_epoch, gap.dropped_epoch, gap.expired_epoch,
             gap.description,
             ocvgad.title, ocvgad.abstract, ocvgad.motivation, ocvgad.rationale,
             va.url as anchor_url
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      JOIN block b ON tx.block_id = b.id
      LEFT JOIN off_chain_vote_data ocvd ON ocvd.voting_anchor_id = gap.voting_anchor_id
      LEFT JOIN off_chain_vote_gov_action_data ocvgad ON ocvgad.off_chain_vote_data_id = ocvd.id
      LEFT JOIN voting_anchor va ON gap.voting_anchor_id = va.id
      ORDER BY gap.id DESC
    `);
    const proposals = {};
    for (const row of r.rows) {
      const key = `${row.tx_hash}#${row.cert_index}`;
      proposals[key] = {
        proposal_id: key,
        tx_hash: row.tx_hash,
        cert_index: row.cert_index,
        action_type: row.governance_type,
        governance_type: row.governance_type,
        expiration: row.expiration,
        ratified_epoch: row.ratified_epoch,
        enacted_epoch: row.enacted_epoch,
        dropped_epoch: row.dropped_epoch,
        expired_epoch: row.expired_epoch,
        title: row.title || null,
        abstract: row.abstract || null,
        anchor_url: row.anchor_url,
      };
    }
    return proposals;
  });
  return c.json(data);
});

// ─── CC Members (replaces cc-members.json from Koios) ──────────────
app.get("/bf/cc-members", async (c) => {
  const data = await cached("bf_cc_members", 300, async () => {
    const r = await pool.query(`
      SELECT encode(ch.raw, 'hex') as cc_hash,
             ch.has_script,
             cm.expiration_epoch,
             CASE
               WHEN cm.expiration_epoch <= (SELECT MAX(no) FROM epoch) THEN 'expired'
               ELSE 'active'
             END as status
      FROM committee_member cm
      JOIN committee_hash ch ON cm.committee_hash_id = ch.id
      ORDER BY cm.expiration_epoch DESC
    `);
    return r.rows;
  });
  return c.json(data);
});

// ─── CC Votes (replaces cc-votes.json from Koios) ──────────────────
app.get("/bf/cc-votes", async (c) => {
  const data = await cached("bf_cc_votes", 300, async () => {
    const r = await pool.query(`
      SELECT encode(ch.raw, 'hex') as cc_hash,
             ch.has_script,
             encode(gtx.hash, 'hex') as proposal_tx_hash,
             gap.index as proposal_cert_index,
             gap.type::text as action_type,
             LOWER(vp.vote::text) as vote,
             b.epoch_no as epoch,
             b.time as vote_time
      FROM voting_procedure vp
      JOIN committee_hash ch ON vp.committee_voter = ch.id
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      JOIN tx vtx ON vp.tx_id = vtx.id
      JOIN block b ON vtx.block_id = b.id
      ORDER BY vp.id DESC
      LIMIT 5000
    `);
    // Group by cc_hash → { cc_hash: [ { proposal_id, vote, ... } ] }
    const byCC = {};
    for (const row of r.rows) {
      if (!byCC[row.cc_hash]) byCC[row.cc_hash] = { cc_hash: row.cc_hash, has_script: row.has_script, votes: [] };
      byCC[row.cc_hash].votes.push({
        proposal_tx_hash: row.proposal_tx_hash,
        proposal_cert_index: row.proposal_cert_index,
        action_type: row.action_type,
        vote: row.vote,
        epoch: row.epoch,
        vote_time: row.vote_time,
      });
    }
    return Object.values(byCC);
  });
  return c.json(data);
});

// ─── SPO Votes (replaces spo-votes.json from Koios) ────────────────
app.get("/bf/spo-votes", async (c) => {
  const data = await cached("bf_spo_votes", 300, async () => {
    const r = await pool.query(`
      SELECT ph.view as pool_id,
             encode(gtx.hash, 'hex') as proposal_tx_hash,
             gap.index as proposal_cert_index,
             gap.type::text as action_type,
             LOWER(vp.vote::text) as vote,
             b.epoch_no as epoch
      FROM voting_procedure vp
      JOIN pool_hash ph ON vp.pool_voter = ph.id
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      JOIN tx vtx ON vp.tx_id = vtx.id
      JOIN block b ON vtx.block_id = b.id
      ORDER BY vp.id DESC
      LIMIT 20000
    `);
    // Group by pool_id
    const byPool = {};
    for (const row of r.rows) {
      if (!byPool[row.pool_id]) byPool[row.pool_id] = [];
      byPool[row.pool_id].push({
        proposal_tx_hash: row.proposal_tx_hash,
        proposal_cert_index: row.proposal_cert_index,
        action_type: row.action_type,
        vote: row.vote,
        epoch: row.epoch,
      });
    }
    return byPool;
  });
  return c.json(data);
});

// ─── SPO Pool Info (replaces spo-pools.json from Koios) ────────────
app.get("/bf/spo-pools", async (c) => {
  const data = await cached("bf_spo_pools", 600, async () => {
    try {
      const r = await pool.query(`
        SELECT ph.view as pool_id,
               pod.ticker_name as ticker,
               pod.json->'name' as pool_name
        FROM pool_hash ph
        LEFT JOIN LATERAL (
          SELECT opr.id FROM off_chain_pool_data opr
          WHERE opr.pool_id = ph.id ORDER BY opr.id DESC LIMIT 1
        ) latest_meta ON true
        LEFT JOIN off_chain_pool_data pod ON pod.id = latest_meta.id
        WHERE ph.id IN (
          SELECT DISTINCT vp.pool_voter FROM voting_procedure vp WHERE vp.pool_voter IS NOT NULL
        )
      `);
      const result = {};
      for (const row of r.rows) {
        result[row.pool_id] = {
          ticker: row.ticker || null,
          name: row.pool_name || null,
          active_stake: "0",
          blocks: 0,
        };
      }
      return result;
    } catch (e) {
      console.error("SPO pools query error:", e.message);
      return {};
    }
  });
  return c.json(data);
});

// ─── DRep Rationales (replaces drep-rationales.json) ────────────────
app.get("/bf/drep-rationales", async (c) => {
  const data = await cached("bf_drep_rationales", 600, async () => {
    // Get vote rationales from voting anchors attached to voting_procedure
    const r = await pool.query(`
      SELECT dh.view as drep_id,
             encode(gtx.hash, 'hex') as proposal_tx_hash,
             gap.index as proposal_cert_index,
             va.url as anchor_url
      FROM voting_procedure vp
      JOIN drep_hash dh ON vp.drep_voter = dh.id
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      LEFT JOIN voting_anchor va ON vp.voting_anchor_id = va.id
      WHERE va.url IS NOT NULL
      ORDER BY vp.id DESC
      LIMIT 10000
    `);
    // Group by drep_id → { proposal_id: anchor_url }
    const byDrep = {};
    for (const row of r.rows) {
      if (!byDrep[row.drep_id]) byDrep[row.drep_id] = {};
      const key = `${row.proposal_tx_hash}#${row.proposal_cert_index}`;
      byDrep[row.drep_id][key] = row.anchor_url;
    }
    return byDrep;
  });
  return c.json(data);
});

// ─── CC Rationales (replaces cc-rationales.json) ────────────────────
app.get("/bf/cc-rationales", async (c) => {
  const data = await cached("bf_cc_rationales", 600, async () => {
    const r = await pool.query(`
      SELECT encode(ch.raw, 'hex') as cc_hash,
             encode(gtx.hash, 'hex') as proposal_tx_hash,
             gap.index as proposal_cert_index,
             va.url as anchor_url
      FROM voting_procedure vp
      JOIN committee_hash ch ON vp.committee_voter = ch.id
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
      LEFT JOIN voting_anchor va ON vp.voting_anchor_id = va.id
      WHERE va.url IS NOT NULL
      ORDER BY vp.id DESC
      LIMIT 5000
    `);
    const byCC = {};
    for (const row of r.rows) {
      if (!byCC[row.cc_hash]) byCC[row.cc_hash] = {};
      const key = `${row.proposal_tx_hash}#${row.proposal_cert_index}`;
      byCC[row.cc_hash][key] = row.anchor_url;
    }
    return byCC;
  });
  return c.json(data);
});

// ─── Simulator data (replaces simulator.json) ───────────────────────
app.get("/bf/simulator", async (c) => {
  const data = await cached("bf_simulator", 300, async () => {
    // DRep vote counts and proposal expirations for reward simulator
    const votesR = await pool.query(`
      SELECT dh.view as drep_id, COUNT(*)::int as vote_count
      FROM voting_procedure vp
      JOIN drep_hash dh ON vp.drep_voter = dh.id
      GROUP BY dh.view
    `);
    const drepVoteCounts = {};
    let maxVotes = 0;
    for (const row of votesR.rows) {
      drepVoteCounts[row.drep_id] = row.vote_count;
      if (row.vote_count > maxVotes) maxVotes = row.vote_count;
    }

    // Proposal expirations
    const expR = await pool.query(`
      SELECT encode(tx.hash, 'hex') as tx_hash, gap.index,
             gap.expiration
      FROM gov_action_proposal gap
      JOIN tx ON gap.tx_id = tx.id
      WHERE gap.expiration IS NOT NULL
    `);
    const proposalExpirations = {};
    for (const row of expR.rows) {
      proposalExpirations[`${row.tx_hash}#${row.index}`] = row.expiration;
    }

    // DRep voted proposals
    const dvpR = await pool.query(`
      SELECT dh.view as drep_id,
             encode(gtx.hash, 'hex') as tx_hash,
             gap.index
      FROM voting_procedure vp
      JOIN drep_hash dh ON vp.drep_voter = dh.id
      JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
      JOIN tx gtx ON gap.tx_id = gtx.id
    `);
    const drepVotedProposals = {};
    for (const row of dvpR.rows) {
      if (!drepVotedProposals[row.drep_id]) drepVotedProposals[row.drep_id] = [];
      drepVotedProposals[row.drep_id].push(`${row.tx_hash}#${row.index}`);
    }

    return { drepVoteCounts, maxVotes, proposalExpirations, drepVotedProposals };
  });
  return c.json(data);
});

// ─── Start ─────────────────────────────────────────
const port = parseInt(process.env.PORT || "3001");
serve({ fetch: app.fetch, port }, () => {
  console.log(`ADAtool API listening on port ${port}`);
  // Auto-warm cache on startup — run in background so server starts immediately
  const warmCache = () => {
    console.log("[warmup] Pre-loading dashboard-bundle cache...");
    fetch(`http://localhost:${port}/bf/dashboard-bundle`)
      .then(r => r.json())
      .then(d => console.log(`[warmup] Cache warm! DReps: ${d.dreps?.length}, Proposals: ${Object.keys(d.proposals||{}).length}`))
      .catch(e => console.warn("[warmup] Failed:", e.message));
  };
  setTimeout(warmCache, 2000);
  // Auto-refresh cache every 25min (before 30min TTL expires) so users always get cache hits
  setInterval(warmCache, 25 * 60 * 1000);
});

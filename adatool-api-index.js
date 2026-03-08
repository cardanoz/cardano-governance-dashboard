import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import pkg from "./db/pool.js";
const pool = pkg;
import cachePkg from "./cache/redis.js";
const { cached } = cachePkg;

const app = new Hono();

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

    let name_ascii = null;
    try {
      const buf = Buffer.from(asset.asset_name, 'hex');
      const str = buf.toString('utf8');
      if (/^[\x20-\x7E]+$/.test(str)) name_ascii = str;
    } catch {}

    return {
      ...asset,
      name_ascii,
      total_supply: supplyR.rows[0]?.total_supply || "0",
      mint_count: supplyR.rows[0]?.mint_count || 0,
      holder_count: holdersR.rows[0]?.holder_count || 0,
      mint_history: mintR.rows,
    };
  });
  if (!data) return c.json({ error: "Asset not found" }, 404);
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
  if (!data) return c.json({ error: "DRep not found" }, 404);
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
  if (!data) return c.json({ error: "Action not found" }, 404);
  return c.json(data);
});

// ─── Whale Tracker (large TXs) ────────────────────
app.get("/whales", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
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
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 200);
  const data = await cached(`richlist:${limit}`, 600, async () => {
    const r = await pool.query(`
      SELECT sa.view as stake_address,
             sa.view as address,
             es.amount::text as balance,
             0 as utxo_count
      FROM epoch_stake es
      JOIN stake_address sa ON es.addr_id = sa.id
      WHERE es.epoch_no = (SELECT MAX(no) FROM epoch)
      ORDER BY es.amount DESC
      LIMIT $1
    `, [limit]);
    return r.rows;
  });
  return c.json(data);
});

// ─── TX Volume (daily aggregates) ─────────────────
app.get("/tx-volume", async (c) => {
  const days = Math.min(parseInt(c.req.query("days") || "30"), 90);
  const data = await cached(`txvol:${days}`, 300, async () => {
    // Use two separate fast queries instead of one heavy join
    const blocksR = await pool.query(`
      SELECT time::date as date,
             COUNT(*)::int as block_count,
             SUM(tx_count)::int as tx_count,
             SUM(fees)::text as total_fees
      FROM block
      WHERE time >= NOW() - ($1 || ' days')::interval
        AND block_no IS NOT NULL
      GROUP BY time::date
      ORDER BY date ASC
    `, [days]);
    // block table already has tx_count and fees per block
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
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
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
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 200);
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
    const r = await pool.query(`
      SELECT ep.*, ep.epoch_no
      FROM epoch_param ep
      ORDER BY ep.epoch_no DESC
      LIMIT 1
    `);
    if (!r.rows[0]) return null;
    const p = r.rows[0];

    // Try to get Conway governance params
    let govParams = {};
    try {
      const gp = await pool.query(`
        SELECT drep_deposit::text, gov_action_deposit::text, drep_activity,
               gov_action_lifetime, committee_min_size, committee_max_term_length,
               dvt_motion_no_confidence, dvt_committee_normal,
               dvt_hard_fork_initiation, dvt_p_p_economic_group,
               dvt_p_p_technical_group, dvt_treasury_withdrawal,
               pvt_motion_no_confidence, pvt_committee_normal,
               pvt_hard_fork_initiation
        FROM epoch_param WHERE epoch_no = $1
      `, [p.epoch_no]);
      if (gp.rows[0]) govParams = gp.rows[0];
    } catch {}

    return {
      epoch_no: p.epoch_no,
      min_fee_a: p.min_fee_a, min_fee_b: p.min_fee_b,
      max_block_size: p.max_block_size, max_tx_size: p.max_tx_size,
      key_deposit: p.key_deposit?.toString() || "0",
      pool_deposit: p.pool_deposit?.toString() || "0",
      min_pool_cost: p.min_pool_cost?.toString() || "0",
      max_block_ex_mem: p.max_block_ex_mem?.toString() || "0",
      max_block_ex_steps: p.max_block_ex_steps?.toString() || "0",
      max_tx_ex_mem: p.max_tx_ex_mem?.toString() || "0",
      max_tx_ex_steps: p.max_tx_ex_steps?.toString() || "0",
      collateral_percent: p.collateral_percent || 0,
      price_mem: p.price_mem, price_step: p.price_step,
      max_val_size: p.max_val_size || 0,
      max_collateral_inputs: p.max_collateral_inputs || 0,
      protocol_major: p.protocol_major, protocol_minor: p.protocol_minor,
      coins_per_utxo_size: p.coins_per_utxo_size?.toString() || "0",
      ...govParams,
    };
  });
  if (!data) return c.json({ error: "No params found" }, 404);
  return c.json(data);
});

// ─── Stake Distribution ───────────────────────────
app.get("/stake-distribution", async (c) => {
  const data = await cached("stake-dist", 600, async () => {
    // Get basic stats from epoch_stake for current epoch
    const statsR = await pool.query(`
      SELECT SUM(amount)::text as total_staked,
             COUNT(DISTINCT addr_id)::int as total_stakers,
             AVG(amount)::text as avg_stake
      FROM epoch_stake
      WHERE epoch_no = (SELECT MAX(no) FROM epoch)
    `);
    const stats = statsR.rows[0] || {};

    // Median approximation via percentile
    let medianStake = "0";
    try {
      const medR = await pool.query(`
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount)::text as median
        FROM epoch_stake
        WHERE epoch_no = (SELECT MAX(no) FROM epoch)
      `);
      medianStake = medR.rows[0]?.median || "0";
    } catch {}

    // Distribution buckets
    const bucketsR = await pool.query(`
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
      WHERE epoch_no = (SELECT MAX(no) FROM epoch)
      GROUP BY
        CASE
          WHEN amount < 100000000 THEN 1
          WHEN amount < 1000000000 THEN 2
          WHEN amount < 10000000000 THEN 3
          WHEN amount < 100000000000 THEN 4
          WHEN amount < 1000000000000 THEN 5
          ELSE 6
        END,
        CASE
          WHEN amount < 100000000 THEN '< 100 ADA'
          WHEN amount < 1000000000 THEN '100 - 1K ADA'
          WHEN amount < 10000000000 THEN '1K - 10K ADA'
          WHEN amount < 100000000000 THEN '10K - 100K ADA'
          WHEN amount < 1000000000000 THEN '100K - 1M ADA'
          ELSE '> 1M ADA'
        END
      ORDER BY 1
    `);

    return {
      total_staked: stats.total_staked || "0",
      total_stakers: stats.total_stakers || 0,
      avg_stake: stats.avg_stake || "0",
      median_stake: medianStake,
      buckets: bucketsR.rows,
    };
  });
  return c.json(data);
});

// ─── Constitutional Committee ─────────────────────
app.get("/committee", async (c) => {
  const data = await cached("committee", 300, async () => {
    // Get CC members
    const r = await pool.query(`
      SELECT encode(ch.raw, 'hex') as cc_hash,
             ch.has_script,
             cm.expiration_epoch,
             CASE
               WHEN cm.expiration_epoch <= (SELECT MAX(no) FROM epoch) THEN 'Expired'
               ELSE 'Active'
             END as status,
             COALESCE(encode(cha.raw, 'hex'), null) as hot_key,
             COALESCE(vc.vote_count, 0)::int as vote_count,
             COALESCE(vc.yes_votes, 0)::int as yes_votes,
             COALESCE(vc.no_votes, 0)::int as no_votes,
             COALESCE(vc.abstain_votes, 0)::int as abstain_votes
      FROM committee_member cm
      JOIN committee_hash ch ON cm.committee_hash_id = ch.id
      LEFT JOIN committee_de_registration cdr ON cdr.cold_key_id = ch.id
      LEFT JOIN committee_registration cr ON cr.cold_key_id = ch.id
      LEFT JOIN committee_hash cha ON cr.hot_key_id = cha.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as vote_count,
               COUNT(*) FILTER (WHERE vote = 'Yes') as yes_votes,
               COUNT(*) FILTER (WHERE vote = 'No') as no_votes,
               COUNT(*) FILTER (WHERE vote = 'Abstain') as abstain_votes
        FROM voting_procedure vp
        WHERE vp.committee_voter = ch.id
      ) vc ON true
      WHERE cdr.id IS NULL
      ORDER BY cm.expiration_epoch DESC
    `);

    // Get threshold
    let threshold = 0.67;
    try {
      const tR = await pool.query(`
        SELECT committee_normal_state_threshold
        FROM epoch_param
        ORDER BY epoch_no DESC LIMIT 1
      `);
      if (tR.rows[0]?.committee_normal_state_threshold) {
        threshold = tR.rows[0].committee_normal_state_threshold;
      }
    } catch {}

    const members = r.rows;
    return {
      threshold,
      members,
      total_members: members.length,
      active_members: members.filter((m: any) => m.status === "Active").length,
    };
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

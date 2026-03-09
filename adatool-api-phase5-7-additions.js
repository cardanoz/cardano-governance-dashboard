// ─── Phase 5: Votes ───
app.get("/votes", async (c) => {
  try {
    const data = await cached("votes", 60, async () => {
      const result = await pool.query(`
        SELECT
          vp.voter_role,
          vp.vote,
          gap.type AS action_type,
          vp.voter_hash::text AS voter_id,
          gap.tx_id,
          t.hash AS tx_hash,
          b.block_no,
          b.time
        FROM voting_procedure vp
        JOIN gov_action_proposal gap ON vp.gov_action_proposal_id = gap.id
        JOIN tx t ON gap.tx_id = t.id
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

// ─── Phase 5: DRep Delegations ───
app.get("/drep-delegations", async (c) => {
  try {
    const data = await cached("drep_delegations", 120, async () => {
      const result = await pool.query(`
        SELECT
          sa.view AS delegator_address,
          dv.drep_hash::text,
          t.hash AS tx_hash,
          b.time,
          b.block_no
        FROM delegation_vote dv
        JOIN stake_address sa ON dv.addr_id = sa.id
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
          SELECT
            script_hash::text,
            anchor_url,
            anchor_hash::text
          FROM constitution
          ORDER BY id DESC
          LIMIT 1
        `);
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch {
        // Try off_chain_vote_data if constitution table doesn't exist
        const fallback = await pool.query(`
          SELECT
            url AS anchor_url,
            hash::text AS anchor_hash
          FROM off_chain_vote_data
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
            t.hash AS action_tx_hash,
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
          t.hash AS tx_hash,
          tm.key::text,
          tm.json AS json_value,
          b.time,
          b.block_no
        FROM tx_metadata tm
        JOIN tx t ON tm.tx_id = t.id
        JOIN block b ON t.block_id = b.id
      `;

      if (keyFilter) {
        query += ` WHERE tm.key = $1`;
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
          t.hash AS tx_hash,
          b.time AS block_time,
          t.fee::text,
          t.script_size,
          (SELECT COUNT(*) FROM redeemer WHERE redeemer.tx_id = t.id)::int AS redeemer_count,
          STRING_AGG(DISTINCT r.purpose, ', ') AS redeemer_purposes
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
          t.hash AS tx_hash,
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
          t.hash AS tx_hash,
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
          COALESCE(ocpd.ticker, 'N/A') AS ticker,
          COALESCE(ocpd.name, 'N/A') AS name,
          b.time,
          b.block_no
        FROM pool_update pu
        JOIN pool_hash ph ON pu.hash_id = ph.id
        LEFT JOIN off_chain_pool_data ocpd ON ph.id = ocpd.pool_id
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
          COALESCE(ocpd.ticker, 'N/A') AS ticker,
          COALESCE(ocpd.name, 'N/A') AS name,
          pr.retiring_epoch,
          b.time AS announced_time,
          b.block_no
        FROM pool_retire pr
        JOIN pool_hash ph ON pr.hash_id = ph.id
        LEFT JOIN off_chain_pool_data ocpd ON ph.id = ocpd.pool_id
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
          COALESCE(ocpd.ticker, 'N/A') AS ticker,
          pu.pledge::text,
          pu.margin,
          pu.fixed_cost::text,
          b.time,
          b.block_no
        FROM pool_update pu
        JOIN pool_hash ph ON pu.hash_id = ph.id
        LEFT JOIN off_chain_pool_data ocpd ON ph.id = ocpd.pool_id
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
      const result = await pool.query(`
        SELECT
          sa.view AS stake_address,
          COUNT(DISTINCT d.pool_hash_id) AS pool_count,
          MAX(b.time) AS last_delegation_time
        FROM delegation d
        JOIN stake_address sa ON d.addr_id = sa.id
        JOIN tx t ON d.tx_id = t.id
        JOIN block b ON t.block_id = b.id
        GROUP BY sa.id, sa.view
        HAVING COUNT(DISTINCT d.pool_hash_id) > 1
        ORDER BY pool_count DESC, last_delegation_time DESC
        LIMIT 50
      `);
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
            t.hash AS tx_hash,
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
            t.hash,
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
            t.hash,
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
          address,
          SUM(value)::text AS total_value,
          COUNT(*)::int AS utxo_count
        FROM tx_out
        WHERE consumed_by_tx_id IS NULL
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

// ─── Phase 7: Top Stakers ───
app.get("/top-stakers", async (c) => {
  try {
    const data = await cached("top_stakers", 3600, async () => {
      const result = await pool.query(`
        SELECT
          sa.view AS stake_address,
          es.amount::text AS stake_amount,
          ph.view AS delegated_pool,
          es.epoch_no
        FROM epoch_stake es
        JOIN stake_address sa ON es.addr_id = sa.id
        LEFT JOIN delegation d ON d.addr_id = sa.id AND d.id = (
          SELECT id FROM delegation WHERE addr_id = sa.id ORDER BY tx_id DESC LIMIT 1
        )
        LEFT JOIN pool_hash ph ON d.pool_hash_id = ph.id
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
        SELECT
          epoch_no,
          amount::text,
          COUNT(*)::int AS address_count
        FROM epoch_stake
        WHERE epoch_no >= (SELECT MAX(epoch_no) - 5 FROM epoch_stake)
        GROUP BY epoch_no, amount
        ORDER BY epoch_no DESC, amount DESC
        LIMIT 500
      `);

      const epochs = {};
      result.rows.forEach(row => {
        if (!epochs[row.epoch_no]) {
          epochs[row.epoch_no] = [];
        }
        epochs[row.epoch_no].push({
          amount: row.amount,
          address_count: row.address_count
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
        WHERE id IN (
          SELECT id FROM tx_out
          WHERE tx_id IN (SELECT id FROM tx WHERE block_id IN (
            SELECT id FROM block WHERE block_no = 0 OR epoch_no = 0
          ))
        )
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
    const days = parseInt(c.req.query("days") || "30");
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
            WHERE b.time >= NOW() - INTERVAL '${days} days'
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
            WHERE b.time >= NOW() - INTERVAL '${days} days'
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
            WHERE b.time >= NOW() - INTERVAL '${days} days'
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
            WHERE b.time >= NOW() - INTERVAL '${days} days'
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
            WHERE b.time >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(b.time)
            ORDER BY DATE(b.time) DESC
          `;
      }

      const result = await pool.query(query);
      return result.rows;
    });

    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

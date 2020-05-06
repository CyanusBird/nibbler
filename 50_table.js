"use strict";

// The table object stores info from the engine about a game-tree (PGN) node.

function NewTable() {
	let table = Object.create(table_prototype);
	table.clear();
	return table;
}

const table_prototype = {

	clear: function() {
		this.moveinfo = Object.create(null);	// move --> info
		this.version = 0;						// Incremented on any change
		this.nodes = 0;							// Stat sent by engine
		this.nps = 0;							// Stat sent by engine
		this.time = 0;							// Stat sent by engine

		this.eval = null;						// Used by grapher only. Is preserved even if the engine restarts its search at 0 nodes,
		this.eval_nodes = 0;					// and this line is how.
	},

	update_eval_from_move: function(move) {

		// move should be the best move

		let info = this.moveinfo[move];

		if (!info || info.total_nodes < this.eval_nodes) {
			return;
		}

		this.eval = info.board.active === "w" ? info.value() : 1 - info.value();
		this.eval_nodes = info.total_nodes;
	},

	update_eval_from_node_line: function(q_string, n_string, active) {

		// In the future this will be a better alternative to update_eval_from_move(), since
		// the caller of the above has to figure out which move is best.
		//
		// See https://github.com/LeelaChessZero/lc0/pull/1268
		//
		// node  (   1) N:     532 (+ 4) (P: 100.00%) (WL: -0.99811) (D: 0.002) (M:  2.0) (Q: -0.99811) (V: -0.9996)

		let q = parseFloat(q_string);
		let n = parseInt(n_string, 10);

		if (Number.isNaN(q) || Number.isNaN(n)) {
			return;
		}

		if (n < this.eval_nodes) {
			return;
		}

		this.eval = active === "w" ? Value(q) : 1 - Value(q);
		this.eval_nodes = n;
	},
};

// --------------------------------------------------------------------------------------------

function NewInfo(board, move) {

	// In some places elsewhere we might assume these things will have sensible values, so
	// better not initialise most things to null. Best to use neutral-ish values, especially
	// since some info (cp and q) can be carried (inverted) into the next step of a line...

	let info = Object.create(info_prototype);
	info.board = board;
	info.cp = 0;
	info.d = 0;
	info.m = 0;
	info.mate = 0;					// 0 can be the "not present" value.
	info.move = move;
	info.multipv = 1;
	info.n = 0;
	info.p = 0;						// Note P is received and stored as a percent, e.g. 31.76 is a reasonable P.
	info.pv = [move];				// Warning: never assume this is a legal sequence.
	info.nice_pv_cache = null;
	info.q = 0;
	info.s = 1;						// Known as Q+U before Lc0 v0.25-rc2
	info.total_nodes = 0;
	info.u = 1;
	info.v = null;					// Warning: v is allowed to be null if not known.
	info.version = 0;
	info.wdl = "??";
	return info;
}

const info_prototype = {

	nice_pv: function() {

		// Human readable moves. Since there's no real guarantee that our
		// moves list is legal, we legality check them. Also note that
		// our stored PV might conceivably contain old-fashioned castling
		// moves.

		if (this.nice_pv_cache) {
			return Array.from(this.nice_pv_cache);
		}

		let tmp_board = this.board;

		if (!this.pv || this.pv.length === 0) {		// Should be impossible.
			this.pv = [this.move];
		}

		let ret = [];

		for (let move of this.pv) {
			if (tmp_board.illegal(move) !== "") {
				break;
			}
			ret.push(tmp_board.nice_string(move));
			tmp_board = tmp_board.move(move);
		}

		this.nice_pv_cache = ret;
		return Array.from(this.nice_pv_cache);
	},

	value: function() {
		return Value(this.q);
	},

	value_string: function(dp) {
		if (typeof this.q !== "number") {
			return "?";
		}
		return (this.value() * 100).toFixed(dp);
	},

	stats_list: function(opts, nodes_total) {

		let ret = [];

		if (opts.ev) {
			ret.push(`EV: ${this.value_string(1)}%`);
		}

		// N is fairly complicated...

		if (typeof this.n === "number" && nodes_total) {		// i.e. nodes_total is not zero or undefined

			let n_string = "";

			if (opts.n) {
				n_string += ` N: ${(100 * this.n / nodes_total).toFixed(2)}%`;
			}

			if (opts.n_abs) {
				if (opts.n) {
					n_string += ` [${NString(this.n)}]`;
				} else {
					n_string += ` N: ${NString(this.n)}`;
				}
			}

			if (opts.of_n) {
				n_string += ` of ${NString(nodes_total)}`;
			}

			if (n_string !== "") {
				ret.push(n_string.trim());
			}

		} else {

			if (opts.n || opts.n_abs || opts.of_n) {
				ret.push("N: ?");
			}
			
		}

		// Everything else...

		if (opts.p) {
			if (typeof this.p === "number" && this.p > 0) {
				ret.push(`P: ${this.p}%`);
			} else {
				ret.push(`P: ?`);
			}
		}

		if (opts.v) {
			if (typeof this.v === "number") {
				ret.push(`V: ${this.v.toFixed(3)}`);
			} else {
				ret.push(`V: ?`);
			}
		}

		if (opts.q) {
			if (typeof this.q === "number") {
				ret.push(`Q: ${this.q.toFixed(3)}`);
			} else {
				ret.push(`Q: ?`);
			}
		}

		if (opts.u) {
			if (typeof this.u === "number" && this.n > 0) {						// Checking n is correct.
				ret.push(`U: ${this.u.toFixed(3)}`);
			} else {
				ret.push(`U: ?`);
			}
		}

		if (opts.s) {
			if (typeof this.s === "number" && this.n > 0) {						// Checking n is correct.
				ret.push(`S: ${this.s.toFixed(5)}`);
			} else {
				ret.push(`S: ?`);
			}
		}

		if (opts.m) {
			if (typeof this.m === "number" && this.m > 0) {
				ret.push(`M: ${this.m.toFixed(1)}`);
			} else {
				ret.push(`M: 0`);
			}
		}

		if (opts.d) {
			if (typeof this.d === "number") {
				ret.push(`D: ${this.d.toFixed(3)}`);
			} else {
				ret.push(`D: ?`);
			}
		}

		if (opts.wdl) {
			ret.push(`WDL: ${this.wdl}`);
		}

		return ret;
	}
};

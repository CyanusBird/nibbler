"use strict";

// All our positions have a prototype which contains the methods needed. This is much faster than
// creating each position with methods embedded in itself. Downside is, we have to use the "this"
// keyword. Also note that => functions break "this" in such an object.

const position_prototype = {

	copy: function() {
		return NewPosition(this.state, this.active, this.castling, this.enpassant, this.halfmove, this.fullmove, this.parent, this.lastmove);
	},

	move: function(s) {

		// s is something like "d1f3" or "e7e8q".
		// Assumes move is legal - all sorts of weird things can happen if this isn't so.

		// Basic sanity checks only:

		if (typeof s !== "string" || s.length < 4) {
			console.log("position_prototype.move called with arg", s);
			return this;
		}

		let [x1, y1] = XY(s.slice(0, 2));
		let [x2, y2] = XY(s.slice(2, 4));

		if (x1 < 0 || x1 > 7 || y1 < 0 || y1 > 7 || x2 < 0 || x2 > 7 || y2 < 0 || y2 > 7) {
			console.log("position_prototype.move called with arg", s);
			return this;
		}

		if (this.state[x1][y1] === "") {
			console.log("position_prototype.move called with empty source, arg was", s);
			return this;
		}

		total_moves_made++;

		let ret = this.copy();
		ret.parent = this;

		let promotion = s.length > 4 ? s[4] : "q";
		
		let white_flag = this.is_white(Point(x1, y1));
		let pawn_flag = "Pp".includes(ret.state[x1][y1]);
		let capture_flag = ret.state[x2][y2] !== "";

		if (pawn_flag && x1 !== x2) {		// Make sure capture_flag is set even for enpassant captures
			capture_flag = true;
		}

		// Update castling info...

		if (ret.state[x1][y1] === "K") {
			ret.castling = ret.castling.replaceAll("K", "");
			ret.castling = ret.castling.replaceAll("Q", "");
		}

		if (ret.state[x1][y1] === "k") {
			ret.castling = ret.castling.replaceAll("k", "");
			ret.castling = ret.castling.replaceAll("q", "");
		}

		if ((x1 == 0 && y1 == 0) || (x2 == 0 && y2 == 0)) {
			ret.castling = ret.castling.replaceAll("q", "");
		}

		if ((x1 == 7 && y1 == 0) || (x2 == 7 && y2 == 0)) {
			ret.castling = ret.castling.replaceAll("k", "");
		}

		if ((x1 == 0 && y1 == 7) || (x2 == 0 && y2 == 7)) {
			ret.castling = ret.castling.replaceAll("Q", "");
		}

		if ((x1 == 7 && y1 == 7) || (x2 == 7 && y2 == 7)) {
			ret.castling = ret.castling.replaceAll("K", "");
		}

		// Update halfmove and fullmove...

		if (white_flag === false) {
			ret.fullmove++;
		}

		if (pawn_flag || capture_flag) {
			ret.halfmove = 0;
		} else {
			ret.halfmove++;
		}

		// Handle the rook moves of castling...

		if (ret.state[x1][y1] === "K" || ret.state[x1][y1] === "k") {

			if (s === "e1g1") {
				ret.state[5][7] = "R";
				ret.state[7][7] = "";
			}

			if (s === "e1c1") {
				ret.state[3][7] = "R";
				ret.state[0][7] = "";
			}

			if (s === "e8g8") {
				ret.state[5][0] = "r";
				ret.state[7][0] = "";
			}

			if (s === "e8c8") {
				ret.state[3][0] = "r";
				ret.state[0][0] = "";
			}
		}

		// Handle enpassant captures...

		if (pawn_flag && capture_flag && ret.state[x2][y2] === "") {
			ret.state[x2][y1] = "";
		}

		// Set enpassant square...

		ret.enpassant = Point(null);

		if (pawn_flag && y1 === 6 && y2 === 4) {
			ret.enpassant = Point(x1, 5);
		}

		if (pawn_flag && y1 === 1 && y2 === 3) {
			ret.enpassant = Point(x1, 2);
		}

		// Actually make the move...

		ret.state[x2][y2] = ret.state[x1][y1];
		ret.state[x1][y1] = "";

		// Handle promotions...

		let promotion_flag;

		if (y2 === 0 && pawn_flag) {
			ret.state[x2][y2] = promotion.toUpperCase();
			promotion_flag = true;
		}

		if (y2 === 7 && pawn_flag) {
			ret.state[x2][y2] = promotion.toLowerCase();
			promotion_flag = true;
		}

		// Set stuff...

		ret.active = white_flag ? "b" : "w";
		ret.lastmove = s;

		if (ret.lastmove.length === 4 && promotion_flag) {
			ret.lastmove += promotion.toLowerCase();
		}

		return ret;
	},

	illegal: function(s) {

		// Returns "" if the move is legal, otherwise returns the reason it isn't.

		let [x1, y1] = XY(s.slice(0, 2));
		let [x2, y2] = XY(s.slice(2, 4));

		if (x1 < 0 || y1 < 0 || x1 > 7 || y1 > 7 || x2 < 0 || y2 < 0 || x2 > 7 || y2 > 7) {
			return "off board";
		}

		if (this.active === "w" && this.is_white(Point(x1, y1)) === false) {
			return "wrong colour source";
		}

		if (this.active === "b" && this.is_black(Point(x1, y1)) === false) {
			return "wrong colour source";
		}

		if (this.same_colour(Point(x1, y1), Point(x2, y2))) {
			return "source and destination have same colour";
		}

		if ("Nn".includes(this.state[x1][y1])) {
			if (Math.abs(x2 - x1) + Math.abs(y2 - y1) !== 3) {
				return "illegal knight movement";
			}
			if (Math.abs(x2 - x1) === 0 || Math.abs(y2 - y1) === 0) {
				return "illegal knight movement";
			}
		}

		if ("Bb".includes(this.state[x1][y1])) {
			if (Math.abs(x2 - x1) !== Math.abs(y2 - y1)) {
				return "illegal bishop movement";
			}
		}

		if ("Rr".includes(this.state[x1][y1])) {
			if (Math.abs(x2 - x1) > 0 && Math.abs(y2 - y1) > 0) {
				return "illegal rook movement";
			}
		}

		if ("Qq".includes(this.state[x1][y1])) {
			if (Math.abs(x2 - x1) !== Math.abs(y2 - y1)) {
				if (Math.abs(x2 - x1) > 0 && Math.abs(y2 - y1) > 0) {
					return "illegal queen movement";
				}
			}
		}

		// Pawns...

		if ("Pp".includes(this.state[x1][y1])) {

			if (Math.abs(x2 - x1) === 0) {
				if (this.state[x2][y2] !== "") {
					return "pawn cannot capture forwards";
				}
			}

			if (Math.abs(x2 - x1) > 1) {
				return "pawn cannot move that far sideways";
			}

			if (Math.abs(x2 - x1) === 1) {

				if (this.state[x2][y2] === "") {
					if (this.enpassant !== Point(x2, y2)) {
						return "pawn cannot capture thin air";
					}
				}

				if (Math.abs(y2 - y1) !== 1) {
					return "pawn must move 1 forward when capturing";
				}
			}

			if (this.state[x1][y1] === "P") {
				if (y1 !== 6) {
					if (y2 - y1 !== -1) {
						return "pawn must move forwards 1";
					}
				} else {
					if (y2 - y1 !== -1 && y2 - y1 !== -2) {
						return "pawn must move forwards 1 or 2";
					}
				}
			}

			if (this.state[x1][y1] === "p") {
				if (y1 !== 1) {
					if (y2 - y1 !== 1) {
						return "pawn must move forwards 1";
					}
				} else {
					if (y2 - y1 !== 1 && y2 - y1 !== 2) {
						return "pawn must move forwards 1 or 2";
					}
				}
			}
		}

		// Kings...

		if ("Kk".includes(this.state[x1][y1])) {

			if (Math.abs(y2 - y1) > 1) {
				return "illegal king movement";
			}

			if (Math.abs(x2 - x1) > 1) {

				// This should be an attempt to castle...

				if (s !== "e1g1" && s !== "e1c1" && s !== "e8g8" && s !== "e8c8") {
					return "illegal king movement";
				}

				// So it is an attempt to castle. But is it allowed?

				if (s === "e1g1" && this.castling.includes("K") === false) {
					return "White lost the right to castle kingside";
				}

				if (s === "e1c1" && this.castling.includes("Q") === false) {
					return "White lost the right to castle queenside";
				}

				if (s === "e8g8" && this.castling.includes("k") === false) {
					return "Black lost the right to castle kingside";
				}

				if (s === "e8c8" && this.castling.includes("q") === false) {
					return "White lost the right to castle queenside";
				}

				// For queenside castling, check that the rook isn't blocked by a piece on the B file...

				if (x2 === 2 && this.piece(Point(1, y2)) !== "") {
					return "queenside castling blocked on B-file";
				}

				// Check that king source square and the pass-through square aren't under attack.
				// Destination will be handled by the general in-check test later.
				
				if (this.attacked(Point(x1, y1), this.active)) {
					return "cannot castle under check";
				}

				if (this.attacked(Point((x1 + x2) / 2, y1), this.active)) {
					return "cannot castle through check";
				}
			}
		}

		// Check for blockers (pieces between source and dest).
		// K and k are included to spot castling blockers.

		if ("KQRBPkqrbp".includes(this.state[x1][y1])) {
			if (this.los(x1, y1, x2, y2) === false) {
				return "movement blocked";
			}
		}

		// Check for check...

		let tmp = this.move(s);

		for (let x = 0; x < 8; x++) {
			for (let y = 0; y < 8; y++) {
				if (tmp.state[x][y] === "K" && this.active === "w") {
					if (tmp.attacked(Point(x, y), this.active)) {
						return "king in check";
					}
				}
				if (tmp.state[x][y] === "k" && this.active === "b") {
					if (tmp.attacked(Point(x, y), this.active)) {
						return "king in check";
					}
				}
			}
		}

		return "";
	},

	los: function(x1, y1, x2, y2) {		// Returns false if there is no "line of sight" between the 2 points.

		// Check the line is straight....

		if (Math.abs(x2 - x1) > 0 && Math.abs(y2 - y1) > 0) {
			if (Math.abs(x2 - x1) !== Math.abs(y2 - y1)) {
				return false;
			}
		}

		let step_x;
		let step_y;

		if (x1 === x2) step_x = 0;
		if (x1 < x2) step_x = 1;
		if (x1 > x2) step_x = -1;

		if (y1 === y2) step_y = 0;
		if (y1 < y2) step_y = 1;
		if (y1 > y2) step_y = -1;

		let x = x1;
		let y = y1;

		while (true) {

			x += step_x;
			y += step_y;

			if (x === x2 && y === y2) {
				return true;
			}

			if (this.state[x][y] !== "") {
				return false;
			}
		}
	},

	attacked: function(target, my_colour) {

		if (my_colour === undefined) {
			throw "attacked(): no colour given";
		}

		if (target === Point(null)) {
			return false;
		}

		// Attacks along the lines (excludes pawns)...

		for (let step_x = -1; step_x <= 1; step_x++) {

			for (let step_y = -1; step_y <= 1; step_y++) {

				if (step_x === 0 && step_y === 0) continue;

				if (this.line_attack(target, step_x, step_y, my_colour)) {
					return true;
				}
			}
		}

		// Knights... this must be the stupidest way possible...

		for (let dx = -2; dx <= 2; dx++) {
			for (let dy = -2; dy <= 2; dy++) {

				if (Math.abs(dx) + Math.abs(dy) !== 3) continue;

				let x = target.x + dx;
				let y = target.y + dy;

				if (x < 0 || x > 7 || y < 0 || y > 7) continue;

				if (this.state[x][y] === "") continue;		// Necessary, to prevent "Nn".includes() having false positives
				if ("Nn".includes(this.state[x][y])) {
					if (this.colour(Point(x, y)) === my_colour) continue;
					return true;
				}
			}
		}

		return false;
	},

	line_attack: function(target, step_x, step_y, my_colour) {

		// Is the target square under attack via the line specified by step_x and step_y (which are both -1, 0, or 1) ?

		let x = target.x;
		let y = target.y;

		let ranged_attackers = "QqRr";					// Ranged attackers that can go in a cardinal direction.
		if (step_x !== 0 && step_y !== 0) {
			ranged_attackers = "QqBb";					// Ranged attackers that can go in a diagonal direction.
		}

		let iteration = 0;

		while (true) {

			iteration++;

			x += step_x;
			y += step_y;

			if (x < 0 || x > 7 || y < 0 || y > 7) {
				return false;
			}

			if (this.state[x][y] === "") {
				continue;
			}

			// So there's something here. Must return now.

			if (this.colour(Point(x, y)) === my_colour) {
				return false;
			}

			// We now know the piece is hostile. This allows us to mostly not care
			// about distinctions between "Q" and "q", "R" and "r", etc.

			// Is it one of the ranged attacker types?

			if (ranged_attackers.includes(this.state[x][y])) {
				return true;
			}

			// Pawns and kings are special cases (attacking iff it's the first iteration)

			if (iteration === 1) {

				if ("Kk".includes(this.state[x][y])) {
					return true;
				}

				if (Math.abs(step_x) === 1) {

					if (this.state[x][y] === "p" && step_y === -1) {	// Black pawn in attacking position
						return true;
					}

					if (this.state[x][y] === "P" && step_y === 1) {		// White pawn in attacking position
						return true;
					}
				}
			}

			return false;
		}
	},

	find: function(piece, startx, starty, endx, endy) {

		// Find all pieces of the specified type (colour-specific).
		// Returned as a list of points.

		if (startx === undefined || starty === undefined || endx === undefined || endy === undefined) {
			startx = 0;
			starty = 0;
			endx = 7;
			endy = 7;
		}

		let ret = [];

		for (let x = startx; x <= endx; x++) {
			for (let y = starty; y <= endy; y++) {
				if (this.state[x][y] === piece) {
					ret.push(Point(x, y));
				}
			}
		}

		return ret;
	},

	parse_pgn: function(s) {		// Returns a move and an error message.

		// Delete things we don't need...

		s = s.replaceAll("x", "");
		s = s.replaceAll("+", "");
		s = s.replaceAll("#", "");

		// Fix castling with zeroes...

		s = s.replaceAll("0-0", "O-O");
		s = s.replaceAll("0-0-0", "O-O-O");

		if (s.toUpperCase() === "O-O") {
			if (this.active === "w") {
				if (this.illegal("e1g1") === "") {
					return ["e1g1", ""];
				} else {
					return ["", "illegal castling"];
				}
			} else {
				if (this.illegal("e8g8") === "") {
					return ["e8g8", ""];
				} else {
					return ["", "illegal castling"];
				}
			}
		}

		if (s.toUpperCase() === "O-O-O") {
			if (this.active === "w") {
				if (this.illegal("e1c1") === "") {
					return ["e1c1", ""];
				} else {
					return ["", "illegal castling"];
				}
			} else {
				if (this.illegal("e8c8") === "") {
					return ["e8c8", ""];
				} else {
					return ["", "illegal castling"];
				}
			}
		}

		// Just in case, delete any "-" characters (after handling castling, of course)...

		s = s.replaceAll("-", "");

		// Save promotion string, if any, then delete it from s...

		let promotion = "";

		if (s[s.length - 2] === "=") {
			promotion = s[s.length - 1].toLowerCase();
			s = s.slice(0, s.length - 2);
		}

		let piece;

		// If the piece isn't specified (with an uppercase letter) then it's a pawn move.
		// Let's add P to the start of the string to keep the string format consistent.

		if ("KQRBNP".includes(s[0]) === false) {
			s = "P" + s;
		}

		piece = s[0];

		if (this.active === "b") {
			piece = piece.toLowerCase();
		}

		// The last 2 characters specify the target point. We've removed all trailing
		// garbage that could interfere with this fact.

		let dest = Point(s.slice(s.length - 2, s.length));

		// Any characters between the piece and target should be disambiguators...

		let disambig = s.slice(1, s.length - 2);

		let startx = 0;
		let endx = 7;

		let starty = 0;
		let endy = 7;

		for (let c of Array.from(disambig)) {
			if (c >= "a" && c <= "h") {
				startx = c.charCodeAt(0) - 97;
				endx = startx;
			}
			if (c >= "1" && c <= "8") {
				starty = 7 - (c.charCodeAt(0) - 49);
				endy = starty;
			}
		}

		// If it's a pawn and hasn't been disambiguated then it is moving forwards...

		if (piece === "P" || piece === "p") {
			if (disambig.length === 0) {
				startx = dest.x;
				endx = dest.x;
			}
		}

		let sources = this.find(piece, startx, starty, endx, endy);

		if (sources.length === 0) {
			return ["", "piece not found"];
		}

		let possible_moves = [];

		for (let source of sources) {
			possible_moves.push(source.s + dest.s);
		}

		let valid_moves = [];

		for (let move of possible_moves) {
			if (this.illegal(move) === "") {
				valid_moves.push(move);
			}
		}

		if (valid_moves.length === 1) {
			return [valid_moves[0] + promotion, ""];
		}

		if (valid_moves.length === 0) {
			return ["", "piece found but move illegal"];
		}

		if (valid_moves.length > 1) {
			return ["", `ambiguous moves: [${valid_moves}]`];
		}
	},

	piece: function(point) {
		if (point === Point(null)) return "";
		return this.state[point.x][point.y];
	},

	is_white: function(point) {
		if (this.piece(point) === "") {
			return false;
		}
		return "KQRBNP".includes(this.piece(point));
	},

	is_black: function(point) {
		if (this.piece(point) === "") {
			return false;
		}
		return "kqrbnp".includes(this.piece(point));
	},

	is_empty: function(point) {
		return this.piece(point) === "";
	},

	colour: function(point) {
		if (this.is_white(point)) return "w";
		if (this.is_black(point)) return "b";
		return "";
	},

	same_colour: function(point1, point2) {
		return this.colour(point1) === this.colour(point2);
	},

	nice_lastmove: function() {

		if (this.lastmove === null || this.parent === null) {
			return "??";
		}

		if (this.nice_lastmove_cache === undefined) {
			this.nice_lastmove_cache = this.parent.nice_string(this.lastmove);
		}

		return this.nice_lastmove_cache;
	},

	nice_string: function(s) {

		// Given some raw (but valid) UCI move string, return a nice human-readable
		// string for display in the browser window. This string should never be
		// examined by the caller, merely displayed.

		let source = Point(s.slice(0, 2));
		let dest = Point(s.slice(2, 4));

		let piece = this.piece(source);

		if (piece === "") {
			return "??";
		}

		let check = "";
		let next_board = this.move(s);
		let opponent_king_char = this.active === "w" ? "k" : "K";
		let opponent_king_square = this.find(opponent_king_char)[0];
		if (next_board.attacked(opponent_king_square, next_board.colour(opponent_king_square))) {
			check = "+";
		}

		if ("KkQqRrBbNn".includes(piece)) {

			if ("Kk".includes(piece)) {
				if (s === "e1g1" || s === "e8g8") {
					return `<span class="nobr">O-O${check}</span>`;
				}
				if (s === "e1c1" || s === "e8c8") {
					return `<span class="nobr">O-O-O${check}</span>`;
				}
			}

			// Would the move be ambiguous?
			// IMPORTANT: note that the actual move will not necessarily be valid_moves[0].

			let possible_sources = this.find(piece);
			let possible_moves = [];
			let valid_moves = [];

			for (let foo of possible_sources) {
				possible_moves.push(foo.s + dest.s);		// e.g. "e2e4"
			}

			for (let move of possible_moves) {
				if (this.illegal(move) === "") {
					valid_moves.push(move);
				}
			}

			if (valid_moves.length > 2) {

				// Full disambiguation.

				if (this.piece(dest) === "") {
					return piece.toUpperCase() + source.s + dest.s + check;
				} else {
					return piece.toUpperCase() + source.s + "x" + dest.s + check;
				}
			}

			if (valid_moves.length === 2) {

				// Partial disambiguation.

				let source1 = Point(valid_moves[0].slice(0, 2));
				let source2 = Point(valid_moves[1].slice(0, 2));

				let disambiguator;

				if (source1.x === source2.x) {
					disambiguator = source.s[1];		// Note source (the true source), not source1
				} else {
					disambiguator = source.s[0];		// Note source (the true source), not source1
				}

				if (this.piece(dest) === "") {
					return piece.toUpperCase() + disambiguator + dest.s + check;
				} else {
					return piece.toUpperCase() + disambiguator + "x" + dest.s + check;
				}
			}

			// No disambiguation.

			if (this.piece(dest) === "") {
				return piece.toUpperCase() + dest.s + check;
			} else {
				return piece.toUpperCase() + "x" + dest.s + check;
			}
		}

		// So it's a pawn. Pawn moves are never ambiguous.

		let ret;

		if (source.x === dest.x) {
			ret = dest.s;
		} else {
			ret = source.s[0] + "x" + dest.s;
		}

		if (s.length > 4) {
			ret += "=";
			ret += s[4].toUpperCase();
		}

		ret += check;

		return ret;
	},

	fen: function() {

		let s = "";

		for (let y = 0; y < 8; y++) {

			let x = 0;
			let blanks = 0;

			while (true) {

				if (this.state[x][y] === "") {
					blanks++;
				} else {
					if (blanks > 0) {
						s += blanks.toString();
						blanks = 0;
					}
					s += this.state[x][y];
				}

				x++;

				if (x >= 8) {
					if (blanks > 0) {
						s += blanks.toString();
					}
					if (y < 7) {
						s += "/";
					}
					break;
				}
			}
		}

		let ep_string = this.enpassant === Point(null) ? "-" : this.enpassant.s;
		let castling_string = this.castling === "" ? "-" : this.castling;

		return s + ` ${this.active} ${castling_string} ${ep_string} ${this.halfmove} ${this.fullmove}`;
	},

	simple_string: function() {

		// Returns a simple representation of the board, which is convenient to
		// use for the mouseover functions.

		let chars = new Array(64);
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				let c = this.state[x][y];
				chars[y * 8 + x] = c !== "" ? c : ".";
			}
		}
		return chars.join("");
	},

	history: function() {
		let list = [];
		let node = this;
		while (node.parent) {			// no parent implies no lastmove
			list.push(node.lastmove);
			node = node.parent;
		}
		list.reverse();
		return list;
	},

	position_list: function() {
		let list = [];
		let node = this;
		while (node) {
			list.push(node);
			node = node.parent;
		}
		list.reverse();
		return list;
	},

	root: function() {
		let node = this;
		while (node.parent) {
			node = node.parent;
		}
		return node;
	},

	has_ancestor: function(other) {
		let node = this;
		while (node.parent) {
			if (node.parent === other) return true;
			node = node.parent;
		}
		return false;
	},

	initial_fen: function() {

		// When sending the engine the position, the UCI specs involve sending the initial FEN
		// and then a list of moves. This method finds the initial FEN.

		let node = this;

		while (node.parent) {
			node = node.parent;
		}

		return node.fen();
	}
};

function NewPosition(state = null, active = "w", castling = "", enpassant = null, halfmove = 0, fullmove = 1, parent = null, lastmove = null) {

	total_positions_made++;

	let p = Object.create(position_prototype);

	p.state = [];					// top-left is 0,0

	for (let x = 0; x < 8; x++) {
		p.state.push([]);
		for (let y = 0; y < 8; y++) {
			if (state) {
				p.state[x].push(state[x][y]);
			} else {
				p.state[x].push("");
			}
		}
	}

	p.active = active;
	p.castling = castling;
	
	if (enpassant) {
		p.enpassant = enpassant;
	} else {
		p.enpassant = Point(null);
	}

	p.halfmove = halfmove;
	p.fullmove = fullmove;

	p.parent = parent;
	p.lastmove = lastmove;

	return p;
}	

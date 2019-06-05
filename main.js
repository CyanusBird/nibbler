"use strict";

const alert = require("./modules/alert");
const debork_json = require("./modules/debork_json");
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const windows = require("./modules/windows");

let config = {};

try {
	if (fs.existsSync("config.json")) {
		config = JSON.parse(debork_json(fs.readFileSync("config.json", "utf8")));
	} else if (fs.existsSync("config.json.example")) {
		config = JSON.parse(debork_json(fs.readFileSync("config.json.example", "utf8")));
	}
} catch (err) {
	// pass
}

if (config.width === undefined || config.width <= 0) {
	config.width = 1280;
}

if (config.height === undefined || config.height <= 0) {
	config.height = 840;
}

electron.app.on("ready", () => {
	windows.new("main-window", {width: config.width, height: config.height, page: path.join(__dirname, "nibbler.html")});
	menu_build();
});

electron.app.on("window-all-closed", () => {
	electron.app.quit();
});

function menu_build() {
	const template = [
		{
			label: "App",
			submenu: [
				{
					label: "About",
					click: () => {
						alert(`Nibbler ${electron.app.getVersion()}, running under Electron ${process.versions.electron}`);
					}
				},
				{
					role: "toggledevtools"
				},
				{
					type: "separator"
				},
				{
					label: "New Game",
					accelerator: "CommandOrControl+N",
					click: () => {
						windows.send("main-window", "new", null);
					}
				},
				{
					type: "separator"
				},
				{
					label: "Show all games in current PGN",
					click: () => {
						windows.send("main-window", "display_pgn_chooser", null);
					}
				},
				{
					label: "Open PGN...",
					accelerator: "CommandOrControl+O",
					click: () => {
						let files = electron.dialog.showOpenDialog({
							properties: ["openFile"]
						});
						if (files && files.length > 0) {
							windows.send("main-window", "open", files[0]);
						}
					}
				},
				{
					label: "Validate PGN...",
					click: () => {
						let files = electron.dialog.showOpenDialog({
							properties: ["openFile"]
						});
						if (files && files.length > 0) {
							windows.send("main-window", "validate_pgn", files[0]);
						}
					}
				},
				{
					type: "separator"
				},
				{
					role: "quit",
					label: "Quit",
					accelerator: "CommandOrControl+Q"
				},
			]
		},
		{
			label: "Navigation",
			submenu: [
				{
					label: "Play Best",
					accelerator: "CommandOrControl+D",
					click: () => {
						windows.send("main-window", "play_best", null);
					}
				},
				{
					type: "separator"
				},
				{
					label: "Root",
					accelerator: "Home",
					click: () => {
						windows.send("main-window", "goto_root", null);
					}
				},
				{
					label: "End",
					accelerator: "End",
					click: () => {
						windows.send("main-window", "goto_end", null);
					}
				},
				{
					label: "Backward",
					accelerator: "Left",
					click: () => {
						windows.send("main-window", "prev", null);
					}
				},
				{
					label: "Forward",
					accelerator: "Right",
					click: () => {
						windows.send("main-window", "next", null);
					}
				},
				{
					type: "separator"
				},
				{
					label: "Return to PGN",
					accelerator: "CommandOrControl+R",
					click: () => {
						windows.send("main-window", "return_to_pgn", null);
					}
				},
				{
					type: "separator"
				},
				{
					label: "Flip Board",
					accelerator: "CommandOrControl+F",
					click: () => {
						windows.send("main-window", "toggle", "flip");
					}
				},
			]
		},
		{
			label: "Analysis",
			submenu: [
				{
					label: "Go",
					accelerator: "CommandOrControl+G",
					click: () => {
						windows.send("main-window", "go", null);
					}
				},
				{
					label: "Halt",
					accelerator: "CommandOrControl+H",
					click: () => {
						windows.send("main-window", "halt", null);
					}
				},
				{
					type: "separator"
				},
				{
					label: "Reset Lc0 cache",
					click: () => {
						windows.send("main-window", "reset_leela_cache", null);
					}
				},
			]
		}
	];

	const menu = electron.Menu.buildFromTemplate(template);
	electron.Menu.setApplicationMenu(menu);
}

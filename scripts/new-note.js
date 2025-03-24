#!/usr/bin/env osascript -l JavaScript

ObjC.import("stdlib");
ObjC.import("Foundation");
const app = Application.currentApplication();
app.includeStandardAdditions = true;

/** @param {string} path */
function readFile(path) {
	const data = $.NSFileManager.defaultManager.contentsAtPath(path);
	const str = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
	return ObjC.unwrap(str);
}

/** @param {string} filepath @param {string} text */
function writeToFile(filepath, text) {
	const str = $.NSString.alloc.initWithUTF8String(text);
	str.writeToFileAtomicallyEncodingError(filepath, true, $.NSUTF8StringEncoding, null);
}



const fileExists = (/** @type {string} */ filePath) => Application("Finder").exists(Path(filePath));

//───────────────────────────────────────────────────────────────────────────

/** @type {AlfredRun} */
// biome-ignore lint/correctness/noUnusedVariables: Alfred run
function run(argv) {
	const vaultPath = $.getenv("vault_path");
	const vaultNameEnc = encodeURIComponent(vaultPath.replace(/.*\//, ""));
	try {
		const createInNewTab = $.getenv("create_in_new_tab") === "true";
		if (createInNewTab) app.openLocation(
			`obsidian://advanced-uri?vault=${vaultNameEnc}&commandid=workspace%253Anew-tab`,
		);
	} catch (_error) {}

	//───────────────────────────────────────────────────────────────────────────
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const seconds = now.getSeconds().toString().padStart(2, '0');
	const cur_time = hours + minutes + seconds;

	let title = argv[0]?.trim() || cur_time;
	let title_norm = title.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]/gi, "")

	let fileName_base = title_norm;
	fileName_base = fileName_base.replace(/[\\/:]/g, ""); // remove illegal characters
	//fileName_base = fileName_base.charAt(0).toUpperCase() + fileName_base.slice(1); // capitalize

	// Add current date prefix in YYMMDD_ format
	const currentDate = new Date();
	const year = String(currentDate.getFullYear()).slice(2); // Get last two digits of the year
	const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based
	const day = String(currentDate.getDate()).padStart(2, '0');
	const datePrefix = `${year}${month}${day}_`;
	fileName_base = datePrefix + fileName_base; // Prepend the date to the file name

	const templateRelPath = $.getenv("template_note_path") || "";
	const newNoteLocation = $.getenv("new_note_location") || "";
	const newNoteRelPath = `${newNoteLocation}/${fileName_base}.md`;
	let newNoteAbsPath = `${vaultPath}/${newNoteRelPath}`;
	while (fileExists(newNoteAbsPath)) {
		newNoteAbsPath = newNoteAbsPath.slice(0, -3) + " 1.md";
	}

	let newNoteContent = "# " + title + "\n\n";
	if (templateRelPath) {
		let templateAbsPath = `${vaultPath}/${templateRelPath}`;
		if (!templateAbsPath.endsWith(".md")) templateAbsPath += ".md";
		newNoteContent = readFile(templateAbsPath).replace("{{title}}", fileName_base); // insert title
	}

	writeToFile(newNoteAbsPath, newNoteContent);

	delay(0.1); // ensure note is written
	// since there is a new note, rewrite the metadata. CAVEAT: Notes created not
	// by this workflow are not immediately written to the metadata
	app.openLocation(`obsidian://advanced-uri?vault=${vaultNameEnc}&commandid=metadata-extractor%253Awrite-metadata-json`)

	return newNoteRelPath; // pass to opening function
}

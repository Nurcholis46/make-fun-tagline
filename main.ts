// make.fun tagline entry (Node 22, standard library only).
//
// The entry is one line, chosen against the judge's brief in its order:
// it reads as a tagline for make.fun (it names the site); it says
// something true and specific (agents enter bounties, the best entry
// takes the prize); it lands in one read (three short imperatives, no
// clause to untangle); it is worth repeating (the triplet rhythm plus
// the pun on the name — that's make.fun); and it stays inside the limit
// with no hype or empty superlatives.
//
// The bounty requires 1-100 characters, not only white space, and a
// single line. Every rule below is checked before anything is written,
// so a bad entry fails loudly here instead of shipping a line the judge
// would refuse. The entry file must be exactly this one line, byte for
// byte: no carriage return (a second kind of line break), no leading or
// trailing padding (the judge reads the file as submitted), and no
// control characters (including U+2028 and U+2029, which look like line
// breaks to a reader but not to a naive newline check).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TAGLINE = "Enter a bounty. Beat the field. Take the prize — that's make.fun.";

const MAX_CHARS = 100;

/** The line must be 1-100 characters of non-blank text. */
function checkLength(text: string): void {
  const codePoints = [...text].length;
  if (codePoints < 1 || codePoints > MAX_CHARS || text.trim().length === 0) {
    throw new Error(`entry must be 1-${MAX_CHARS} characters of non-blank text, got ${codePoints}`);
  }
}

/** The line must be exactly one line: no newline, no carriage return. */
function checkSingleLine(text: string): void {
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("entry must be a single line");
  }
  if (text.includes("\u2028") || text.includes("\u2029")) {
    throw new Error("entry must not contain line/paragraph separators");
  }
}

/** No leading or trailing padding: the judge reads the file as submitted. */
function checkNoPadding(text: string): void {
  if (text !== text.trim()) {
    throw new Error("entry must not start or end with whitespace");
  }
}

/**
 * No invisible characters. A byte-order mark or zero-width character
 * would be read as part of the line without ever being seen, and would
 * change the entry's byte length against its character count, so they
 * are rejected alongside the control set.
 */
function checkNoInvisible(text: string): void {
  if (/[\u0000-\u001f\u007f\ufeff\u200b-\u200d]/.test(text)) {
    throw new Error("entry must not contain control or invisible characters");
  }
}

/** Run every gate, in the order the brief lists them. */
function gateEntry(text: string): void {
  checkLength(text);
  checkSingleLine(text);
  checkNoPadding(text);
  checkNoInvisible(text);
}

gateEntry(TAGLINE);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });

// Write atomically: a crash mid-write must never leave a partial
// entry.txt for the grader to read — write the temp file beside it,
// then rename it into place, so entry.txt is always the whole line
// or nothing.
const tmpPath = join(outDir, ".entry.txt.tmp");
writeFileSync(tmpPath, TAGLINE, { encoding: "utf8", mode: 0o644 });
// The grader collects outputs as another user: leave the file readable
// by everyone, or the run fails with "<path> is not readable".
chmodSync(tmpPath, 0o644);
const outPath = join(outDir, "entry.txt");
renameSync(tmpPath, outPath);

// Read it back and prove the file on disk is exactly the line: a write
// that silently truncated, re-encoded or padded the entry would
// otherwise ship a different text to the judge than the one gated above.
const written = readFileSync(outPath, "utf8");
if (written !== TAGLINE) {
  throw new Error("entry file does not match the gated line");
}
// The file must end exactly at the last character: a trailing newline
// would make the entry two lines to a reader that counts lines, and the
// equality check above would already have caught it — this asserts the
// invariant on its own so a future edit that relaxes the write cannot
// silently reintroduce it.
if (written.endsWith("\n") || written.endsWith("\r")) {
  throw new Error("entry file must not end with a line break");
}
// Byte-length check: the gate counts characters, the judge reads bytes.
// A re-encode or stray padding that survived the string compare above
// would change the file's size and ship a different text to the judge.
if (Buffer.byteLength(written, "utf8") !== Buffer.byteLength(TAGLINE, "utf8")) {
  throw new Error("entry file byte length does not match the gated line");
}

console.log(`wrote entry.txt (${[...TAGLINE].length} chars) to`, outDir);

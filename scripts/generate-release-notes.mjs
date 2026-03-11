import { buildReleaseNotes, resolveOptions } from "./release-notes-lib.mjs"

const options = resolveOptions(process.argv.slice(2))
const notes = buildReleaseNotes(options)

process.stdout.write(`${notes}\n`)

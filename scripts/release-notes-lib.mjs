import { execFileSync } from "node:child_process"

const VERSION_OVERRIDES = {
  "1.0.0": {
    summary:
      "Initial release of the YouTube Comments Downloader community node for n8n.",
    sections: [
      {
        heading: "Features",
        items: [
          "Add the YouTube Comments Downloader node and API credentials.",
          "Support downloading comments from videos, shorts, live streams, playlists, channels, community posts, and custom lists.",
          "Return comments as JSON data or downloadable files inside n8n workflows.",
        ],
      },
    ],
  },
  "1.0.1": {
    summary: "Cleanup release for the initial n8n package setup.",
    sections: [
      {
        heading: "Improvements",
        items: [
          "Clean up package boilerplate and refresh the project documentation.",
        ],
      },
    ],
  },
  "1.0.2": {
    summary: "Maintenance release for the n8n package internals and docs.",
    sections: [
      {
        heading: "Improvements",
        items: [
          "Switch to bundled internal dependencies and update the README.",
        ],
      },
    ],
  },
  "1.0.3": {
    summary: "Improves file download handling in the n8n node.",
    sections: [
      {
        heading: "Fixes",
        items: ["Fix binary file downloads returned by the n8n node."],
      },
    ],
  },
  "1.0.4": {
    summary: "Improves failure handling in the n8n node.",
    sections: [
      {
        heading: "Fixes",
        items: [
          "Fail n8n executions when a download ends in `canceled` instead of continuing as a successful run.",
        ],
      },
    ],
  },
}

const OMIT_SUBJECT_PATTERNS = [
  /^Release \d+\.\d+\.\d+(?:[-.][\w.]+)?$/i,
  /^Revert "Release \d+\.\d+\.\d+(?:[-.][\w.]+)?"/i,
  /^add n8n release workflow guardrails$/i,
]

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim()
}

function parseArgs(argv) {
  const parsed = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (!arg.startsWith("--")) {
      continue
    }

    const key = arg.slice(2)
    const value = argv[i + 1]

    if (!value || value.startsWith("--")) {
      parsed[key] = true
      continue
    }

    parsed[key] = value
    i++
  }

  return parsed
}

function getSortedTags() {
  const output = runGit(["tag", "--list", "--sort=v:refname"])
  return output ? output.split("\n").filter(Boolean) : []
}

function resolveReleaseRange(version) {
  const tags = getSortedTags()
  const index = tags.indexOf(version)

  if (index === -1) {
    throw new Error(`Unknown release tag: ${version}`)
  }

  return {
    version,
    from: index > 0 ? tags[index - 1] : null,
    to: version,
  }
}

function readCommitSubjects(from, to = "HEAD") {
  const range = from ? `${from}..${to}` : to
  const output = runGit(["log", "--pretty=format:%s", range])

  if (!output) {
    return []
  }

  return output
    .split("\n")
    .map((subject) => subject.trim())
    .filter(Boolean)
}

function shouldOmitSubject(subject) {
  return OMIT_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))
}

function normalizeSubject(subject) {
  let cleaned = subject
    .replace(/^(fix|feat|docs|chore|refactor|perf|test|build|ci):\s*/i, "")
    .trim()

  if (cleaned.startsWith("Add ")) {
    cleaned = cleaned
  } else {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  if (!/[.!?`]$/.test(cleaned)) {
    cleaned += "."
  }

  return cleaned
}

function categorizeSubject(subject) {
  if (/^(fix|fail)\b/i.test(subject)) {
    return "Fixes"
  }

  if (/^(feat|add)\b/i.test(subject)) {
    return "Features"
  }

  return "Improvements"
}

function buildFallbackContent(version, from, to) {
  const commits = readCommitSubjects(from, to).filter(
    (subject) => !shouldOmitSubject(subject),
  )

  const sectionsMap = new Map()

  for (const subject of commits) {
    const heading = categorizeSubject(subject)
    const item = normalizeSubject(subject)

    if (!sectionsMap.has(heading)) {
      sectionsMap.set(heading, [])
    }

    sectionsMap.get(heading).push(item)
  }

  const orderedHeadings = ["Features", "Fixes", "Improvements"]
  const sections = orderedHeadings
    .filter((heading) => sectionsMap.has(heading))
    .map((heading) => ({
      heading,
      items: sectionsMap.get(heading),
    }))

  const summary = sections.length
    ? `Updates for version ${version}.`
    : `Maintenance release for version ${version}.`

  return { summary, sections }
}

function getReleaseContent({ version, from, to }) {
  return VERSION_OVERRIDES[version] ?? buildFallbackContent(version, from, to)
}

function renderBody(content) {
  const lines = [content.summary, ""]

  for (const section of content.sections) {
    if (!section.items.length) {
      continue
    }

    lines.push(`### ${section.heading}`)
    for (const item of section.items) {
      lines.push(`- ${item}`)
    }
    lines.push("")
  }

  while (lines.at(-1) === "") {
    lines.pop()
  }

  return lines.join("\n")
}

function renderChangelogSection({ version, from, to, content }) {
  const compareBase = from ?? version
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  const body = renderBody(content)

  return [
    `#### [${version}](https://github.com/youtube-comments-downloader/n8n-nodes-youtube-comments-downloader/compare/${compareBase}...${version})`,
    "",
    `> ${date}`,
    "",
    body,
    "",
  ].join("\n")
}

export function buildReleaseNotes(options) {
  const version = options.version
  const from = options.from ?? null
  const to = options.to ?? "HEAD"
  const format = options.format ?? "github"
  const content = getReleaseContent({ version, from, to })

  if (format === "changelog") {
    return renderChangelogSection({ version, from, to, content })
  }

  return renderBody(content)
}

export function resolveOptions(argv) {
  const args = parseArgs(argv)

  if (args.release) {
    return {
      ...resolveReleaseRange(args.release),
      format: args.format ?? "github",
    }
  }

  if (!args.version && !args.from) {
    throw new Error("Pass either --release <tag> or --from <ref>.")
  }

  const version =
    typeof args.version === "string" ? args.version : "Unreleased"

  return {
    version,
    from: typeof args.from === "string" ? args.from : null,
    to: typeof args.to === "string" ? args.to : "HEAD",
    format: args.format ?? "github",
  }
}

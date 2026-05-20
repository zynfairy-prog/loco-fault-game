/**
 * Display-layer filter for streaming AI text.
 *
 * Removes:
 *   1. Complete <<...>> signal blocks
 *   2. Unclosed <<... fragments (waiting for >> to arrive in next stream tick)
 *   3. A trailing single '<' that may be the first half of an incoming '<<'
 *      (DeepSeek-V3.2 sometimes splits '<<' across two stream chunks)
 *   4. Leaked director meta: 「导演自检」sections, ✓ checklist runs, role-description parentheticals
 *
 * Distinct from signal-parser.ts which only operates on closed signals to
 * drive store state. This function is purely for deciding what text to show
 * in the chat bubble.
 */
export function stripSignalsForDisplay(raw: string): string {
  if (!raw) return ''

  let result = ''
  let i = 0
  const len = raw.length

  while (i < len) {
    if (raw[i] === '<' && i + 1 < len && raw[i + 1] === '<') {
      const closeIdx = raw.indexOf('>>', i + 2)
      if (closeIdx === -1) {
        // Unclosed fragment — discard everything from here to end of string.
        break
      }
      // Closed signal — skip past >>
      i = closeIdx + 2
    } else {
      result += raw[i]
      i++
    }
  }

  // Edge case: stream chunk ended with a lone '<' that may be the first
  // half of an incoming '<<'. Drop it; if the next chunk turns out to be
  // normal text, at most one '<' character will be missing for one frame.
  if (result.endsWith('<')) {
    result = result.slice(0, -1)
  }

  // Collapse runs of blank lines left behind after signal removal
  result = result.replace(/\n{3,}/g, '\n\n').trim()

  return stripDirectorMeta(result)
}

/**
 * Filters out leaked director meta that the LLM occasionally emits
 * despite being instructed not to. Operates as a best-effort safeguard.
 */
function stripDirectorMeta(text: string): string {
  // 1. Cut everything from 「导演自检」 onwards
  const checkIdx = text.indexOf('导演自检')
  if (checkIdx >= 0) {
    text = text.substring(0, checkIdx)
  }

  // 2. Remove runs of 3+ lines that each contain a ✓ check mark
  text = text.replace(/(?:^[^\n]*✓[^\n]*\n?){3,}/gm, '')

  // 3. Remove self-description parentheticals about role config
  text = text.replace(/（根据[^）]*(?:配置|占位)[^）]*扮演[^）]*）/g, '')
  text = text.replace(/\(根据[^)]*(?:配置|占位)[^)]*扮演[^)]*\)/g, '')

  return text.trim()
}

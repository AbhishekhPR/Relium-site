/**
 * What the published site is not allowed to contain.
 *
 * ###################################################################
 * # THIS READS THE FILES VERCEL SERVES, NOT A BUILD ARTEFACT.       #
 * ###################################################################
 *
 * relium.dev is static: the files in this repository ARE the deployment, so
 * scanning them is scanning production. There is no bundler to trust and no
 * build step for something to slip through.
 *
 * Two launch rules are pinned here, both of which are easy to undo by accident
 * in a copy edit and neither of which is visible in review:
 *
 *   1. No relium.dev mailbox appears anywhere -- none is configured, so
 *      every one is an invitation to write into a void. Re-adding "just a
 *      support address" is a one-word change that nothing else would catch.
 *
 *   2. The body background carries no repeating grid. It was removed for a
 *      calmer, more premium surface, and it would come back the moment anyone
 *      reaches for a linear-gradient to add texture.
 *
 *   3. The plan prices are what they are supposed to be, and the two pages
 *      that print them agree. Pro was $250 in two places -- the homepage card
 *      and the pricing page card -- and a price is exactly the kind of thing
 *      that gets corrected in one of them.
 *
 * Run: node --test scripts/public-files.test.mjs
 * No dependencies, no package.json, nothing to install — and deliberately no
 * package.json, because adding one makes Vercel look for a build step this
 * site does not have.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Everything a browser can fetch from the deployment. */
const PUBLIC_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt'])

function publicFiles() {
  return readdirSync(ROOT)
    .filter((name) => PUBLIC_EXTENSIONS.has(extname(name)))
    .map((name) => [name, readFileSync(join(ROOT, name), 'utf8')])
}

const files = publicFiles()
const html = files.filter(([name]) => name.endsWith('.html'))
const css = readFileSync(join(ROOT, 'relium.css'), 'utf8')

test('the scan is actually looking at the site', () => {
  // A checker that silently found nothing to check is worse than no checker.
  assert.ok(html.length >= 7, `expected the site's pages, found ${html.length}`)
  assert.ok(files.some(([name]) => name === 'relium.css'))
})

test('no relium.dev mailbox is published anywhere', () => {
  for (const [name, body] of files) {
    const found = body.match(/[A-Za-z0-9._%+-]+@relium\.dev/g)
    assert.equal(
      found,
      null,
      `${name} publishes ${found?.join(', ')} — none of those mailboxes exists`,
    )
  }
})

test('no mailbox of any domain is published either', () => {
  // The rule is "do not print an address that does not receive mail", and
  // swapping in a personal Gmail would satisfy the check above while breaking
  // the actual intent.
  for (const [name, body] of files) {
    const found = body.match(/mailto:[^"'\s>]+/gi)
    assert.equal(found, null, `${name} contains ${found?.join(', ')}`)
  }
})

test('the body background carries no repeating grid, in either theme', () => {
  // The grid was two 1px linear-gradients repeated at 48px. The radial washes
  // that remain are the atmosphere and must survive.
  const base = css.match(/\nbody\{[^}]*\}/)?.[0]
  const light = css.match(/:root\[data-theme="light"\] body\{[^}]*\}/)?.[0]

  assert.ok(base, 'could not find the body rule in relium.css')
  assert.ok(light, 'could not find the light-theme body rule in relium.css')

  for (const [label, rule] of [['dark/default', base], ['light', light]]) {
    assert.ok(
      !/linear-gradient/.test(rule),
      `the ${label} body background has a linear-gradient layer again`,
    )
    assert.ok(
      !/background-size/.test(rule),
      `the ${label} body background is tiling something again`,
    )
    assert.ok(
      /radial-gradient/.test(rule),
      `the ${label} body background lost its aurora`,
    )
  }
})

test('every page still loads the one stylesheet and no third party', () => {
  for (const [name, body] of html) {
    assert.match(body, /<link rel="stylesheet" href="\/relium\.css">/,
                 `${name} does not load relium.css`)
    const external = body.match(/(?:src|href)="https?:\/\/(?!relium\.dev|app\.relium\.dev|www\.relium\.dev)[^"]+"/g) || []
    const assets = external.filter((url) => !/^href="https?:\/\/github\.com/.test(url))
    assert.deepEqual(
      assets.filter((url) => /\.(js|css|woff2?)"/.test(url)),
      [],
      `${name} loads a third-party asset: ${assets.join(', ')}`,
    )
  }
})

/**
 * The prices, per page that prints them.
 *
 * Written as an exact list rather than "does not contain $250": a checker that
 * only forbids the old number says nothing about the new one, and would pass
 * happily on a page that had lost its Pro card altogether.
 */
const PRICES = { Free: '$0', Starter: '$99', Pro: '$249' }

function planCards(body) {
  // Each card is <span class="plan-name">NAME</span> ... <span
  // class="plan-amount">$N</span>, in that order, inside the same card.
  const cards = {}
  const pattern = /class="plan-name">([^<]+)<[\s\S]{0,600}?class="plan-amount">([^<]+)</g
  let match = pattern.exec(body)
  while (match) {
    cards[match[1].trim()] = match[2].trim()
    match = pattern.exec(body)
  }
  return cards
}

test('every page that prints a price prints the right one', () => {
  const pages = html.filter(([, body]) => body.includes('plan-amount'))
  assert.ok(pages.length >= 2, `expected the pricing surfaces, found ${pages.length}`)

  for (const [name, body] of pages) {
    const cards = planCards(body)
    assert.deepEqual(
      cards,
      PRICES,
      `${name} does not price the plans as ${JSON.stringify(PRICES)}`,
    )
  }
})

test('no page still advertises a superseded price', () => {
  for (const [name, body] of files) {
    assert.ok(!/\$\s?250/.test(body), `${name} still shows $250`)
    assert.ok(!/\$\s?149/.test(body), `${name} still shows $149`)
  }
})

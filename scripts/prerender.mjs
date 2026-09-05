import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const htmlPath = resolve('dist/index.html')
const serverEntryPath = resolve('node_modules/.shafi-prerender/entry-server.js')
const rootMarker = '<div id="root"></div>'
let html = await readFile(htmlPath, 'utf8')

if (!html.includes(rootMarker)) {
  throw new Error('Unable to prerender: the root marker is missing from dist/index.html.')
}

const { render } = await import(pathToFileURL(serverEntryPath).href)
await writeFile(resolve('dist/admin.html'), html.replace('</head>', '<meta name="robots" content="noindex,nofollow" /></head>'))
const appHtml = render()
html = html.replace(rootMarker, `<div id="root">${appHtml}</div>`)

const stylesheetPattern = /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/
const stylesheetMatch = html.match(stylesheetPattern)

if (!stylesheetMatch) {
  throw new Error('Unable to inline critical styles: the production stylesheet was not found.')
}

const stylesheetPath = resolve('dist', stylesheetMatch[1].replace(/^\//, ''))
const stylesheet = await readFile(stylesheetPath, 'utf8')
const prerenderedHtml = html.replace(stylesheetPattern, `<style>${stylesheet}</style>`)

await writeFile(htmlPath, prerenderedHtml)
console.log('Prerendered the landing page and inlined its styles into dist/index.html.')

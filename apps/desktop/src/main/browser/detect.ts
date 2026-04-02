import { execSync } from 'child_process'
import fs from 'fs'
import type { BrowserInfo, BrowserType } from '../../shared/types'

interface BrowserCandidate {
  type: BrowserType
  name: string
  engine: 'chromium' | 'gecko'
  linuxPaths: string[]
  linuxCommands: string[]
  windowsPaths: string[]
  macPaths: string[]
}

const BROWSER_CANDIDATES: BrowserCandidate[] = [
  {
    type: 'chrome',
    name: 'Google Chrome',
    engine: 'chromium',
    linuxPaths: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/opt/google/chrome/google-chrome'
    ],
    linuxCommands: ['google-chrome', 'google-chrome-stable'],
    windowsPaths: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    macPaths: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  },
  {
    type: 'brave',
    name: 'Brave',
    engine: 'chromium',
    linuxPaths: [
      '/usr/bin/brave-browser',
      '/usr/bin/brave-browser-stable',
      '/opt/brave.com/brave/brave-browser'
    ],
    linuxCommands: ['brave-browser', 'brave-browser-stable'],
    windowsPaths: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
    ],
    macPaths: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser']
  },
  {
    type: 'edge',
    name: 'Microsoft Edge',
    engine: 'chromium',
    linuxPaths: [
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/opt/microsoft/msedge/msedge'
    ],
    linuxCommands: ['microsoft-edge', 'microsoft-edge-stable'],
    windowsPaths: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ],
    macPaths: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
  },
  {
    type: 'firefox',
    name: 'Firefox',
    engine: 'gecko',
    linuxPaths: ['/usr/bin/firefox', '/usr/lib/firefox/firefox', '/snap/bin/firefox'],
    linuxCommands: ['firefox'],
    windowsPaths: [
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
    ],
    macPaths: ['/Applications/Firefox.app/Contents/MacOS/firefox']
  },
  {
    type: 'opera',
    name: 'Opera',
    engine: 'chromium',
    linuxPaths: ['/usr/bin/opera', '/usr/lib/x86_64-linux-gnu/opera/opera'],
    linuxCommands: ['opera'],
    windowsPaths: [
      'C:\\Program Files\\Opera\\launcher.exe',
      'C:\\Program Files (x86)\\Opera\\launcher.exe'
    ],
    macPaths: ['/Applications/Opera.app/Contents/MacOS/Opera']
  },
  {
    type: 'vivaldi',
    name: 'Vivaldi',
    engine: 'chromium',
    linuxPaths: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable'],
    linuxCommands: ['vivaldi', 'vivaldi-stable'],
    windowsPaths: [
      'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe'
    ],
    macPaths: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi']
  },
  {
    type: 'chromium',
    name: 'Chromium',
    engine: 'chromium',
    linuxPaths: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
    linuxCommands: ['chromium', 'chromium-browser'],
    windowsPaths: [],
    macPaths: ['/Applications/Chromium.app/Contents/MacOS/Chromium']
  }
]

function getBrowserVersion(executablePath: string): string {
  try {
    const output = execSync(`"${executablePath}" --version 2>/dev/null`, {
      timeout: 5000,
      encoding: 'utf-8'
    }).trim()
    // Trích xuất phiên bản từ output (vd: "Google Chrome 120.0.6099.109")
    const match = output.match(/(\d+\.\d+\.\d+\.\d+|\d+\.\d+\.\d+|\d+\.\d+)/)
    return match ? match[1] : 'unknown'
  } catch {
    return 'unknown'
  }
}

function findExecutable(candidate: BrowserCandidate): string | null {
  const platform = process.platform

  let paths: string[] = []
  if (platform === 'linux') {
    paths = candidate.linuxPaths
  } else if (platform === 'win32') {
    paths = candidate.windowsPaths
  } else if (platform === 'darwin') {
    paths = candidate.macPaths
  }

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  // Thử tìm qua which (Linux/macOS)
  if (platform !== 'win32' && candidate.linuxCommands) {
    for (const cmd of candidate.linuxCommands) {
      try {
        const result = execSync(`which ${cmd} 2>/dev/null`, {
          timeout: 3000,
          encoding: 'utf-8'
        }).trim()
        if (result && fs.existsSync(result)) {
          return result
        }
      } catch {
        // Bỏ qua
      }
    }
  }

  return null
}

export function detectInstalledBrowsers(): BrowserInfo[] {
  const browsers: BrowserInfo[] = []

  for (const candidate of BROWSER_CANDIDATES) {
    const executablePath = findExecutable(candidate)
    if (executablePath) {
      const version = getBrowserVersion(executablePath)
      browsers.push({
        type: candidate.type,
        name: candidate.name,
        version,
        executablePath,
        engine: candidate.engine
      })
    }
  }

  return browsers
}

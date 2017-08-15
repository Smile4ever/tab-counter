/* src/background.js
 * Originally created 3/10/2017 by DaAwesomeP
 * This is the background task file of the extension
 * https://github.com/DaAwesomeP/tab-counter
 *
 * Copyright 2017-present DaAwesomeP
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global _ */

const updateIcon = async function updateIcon () {
  // Get tab counter setting
  let settings = await browser.storage.local.get()
  let counterPreference = settings.counter || 0

  // Get current tab to update badge in
  let currentTab = (await browser.tabs.query({ currentWindow: true, active: true }))[0]

  if (counterPreference === 0) { // Badge shows current window
    // Get tabs in current window
    let currentWindow = await browser.tabs.query({ currentWindow: true })
    if (typeof currentTab !== 'undefined') {
      browser.browserAction.setBadgeText({
        text: (await currentWindow).length.toString(),
        tabId: currentTab.id
      })
    }
  } else if (counterPreference === 1) { // Badge shows total of all windows
    // Get tabs in all windows
    let countAll = await browser.tabs.query({})
    if (typeof currentTab !== 'undefined') {
      browser.browserAction.setBadgeText({
        text: (await countAll).length.toString(),
        tabId: currentTab.id
      })
    }
  } else if (counterPreference === 2) { // Badge shows both (Firefox limits to about 4 characters based on width)
    // Get both tabs in current window and in all windows
    let currentWindow = await browser.tabs.query({ currentWindow: true })
    let countAll = await browser.tabs.query({})
    if (typeof currentTab !== 'undefined') {
      browser.browserAction.setBadgeText({
        text: `${(await currentWindow).length}/${(await countAll).length}`,
        tabId: currentTab.id
      })
    }
  }
}

// Prevent from firing too frequently or flooding at a window or restore
const lazyUpdateIcon = _.debounce(updateIcon, 250)

// Will be error if tab has been removed, so wait 150ms;
// onActivated fires slightly before onRemoved,
// but tab is gone during onActivated.
// Must be a function to avoid event parameter errors
const update = function update () { setTimeout(lazyUpdateIcon, 150) }

// Init badge for when addon starts and not yet loaded tabs
browser.browserAction.setBadgeText({text: 'wait'})
browser.browserAction.setBadgeBackgroundColor({color: '#000000'})

// Watch for tab and window events five seconds after browser startup
setTimeout(() => {
  browser.tabs.onActivated.addListener(update)
  browser.tabs.onAttached.addListener(update)
  browser.tabs.onCreated.addListener(update)
  browser.tabs.onDetached.addListener(update)
  browser.tabs.onMoved.addListener(update)
  browser.tabs.onReplaced.addListener(update)
  browser.tabs.onRemoved.addListener(update)
  browser.tabs.onUpdated.addListener(update)
  browser.windows.onFocusChanged.addListener(update)
}, 5000)

// Load and apply icon and badge color settings
const checkSettings = async function checkSettings () {
  // Get settings object
  let settings = await browser.storage.local.get()

  // Perform settings upgrade (placeholder, no breaking changes yet)
  if (settings.hasOwnProperty('version')) {
    if (settings.version !== browser.runtime.getManifest().version) {
      // Upgrade
    }
  } else {
    // New
  }

  // Apply badge color or use default
  if (settings.hasOwnProperty('badgeColor')) browser.browserAction.setBadgeBackgroundColor({color: settings.badgeColor})
  else browser.browserAction.setBadgeBackgroundColor({color: '#000000'})

  // Apply icon selection or use default
  if (settings.hasOwnProperty('icon')) browser.browserAction.setIcon({path: `icons/${settings.icon}`})
  else browser.browserAction.setIcon({path: 'icons/tabcounter.plain.min.svg'})
}

// Load settings and update badge at app start
const applyAll = async function applyAll () {
  await checkSettings()  // Icon and badge color
  await update()         // Badge text options
}
checkSettings()

// Listen for settings changes and update color, icon, and badge text instantly
browser.storage.onChanged.addListener(applyAll)

'use strict'
/* global chrome, moment */

let activeTree = {} // timer: null,
                    // createdTime: null,
                    // grownTime: null

let updateExtLabelTimer = null
let minutesLeft = null

let blacklistedUrls = null
let trees = false

let clearExtLabel = () => {
    chrome.browserAction.setBadgeText({
        text: ''
    })
}

let setExtLabel = () => {
    minutesLeft = activeTree.grownTime.diff(moment(), 'minutes').toString()
    chrome.browserAction.setBadgeText({
        text: minutesLeft
    })

    // alert the popup if it is open
    chrome.runtime.sendMessage({
        action: 'treeUpdate',
        timeLeft: minutesLeft
    }, (response) => {
        console.log('tree update: ack')
    })
}

let watchExtLabel = () => {
    if (updateExtLabelTimer) {
        clearInterval(updateExtLabelTimer)
    }

    setExtLabel()
    updateExtLabelTimer = setInterval(() => {
        setExtLabel()
    }, 60000)
}

let treeGone = () => {
    clearInterval(updateExtLabelTimer)
    clearExtLabel()
    activeTree = {}
}

let syncTrees = () => {
    if (!trees) {
        // if $scope.trees hasn't been initialized,
        // download data from Chrome storage
        chrome.storage.sync.get(['trees'], (items) => {
            console.log(items)
            trees = items.trees
            if (!items.trees) {
                trees = {}
            }
        })
        console.log('trees downloaded from storage')
    }
    else {
        // if $scope.trees has already been initialized,
        // sync local updates to Chrome storage
        chrome.storage.sync.set({ 'trees': trees }, () => {})
        console.log('trees uploaded to storage')
    }

    console.log(trees)
}

let handleBlacklistedSiteNav = (tabId, url, processId, frameId, timeStamp) => {
    if (activeTree.grownTime) {
        console.log('killing tree')
        // kill the tree!
        treeGone()
        chrome.notifications.create({
            iconUrl: 'images/icon-128.png',
            type: 'basic',
            title: 'Your tree has withered!',
            message: 'You accessed a blacklisted site and your tree has died.'
        })

        chrome.runtime.sendMessage({
            action: 'treeWithered'
        }, (response) => {
            console.log('tree withered: ack')
        })
    }
}

let reloadBlacklist = () => {
    console.log('reloading blacklists')
    chrome.storage.sync.get(['blockedSites'], (items) => {
        console.log(items)
        if (items.blockedSites) {
            blacklistedUrls = items.blockedSites.map((n) => {
                return { hostSuffix: n }
            })
            console.log(blacklistedUrls)
        }
        else {
            blacklistedUrls = [
                { hostSuffix: 'polr.me' }
            ]
        }

        if (chrome.webNavigation.onCompleted.hasListener(handleBlacklistedSiteNav)) {
            console.log('removing old listener')
            chrome.webNavigation.onCompleted.removeListener(handleBlacklistedSiteNav)
        }
        // register webNavigation listeners
        chrome.webNavigation.onCompleted.addListener(handleBlacklistedSiteNav, {url: blacklistedUrls})
    })
}

chrome.runtime.onInstalled.addListener(details => {
    console.log('previousVersion', details.previousVersion)
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let action = request.action

    if (action == 'plantTree') {
        let treeMins = request.tree.minutes

        activeTree.createdTime = moment()
        activeTree.grownTime = moment().add(treeMins, 'minutes')

        watchExtLabel()

        activeTree.timer = setTimeout(() => {
            console.log('Active tree timer elapsed.')

            let timeFocused = activeTree.grownTime.diff(activeTree.createdTime, 'minutes')

            chrome.runtime.sendMessage({
                action: 'treeGrown',
                elapsedTime: timeFocused
            }, (response) => {
                console.log('tree grown: ack')
            })

            chrome.notifications.create({
                iconUrl: 'images/icon-128.png',
                type: 'basic',
                title: 'Your tree has grown!',
                message: 'Your tree has successfully grown. You were focused for ' + timeFocused + ' minutes!'
            })

            let timeStamp = moment().format('MM/DD/YYYY')

            if (!trees[timeStamp]) {
                trees[timeStamp] = []
            }

            trees[timeStamp].push({
                timeFocused: timeFocused
            })

            syncTrees()
            treeGone()
        }, treeMins * 60 * 1000)

        console.log('sending response')
        sendResponse({
            ack: true
        })
    }
    else if (action == 'giveUpTree') {
        treeGone()
        chrome.notifications.create({
            iconUrl: 'images/icon-128.png',
            type: 'basic',
            title: 'Your tree has withered!',
            message: 'You gave up on your tree. Without water, it died.'
        })
    }
    else if (action == 'getTreeInfo') {
        // Return details on current tree
        sendResponse({
            ack: true,
            timeLeft: minutesLeft,
            activeTree: activeTree
        })
    }
    else if (action == 'reloadBlacklist') {
        // Load blacklist from storage
        reloadBlacklist()
    }


    console.log(sender, request)
})


reloadBlacklist()
syncTrees()

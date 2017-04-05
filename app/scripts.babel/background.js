'use strict'
/* global chrome, moment */

let activeTree = {} // timer: null,
                    // createdTime: null,
                    // grownTime: null

let woodlotTrees = {}
let updateExtLabelTimer = null
let minutesLeft = null

let blacklistedUrls = [
    { hostSuffix: 'polr.me' }
]

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
    }, function(response) {
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
            chrome.runtime.sendMessage({
                action: 'treeGrown',
                elapsedTime: activeTree.grownTime.diff(activeTree.createdTime, 'minutes')
            }, function(response) {
                console.log('tree grown: ack')
            })

            treeGone()
        }, treeMins * 60 * 1000)

        console.log('sending response')
        sendResponse({
            ack: true
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
    else if (action == 'giveUpTree') {
        treeGone()
        chrome.notifications.create({
            iconUrl: 'images/icon-128.png',
            type: 'basic',
            title: 'Your tree has withered!',
            message: 'You gave up on your tree. Without water, it died.'
        })
    }

    console.log(sender, request)
})

chrome.webNavigation.onCompleted.addListener((tabId, url, processId, frameId, timeStamp) => {
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
        }, function(response) {
            console.log('tree withered: ack')
        })
    }
}, {url: blacklistedUrls})

'use strict'
/* global chrome, moment */

let activeTree = {
    // timer: null,
    // createdTime: null,
    // grownTime: null
}

let woodlotTrees = {}
let updateExtLabelTimer = null
let minutesLeft = null

function clearExtLabel() {
    chrome.browserAction.setBadgeText({
        text: ''
    })
}

function setExtLabel() {
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

function watchExtLabel() {
    if (updateExtLabelTimer) {
        clearInterval(updateExtLabelTimer)
    }

    setExtLabel()
    updateExtLabelTimer = setInterval(() => {
        setExtLabel()
    }, 60000)
}

chrome.runtime.onInstalled.addListener(details => {
    console.log('previousVersion', details.previousVersion)
})

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
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

                clearInterval(updateExtLabelTimer)
                clearExtLabel()
                activeTree = {}
            }, treeMins * 60 * 1000)

            console.log('sending response')
            sendResponse({
                ack: true
            })
        } else if (action == 'getTreeInfo') {
            // Return details on current tree
            sendResponse({
                ack: true,
                timeLeft: minutesLeft,
                activeTree: activeTree
            })
        }

        console.log(sender, request)
    })

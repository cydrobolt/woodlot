'use strict'
/* global chrome */

$(() => {
    chrome.storage.sync.get(['blockedSites'], (items) => {
        if (items.blockedSites) {
            let blockedSitesRaw = items.blockedSites.join('\n')
            $('.blocked-sites').val(blockedSitesRaw)
        }
    })

    $('.save-btn').click(() => {
        let blockedSitesRaw = $('.blocked-sites').val()
        let blockedSites = blockedSitesRaw.split('\n')

        // remove empty entries
        blockedSites = blockedSites.filter(n => n)

        console.log(blockedSites)

        chrome.storage.sync.set({ 'blockedSites': blockedSites }, () => {
            chrome.runtime.sendMessage({
                action: 'reloadBlacklist'
            })
        })
    })
})

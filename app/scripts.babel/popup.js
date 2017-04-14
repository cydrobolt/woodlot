'use strict'
/* global angular, chrome, moment */

var woodlot = angular.module('woodlot', [])

woodlot.controller('PopupCtrl', ['$scope', ($scope) => {
    $scope.state = {
        treeActive: false,
        timeLeft: null,
        showWoodlot: false
    }

    $scope.trees = false

    $scope.syncTrees = () => {
        chrome.storage.sync.get(['trees'], (items) => {
            console.log(items)
            $scope.trees = items.trees
            if (!items.trees) {
                $scope.trees = {}
            }
        })
        console.log('trees downloaded from storage')
    }

    $scope.treeGone = () => {
        $scope.state.timeLeft = null
        $scope.state.treeActive = false

        $scope.$digest()
    }

    $scope.plantTree = () => {
        let treeTime = $('.plant-time').val()

        if (parseInt(treeTime) < 1) {
            return false
        }

        chrome.runtime.sendMessage({
            action: 'plantTree',
            tree: {
                minutes: treeTime
            }
        }, (response) => {
            console.log('received response for plantTree')
            console.log(response)
        })

        $scope.state.treeActive = true
        $scope.$digest()
    }

    $scope.giveUpTree = () => {
        // kills tree
        chrome.runtime.sendMessage({
            action: 'giveUpTree'
        })
        $scope.treeGone()
    }

    $scope.init = () => {
        console.log('Loaded PopupCtrl')

        // get tree status
        chrome.runtime.sendMessage({
            action: 'getTreeInfo'
        }, (response) => {
            let timeLeft = response.timeLeft
            let treeActive = !$.isEmptyObject(response.activeTree)
            $scope.state.treeActive = treeActive

            console.log(response)

            $scope.state.timeLeft = timeLeft

            $scope.$digest()
        })

        // listen for updates from background.js
        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                if (request.action == 'treeGrown') {
                    console.log('tree grown!!')
                    let timeFocused = request.elapsedTime
                    // send a notification to the user

                    $scope.syncTrees()
                    $scope.treeGone()
                }

                else if (request.action == 'treeUpdate') {
                    $scope.state.timeLeft = request.timeLeft
                    $scope.$digest()
                }

                else if (request.action == 'treeWithered') {
                    $scope.treeGone()
                }

                console.log(sender, request)
            }
        )

        $scope.syncTrees()
    }

    $scope.init()
}])

console.log('Initialized woodlot module')

'use strict'
/* global angular, chrome */

var woodlot = angular.module('woodlot', [])

woodlot.controller('PopupCtrl', ['$scope', ($scope) => {
    $scope.state = {
        treeActive: false,
        timeLeft: null
    }

    $scope.init = function() {
        console.log('Loaded PopupCtrl')

        // get tree status
        chrome.runtime.sendMessage({
            action: 'getTreeInfo'
        }, function(response) {
            let timeLeft = response.timeLeft
            let treeActive = !$.isEmptyObject(response.activeTree)
            $scope.state.treeActive = treeActive

            console.log(response)

            $scope.state.timeLeft = timeLeft

            $scope.$digest()
        })

        // listen for updates from background.js
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if (request.action == 'treeGrown') {
                    let focusedTime = request.elapsedTime
                    // send a notification to the user
                    chrome.notifications.create({
                        iconUrl: 'images/icon-128.png',
                        type: 'basic',
                        title: 'Your tree has grown!',
                        message: 'Your tree has successfully grown. You were focused for ' + focusedTime + ' minutes!'
                    })

                    $scope.state.timeLeft = null
                    $scope.state.treeActive = false

                    $scope.$digest()
                }

                else if (request.action == 'treeUpdate') {
                    $scope.state.timeLeft = request.timeLeft
                    $scope.$digest()
                }

                console.log(sender, request)
            }
        )
    }

    $scope.plantTree = function() {
        chrome.runtime.sendMessage({
            action: 'plantTree',
            tree: {
                minutes: $('.plant-time').val()
            }
        }, function(response) {
            console.log('received response for plantTree')
            console.log(response)
        })

        $scope.state.treeActive = true
        $scope.$digest()
    }

    $scope.viewWoodlot = function() {

    }

    $scope.init()
}])

console.log('Initialized woodlot module')

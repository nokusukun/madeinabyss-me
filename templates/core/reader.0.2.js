function parseParams(str) {
    return str.split('&').reduce(function(params, param) {
        var paramSplit = param.split('=').map(function(value) {
            return decodeURIComponent(value.replace('+', ' '));
        });
        params[paramSplit[0]] = paramSplit[1];
        return params;
    }, {});
}


var app = angular.module('mangaReader', ['cfp.hotkeys']);

app.config(['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('{a');
    $interpolateProvider.endSymbol('a}');
  }]);

app.directive('fadeIn', function($timeout) {
    return {
        restrict: 'A',
        link: function($scope, $element, attrs) {
            $element.addClass("ng-hide-remove");
            $element.on('load', function() {
                $element.addClass("ng-hide-add");
            });
        }
    };
})

app.controller('mangaReaderController', function($scope, $http, hotkeys, preloader) {
    //var externalParams = parseParams(window.location.hash.substr(1));
    var externalParams = parseParams(window.location.search.replace("?", ""));
    console.log(externalParams);
    localStorage.lastPage = externalParams.page || localStorage.lastPage;
    if (!externalParams.page && externalParams.chapter) {
        localStorage.lastPage = 1;
        console.log("Resetting Page Progress");
    }
    localStorage.lastChapter = externalParams.chapter || localStorage.lastChapter || 1;
    console.log(localStorage.lastChapter);

    $scope.singlePageMode = localStorage.singlePageMode || false;
    $scope.zoomLevel = Number(localStorage.zoomLevel) || 80;
    $scope.currentPage = Number(localStorage.lastPage) || 1;
    $scope.chapter = localStorage.lastChapter || 1;
    $scope.preloadRange = 0;

    $http.get("get/" + $scope.chapter)
        .then(function(response) {
            console.log(response.data);
            $scope.mangaData = response.data;
            $scope.totalPages = response.data.pages.length;
            $scope.pageLink = $scope.mangaData.pages[$scope.currentPage - 1].link;
            $scope.prevDisabled = $scope.currentPage <= 1;
            $scope.nextDisabled = $scope.currentPage >= $scope.totalPages;
            $scope.pageChange();

            if (response.data.pages[2].link.indexOf("mixtape.moe") == -1) {
                console.log("Running Image Preload");
                $scope.preload();
            } else {
                $scope.doneLoading = true;
            }
        });

    $http.get("/chapters")
        .then(function(response) {
            console.log(response.data);
            $scope.chapters = response.data;
            $(document).ready(function() {
                var x = $("option[value='" + $scope.chapter + "']")
                console.log(x);
                x.prop("selected", true);
                $('select').material_select();
            });
        });


    $scope.makeSinglePageMode = function() {
        console.log("Single Page Mode!");
        var sPagePanel = $("#single-page-panel");
        for(page in $scope.mangaData.pages){
            sPagePanel.append(`<img id='spp-page-${page}' class='responsive-img' src=${$scope.mangaData.pages[page].link}>`);
        }
        $scope.singlePageMode = true;
        setTimeout( function () {
            $('html, body').animate({
                scrollTop: $(`#spp-page-${$scope.currentPage - 1}`).offset().top
            }, 2000);   
        }, 500);
        
    }

    $scope.makeMultiPageMode = function() {
        var sPagePanel = $("#single-page-panel");
        sPagePanel.html("");
        $("html, body").animate({scrollTop: 50}, 300);
        setTimeout( function() {
            $scope.singlePageMode = false;
            $scope.$apply(); 
        }, 100);
    }

    $scope.zoomIn = function() {
        $scope.zoomLevel += 10;
        localStorage.zoomLevel = $scope.zoomLevel;
        $scope.zOutDisable = $scope.zoomLevel <= 40;
        $scope.zInDisable = $scope.zoomLevel >= 90;
    }

    $scope.zoomOut = function() {
        $scope.zoomLevel -= 10;
        localStorage.zoomLevel = $scope.zoomLevel;
        $scope.zInDisable = $scope.zoomLevel >= 90;
        $scope.zOutDisable = $scope.zoomLevel <= 40;
    }

    $scope.nextPage = function() {
        console.log("Next Page");
        $scope.currentPage += 1;
        $scope.pageLink = $scope.mangaData.pages[$scope.currentPage - 1].link;
        $scope.pageChange();
        $scope.preloadRange += 1;
        if ($scope.preloadRange > 4) {
            $scope.preload();
        }
    }

    $scope.prevPage = function() {
        console.log("Prev Page");
        $scope.currentPage -= 1;
        $scope.pageLink = $scope.mangaData.pages[$scope.currentPage - 1].link;
        $scope.pageChange();
        $scope.preloadRange -= 1;
        if ($scope.preloadRange < -4) {
            $scope.preload();
        }
    }

    $scope.nextChapter = function() {
        console.log("Next Chapter");
        //window.location.hash = "chapter=" + $scope.mangaData.next_chapter;
        //location.reload();
        window.location.search = `chapter=${$scope.mangaData.next_chapter}`;
    }

    $scope.prevChapter = function() {
        console.log("Prev Chapter");
        //window.location.hash = "chapter=" + $scope.mangaData.prev_chapter;
        //location.reload();
        window.location.search = `chapter=${$scope.mangaData.prev_chapter}`;
    }

    $scope.navigateChapter = function() {
        console.log("Navigate Chapter");
        //window.location.hash = "chapter=" + $scope.jumpchapter;
        window.location.search = `chapter=${$scope.jumpchapter}`;
    }

    $scope.changeUrl = function(title, url) {
        if (typeof (history.pushState) != "undefined") {
            var obj = { Title: title, Url: url };
            history.pushState(obj, obj.Title, obj.Url);
        }
    }

    $scope.pageChange = function() {
        $scope.nextDisabled = $scope.currentPage >= $scope.totalPages;
        $scope.prevDisabled = $scope.currentPage <= 1;
        $scope.mixTape = $scope.pageLink.indexOf("mixtape.moe") !== -1;
        var params = $.param({
            chapter: $scope.chapter,
            page: $scope.currentPage
        });
        localStorage.lastChapter = $scope.chapter;
        localStorage.lastPage = $scope.currentPage;
        //document.documentElement.scrollTop = 0;
        $("html, body").animate({scrollTop: 50}, 300);
        document.title = `Made in Abyss Chapter ${$scope.chapter} - ${$scope.mangaData.title}`
        $scope.changeUrl(document.title, window.location.origin + "/m?" + params);
    }

    $scope.preload = function() {
        $scope.doneLoading = false;
        console.log("Loading Images...");
        start = ($scope.currentPage - 5 >= 0) ? $scope.currentPage - 5 : 0
        end = $scope.currentPage + 7
        console.log(start + "/" + end);
        console.log($scope.mangaData.pages.map(function(x) {
                return x.link
            })
            .slice(start, end));
        preloader.preloadImages(
                $scope.mangaData.pages.map(function(x) {
                    return x.link
                })
                .slice(start, end))
            .then(
                function() {
                    $scope.doneLoading = true;
                },
                function error() {},
                function handleNotify(event) {
                    $scope.percentLoaded = event.percent;
                    console.info("Percent loaded:", event.percent);
                });
        $scope.preloadRange = 0;
    }

    hotkeys.add({
        combo: 'right',
        description: 'Next Page',
        callback: function() {
            if (!$scope.nextDisabled) {
                $scope.nextPage();
            }
        }
    });

    hotkeys.add({
        combo: 'left',
        description: 'Previous Page',
        callback: function() {
            if (!$scope.prevDisabled) {
                $scope.prevPage();
            }
        }
    });

});
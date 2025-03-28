/**
 * An object containing the search result for a single topic/HTML page.
 * Contains pointer to the topicID, title, short description and the list of words that were found.
 *
 * @param {string} topicID The ID of the topic. Can be used to identify unique a document in the search result.
 * @param {string} relativePath The relative path to the topic.
 * @param {string} title The topic title.
 * @param {string} shortDescription The topic short description.
 * @param {[string]} words The array with words contained by this topic.
 * @param {int} scoring The search scoring computed for this document.
 * @param {int} startsWith The number used to display 5 stars ranking.
 * @param {int} resultID The search result ID.
 * @param {int} linkID The search link ID.
 * @constructor
 */
function SearchResultInfo(topicID, relativePath, title, shortDescription, words, scoring, starWidth, resultID, linkID) {
    this.topicID = topicID;
    this.relativePath = relativePath;
    this.title = title;
    this.shortDescription = shortDescription;
    this.words = words;
    this.scoring = scoring;
    this.starWidth = starWidth;
    this.resultID = resultID;
    this.linkID = linkID;
    this.similarResults = [];
}

/**
 * Last displayed search results items.
 * @type {Array}
 */
var lastSearchResultItems = [];

/**
 * Last displayed search result.
 * @type {Array}
 */
var lastSearchResult;

/**
 * Pre process search result to compute similar results and scoring.
 * The lastSearchResultItems variable will be updated.
 *
 * @param searchResult The seach result to process.
 * @param whDistribution The WebHelp distribution.
 */
function preprocessSearchResult(searchResult, whDistribution) {
    lastSearchResult = searchResult;
    lastSearchResultItems = [];

    var wh_mobile =
        (typeof whDistribution != 'undefined') && whDistribution == 'wh-mobile';
    var wh_Classic =
        (typeof whDistribution != 'undefined') && whDistribution == 'wh-classic';


    if (searchResult.documents !== undefined && searchResult.documents.length > 0) {
		
        var allPages = searchResult.documents;
		var filterPages = new Array();
		
		// STORAGE 保存KEY + 手册名称ID
		var STORAGE_HIK_MANUALID_TOPIC = 'HIK_MANUALID_TOPIC_' + $('#document-id').text();
		// 取得 COOKIE_HIK_MANUAL 
		var storage_guidString = localStorage.getItem(STORAGE_HIK_MANUALID_TOPIC);
		// 目录显示的 guid 
		var guidDisplayArray = new Array();
		if(storage_guidString) {
			guidDisplayArray = storage_guidString.split(',');
			// searchResult 删除不显示的guid 
			console.log("storage key >>>" , STORAGE_HIK_MANUALID_TOPIC);
			console.log("storage content >>>" , storage_guidString);
			console.log("SearchResult 删除不显示的 guid ");
		}
		//
		if(guidDisplayArray.length > 0){
			for (var page = 0; page < allPages.length; page++) {
				var html_href = allPages[page].relativePath;
				var guid = html_href.substring(html_href.indexOf("GUID-"));
				guid = guid.substring(0, guid.indexOf("="));
				if(guidDisplayArray.indexOf(guid) > -1){
					//可显示
					filterPages.push(allPages[page]);
				}
			}
			allPages = filterPages;
		}
		
        // The score for fist item
        var ttScore_first = 1;
        if (allPages.length > 0) {
            ttScore_first = allPages[0].scoring;
        }

        var currentSimilarPage;
        console.log("SearchResult count: " + allPages.length);
        for (var page = 0; page < allPages.length; page++) {
			
            if (allPages[page].relativePath == 'toc.html') {
                continue;
            }

            var starWidth = 0;
            if (typeof webhelpSearchRanking != "undefined" && webhelpSearchRanking) {
                var hundredPercent = allPages[page].scoring + 100 * allPages[page].words.length;
                var numberOfWords = allPages[page].words.length;
                /*debug("hundredPercent: " + hundredPercent + "; ttScore_first: " + ttScore_first + "; numberOfWords: " + numberOfWords);*/
                var ttScore = allPages[page].scoring;

                // Fake value
                var maxNumberOfWords = allPages[page].words.length;
                starWidth = (ttScore * 100 / hundredPercent) / (ttScore_first / hundredPercent) * (numberOfWords / maxNumberOfWords);
                starWidth = starWidth < 10 ? (starWidth + 5) : starWidth;
                // Keep the 5 stars format
                if (starWidth > 85) {
                    starWidth = 85;
                }
            }

            var idLink = 'foundLink' + page;
            var idResult = 'foundResult' + page;

            // topicID, relativePath, title, shortDescription, words, scoring, starWidth, resultID, linkID, similarResults
            var csri = new SearchResultInfo(
                allPages[page].topicID,
                allPages[page].relativePath,
                allPages[page].title,
                allPages[page].shortDescription,
                allPages[page].words,
                allPages[page].scoring,
                starWidth,
                idResult,
                idLink
            );

            // Similar pages
            var similarPages = !wh_mobile && similarPage(allPages[page], allPages[page - 1]);
            if (!similarPages) {
                currentSimilarPage = csri;
                lastSearchResultItems.push(csri);
            } else {
                currentSimilarPage.similarResults.push(csri);
            }

        }
    }
}


/**
 * Compute the HTML to be displayed in the search results page.
 *
 * @param whDistribution The string with WebHelp distribution. One of wh-classic, wh-mobile or wh-responsive.
 * @param pageNumber The page number to display.
 * @param totalPageNumber The total page number.
 * @param itemsPerPage The number of items to display on a page.
 * @returns {string} The HTML to be displayed as search result.
 */
function computeHTMLResult(whDistribution, pageNumber, totalPageNumber, itemsPerPage) {
    var linkTab = [];
    var results = "";

    var wh_mobile =
        (typeof whDistribution != 'undefined') && whDistribution == 'wh-mobile';
    var wh_Classic =
        (typeof whDistribution != 'undefined') && whDistribution == 'wh-classic';

    if (lastSearchResult.searchExpression.length > 0) {
        if (lastSearchResultItems.length > 0) {

            // Start and end index dependin on the current presented page
            var s = 0;
            var e = lastSearchResultItems.length;

            if (typeof pageNumber != "undefined" && typeof itemsPerPage != "undefined") {
                s = (pageNumber - 1) * itemsPerPage;
                e = Math.min(s + itemsPerPage, lastSearchResultItems.length);
            }

            // Result for: word1 word2
            var txt_results_for = "Results for:";
            var txt_results_for_cn ="Results for: cn"

            var results_headerHTML = "<div class=\"wt_search_results_header\">";
            results_headerHTML += "<div class=\"wt_search_results_header_docs\">";
/*            console.log( $('#lang').text().indexOf("cn")>0);*/
            if ( $('#lang').text().toLowerCase().indexOf("cn")>=0){
                results_headerHTML +=
                "已搜到 "+lastSearchResultItems.length + " 条结果"; 
                // +"关于“<span class=\"wt_search_expression\">" + lastSearchResult.originalSearchExpression + "</span>"+ "”的结果";
            }
            else{
            results_headerHTML +=
                lastSearchResultItems.length + " "
                + getLocalization(txt_results_for) + " " +
                "<span class=\"wt_search_expression\">" + lastSearchResult.originalSearchExpression + "</span>";
                }

            results_headerHTML += "</div>";
           if (typeof pageNumber != "undefined" && typeof totalPageNumber != "undefined" && totalPageNumber > 1) {
                /* headerHTML += "<div class=\"wt_search_results_header_pages\">";
                headerHTML += getLocalization('Page')+ " " + pageNumber + "/" + totalPageNumber;
                headerHTML += "</div>"; */
            }
            results_headerHTML += "</div>";  

            linkTab.push(results_headerHTML);

			// EXM-38967 Start numbering
            var start = (pageNumber - 1) * 10 + 1;
            linkTab.push("<ol class='searchresult' start=\"" + start + "\">");

            var allSearchWords = lastSearchResult.searchExpression.split(" ");

            for (var page = s; page < e; page++) {
                var csri = lastSearchResultItems[page];

                var hasSimilarPages =
                    csri.similarResults != null &&
                    csri.similarResults.length > 0;

                var siHTML = computeSearchItemHTML(
                    csri,
                    whDistribution,
                    hasSimilarPages,
                    null);
                linkTab.push(siHTML);

                if (hasSimilarPages) {
                    // Add HTML for similar pages
                    for (var smPage = 0; smPage < csri.similarResults.length; smPage++) {
                        var simHTML = computeSearchItemHTML(
                            csri.similarResults[smPage],
                            whDistribution,
                            false,
                            csri.resultID);

                        linkTab.push(simHTML);
                    }
                }
            }

            linkTab.push("</ol>");

            if (linkTab.length > 2) {
                results = "<div class='wt_search_results_items'>";
                for (var t in linkTab) {
                    results += linkTab[t].toString();
                }
                results += "</div>";
            } else {
                results = "";
                if ( $('#lang').text().toLowerCase().indexOf("cn")>=0){
                    results += "<div class='wt_search_results_for'>" +
                        "未搜到关于" + "<span class=\"wt_search_expression\"> " + lastSearchResult.originalSearchExpression + " </span>" + "的记录" + "</div>";
                }else{
                    results += "<div class='wt_search_results_for'>" +
                        getLocalization("Search no results") + " " + "<span class=\"wt_search_expression\">" + lastSearchResult.originalSearchExpression + "</span>" + "</div>";
                }
            }
        } else {
            results = "";
            if ( $('#lang').text().toLowerCase().indexOf("cn")>=0){
                results += "<div class='wt_search_results_for'>" +
                    "未搜到关于 " + "<span class=\"wt_search_expression\"> " + lastSearchResult.originalSearchExpression + " </span>" + " 的记录" + "</div>";
            }else{
                results += "<div class='wt_search_results_for'>" +
                    getLocalization("Search no results") + " " + "<span class=\"wt_search_expression\"> " + lastSearchResult.originalSearchExpression + " </span>" + "</div>";
            }
        }
    } else {
        // Search expression is empty. If there are stop words, display a message accordingly
        if (lastSearchResult.excluded.length > 0) {
            results = "";
            var p1 = "";
            if ( $('#lang').text().toLowerCase().indexOf("cn")>=0){
                p1 = getLocalization("no_results_only_stop_words1: cn");
            }else{
                p1 = getLocalization("no_results_only_stop_words1");
            }
            var pStr = "<p class=\"wt_search_results_for\">" + p1 + "</p>";
            results += pStr;

            var p2 = "";
            if ( $('#lang').text().toLowerCase().indexOf("cn")>=0){
                p2 = getLocalization("no_results_only_stop_words2: cn");
            }else{
                p2 = getLocalization("no_results_only_stop_words2");
            }
            var pStr = "<p  class=\"wt_search_results_for\">" + p2 + "</p>";
            results += pStr;
        }
    }

    return results;
}


/**
 * Compute the HTML for a single search result item.
 *
 * @param searchItem {SearchResultInfo} The search item to compute HTML.
 * @param whDistribution {String} The WebHelp distribution.
 * @param hasSimilarPages {Boolean} True if this item has similar results.
 * @param similarPageID {Boolean} It is set for a search item that is similar with another
 */
function computeSearchItemHTML(searchItem, whDistribution, hasSimilarPages, similarPageID) {
	//console.log("computeSearchItemHTML()");
    var htmlResult = "";

    var wh_mobile =
        (typeof whDistribution != 'undefined') && whDistribution == 'wh-mobile';
    var wh_Classic =
        (typeof whDistribution != 'undefined') && whDistribution == 'wh-classic';

    var allSearchWords = lastSearchResult.searchExpression.split(" ");

    var tempPath = searchItem.relativePath;

    // EXM-27709 START
    // Display words between '<' and '>' in title of search results.
    var tempTitle = searchItem.title;
	var tempHighlightTitle = "";
	if (tempTitle != "null" ) {
		tempHighlightTitle = tempTitle;
        // Highlight the search words in short description
        for (var si = 0; si < allSearchWords.length; si++) {
            var sw = allSearchWords[si];
            tempHighlightTitle = tempHighlightTitle.replace(
                new RegExp("(" + sw + ")", 'i'),
                "<span class='search-shortdescription-highlight'>$1</span>");
        }
    }
	
    // EXM-27709 END
    var tempShortDesc = searchItem.shortDescription;

    var starWidth = searchItem.starWidth;

    var rankingHTML = "";
    if (!wh_mobile && (typeof webhelpSearchRanking != 'undefined') && webhelpSearchRanking) {
        // Add rating values for scoring at the list of matches
        rankingHTML += "<div id=\"rightDiv\"";
        if (displayScore) {
            rankingHTML += 'title="Score: ' + searchItem.scoring + '"';
        }
        rankingHTML += ">";
        rankingHTML += "<div id=\"star\">";
        rankingHTML += "<div id=\"star0\" class=\"star\">";
        rankingHTML += "<div id=\"starCur0\" class=\"curr\" style=\"width: " + starWidth + "px;\">&nbsp;</div>";
        rankingHTML += "</div>";
        rankingHTML += "<br style=\"clear: both;\" />";
        rankingHTML += "</div>";
        rankingHTML += "</div>";
    }


    var finalArray = searchItem.words;
    //debug(finalArray);
    var arrayString = '';
    if (wh_Classic || wh_mobile) {
        var arrayString = 'Array(';
        for (var x in finalArray) {
            if (finalArray[x].length >= 2 || useCJKTokenizing || (indexerLanguage == "ja" && finalArray[x].length >= 1)) {
                arrayString += "'" + finalArray[x] + "',";
            }
        }
        arrayString = arrayString.substring(0, arrayString.length - 1) + ")";

    } else {
        for (var x in finalArray) {
            if (finalArray[x].length >= 2 || useCJKTokenizing || (indexerLanguage == "ja" && finalArray[x].length >= 1)) {
                arrayString += finalArray[x] + ",";
            }
        }
        arrayString = arrayString.substring(0, arrayString.length - 1);
    }

	var url_pathname =  window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
	var html_guid = tempPath;
	var index_href = url_pathname + "/index.html?guid=" + html_guid + "&hl=" + encodeURIComponent(arrayString);
	
    // Add highlight param
    if (!wh_Classic && !wh_mobile) {
        tempPath += '?hl=' + encodeURIComponent(arrayString);
    }

    var idLink = searchItem.linkID;
    var idResult = searchItem.resultID;
    //console.log("searchItem: " + idLink + " / " + idResult);
    var link = 'return openAndHighlight(\'' + tempPath + '\', ' + arrayString + '\)';

    // Similar pages
    if (similarPageID == null) {
        htmlResult = '<li id="' + idResult + '">';

        htmlResult += '<a id="' + idLink + '" href="' + index_href + '" class="foundResult"';

        if (wh_Classic) {
            htmlResult += ' onclick="' + link + '"';
        }
        htmlResult += '>' + tempHighlightTitle + '</a>';
    } else {
        htmlResult =
            '<li id="' + idResult + '" class="similarResult" data-similarTo="' + similarPageID + '">';
        htmlResult +=
            '<a id="' + idLink + '" href="' + tempPath + '" class="foundResult"';

        if (wh_Classic) {
            htmlResult += ' onclick="' + link + '"';
        }

        htmlResult +=
            '>' + tempHighlightTitle + '</a>';
    }

    // Also check if we have a valid description
    if ((tempShortDesc != "null" && tempShortDesc != '...')) {
        // Highlight the search words in short description
        for (var si = 0; si < allSearchWords.length; si++) {
            var sw = allSearchWords[si];
            tempShortDesc = tempShortDesc.replace(
                new RegExp("(" + sw + ")", 'i'),
                "<span class='search-shortdescription-highlight'>$1</span>");
        }

        htmlResult += "\n<div class=\"shortdesclink\">" + tempShortDesc + "</div>";
    }

    var searchItemInfo = "";

    // Relative Path
    var relPathStr = '<div class="relativePath"><a href="' + tempPath + '"';
    if (wh_Classic) {
        relPathStr += ' onclick="' + link + '"';
    }
    relPathStr += '>' + searchItem.relativePath + '</a></div>';
    searchItemInfo += relPathStr;

    // Missing words
    if (!wh_mobile && allSearchWords.length != searchItem.words.length) {
        //console.info("-------------- all words: ", allSearchWords);
        var missingWords = [];
        allSearchWords.forEach(function (word) {
            if (searchItem.words.indexOf(word) == -1) {
                missingWords.push(word);
            }
        });

        //console.info("missing words: ", missingWords);
        var missingHTML =
            "<div class=\"wh_missing_words\">" +
            getLocalization('Missing') + " : ";
        for (var widx = 0; widx < missingWords.length; widx++) {
            missingHTML += "<span class=\"wh_missing_word\">" + missingWords[widx] + "</span> "
        }
        missingHTML += "</div>";
        searchItemInfo += missingHTML;
    }

    if (!wh_mobile && hasSimilarPages) {
        var similarHTML =
            '<a class="showSimilarPages" ' +
            'onclick="showSimilarResults(this)">Similar results...</a>';

        searchItemInfo += similarHTML;
    }

    if (rankingHTML != undefined && searchItemInfo.length > 0) {
        /* htmlResult += '<div class="searchItemAdditionalData">';

        htmlResult += '<div class="missingAndSimilar">';
        htmlResult += searchItemInfo;
        htmlResult += '</div>';

        htmlResult += rankingHTML;
        htmlResult += '</div>'; */
    } else if (searchItemInfo.length > 0) {
        htmlResult += searchItemInfo;
    } else if (rankingHTML != undefined) {
        htmlResult += rankingHTML;
    }

    htmlResult += "</li>";
    return htmlResult;
}

/**
 * @description Compare two result pages to see if there are similar
 * @param result1 Result page
 * @param result2 Result page
 * @returns {boolean} true - result pages are similar
 *                    false - result pages are not similar
 */
function similarPage(result1, result2) {
    var toReturn = false;

    if (result1 === undefined || result2 === undefined) {
        return toReturn;
    }

    var pageTitle1 = result1.title;
    var pageShortDesc1 = result1.shortDescription;

    var pageTitle2 = result2.title;
    var pageShortDesc2 = result2.shortDescription;

    if (pageTitle1.trim() == pageTitle2.trim() && pageShortDesc1.trim() == pageShortDesc2.trim()) {
        toReturn = true;
    }

    return toReturn;
}

/**
 * When it is true, then the score is displayed as tooltip.
 *
 * @type {boolean}
 */
var displayScore = false;

/**
 * @description Show similar results that are hidden by default
 * @param link Link clicked to show similar results
 */
function showSimilarResults(link) {
    var parentLiElement = $(link).parents('li[id]');
    var currentResultId = parentLiElement.attr('id');

    $('[data-similarTo="' + currentResultId + '"]').toggle();
    $(link).toggleClass('expanded');
}

// ==UserScript==
// @name         FB Block Suggested for You
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  The script blocks all posts that contain "Suggested for you" text.
// @author       4i60r
// @match        *://*.facebook.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js

// ==/UserScript==

/*
Known bugs that I don't care about:
- Sometimes clicking Show on a hidden post does not show the post. This is most likely an incompatibility with FB's infinite scrolling
- Sometimes the few first posts are visible. This is most likely caused by setTimeout instead of careful wait logic

It may break at any time.
*/

// The script hides all posts that contain this text
const SUGGESTED_FOR_YOU_TEXT = "Proponowana dla Ciebie";

// Translations
const SHOW_POST_LABEL_TEXT = "Proponowany post ukryty"; // użytkownika <b>__POST_USERNAME__</b>
const SHOW_POST_BUTTON_TEXT = "Pokaż";

const NEW_POST_USER_AVATAR_SELECTOR = "h3 + a[aria-label][href]";
const NEWSFEED_HEADER_SELECTOR = "h3[dir=auto]";



function isMobile() {
    return document.location.hostname.indexOf("m.") > -1;
}

function getNewPostWrapper() {
    return isMobile()
    ? $("div[data-mcomponent=ServerImageArea]>img.img.rounded").parents("div[class*='otf-'][class*='displayed']").first()
    : $(NEW_POST_USER_AVATAR_SELECTOR).parents("div[aria-label]").parents(2).eq(2);
}

function getNewsfeedWrapper() {
    if(isMobile()) {
        const innerHeight = window.innerHeight;
        const safeInnerHeight = innerHeight - 30;

        let foundCount = 0;
        let elem = null;
        $("div[data-actual-height]").each(function() {
            if(elem)
                return;

            const t = $(this);
            const t_height = parseInt(t.attr("data-actual-height"));
            if(t_height > safeInnerHeight) {
                foundCount++;
            }

            if(foundCount > 1) {
                elem = t;
            }
        });

        return elem;
    }


    const $new = getNewPostWrapper();

    let wrapper = null;
    $new.nextAll().each(function() {
        const t = $(this);
        if(!wrapper) {
            const $h3 = t.find(NEWSFEED_HEADER_SELECTOR);
            if($h3.length > 0) {
                wrapper = $h3.next().first();
            }
        }
    });
    return wrapper;
}

function doesContainNewPostUserAvatar(el) {
    const $el = $(el);
    if(isMobile()) {
        // hack
        return getNewPostWrapper().length > 0;
    }


    return $el.is(NEW_POST_USER_AVATAR_SELECTOR) || $el.find(NEW_POST_USER_AVATAR_SELECTOR).length > 0;
}


function doesContainNewsfeedWrapper(el) {
    const $el = $(el);
    return $el.is(NEWSFEED_HEADER_SELECTOR) || $el.find(NEWSFEED_HEADER_SELECTOR).length > 0;
}


function observe(nodeOrSelector, callback, config = {}) {
    let observedElement = $(nodeOrSelector).get(0);
    const observer = new MutationObserver(callback);
    observer.observe(observedElement, config);
    return observer;
}


function waitForNewPostUserAvatarElement(callback) {
    const docEl = window.document.documentElement;
    let active = true;
    const observer = observe(docEl, function(mutations) {
        // console.log("mutations", mutations);
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if(active && doesContainNewPostUserAvatar(node)) {
                    // console.log("Found avatar in ", node);

                    active = false;
                    observer.disconnect();
                    callback && callback(node);
                }
            });
        });

    }, {
        childList: true,
        subtree: true
    });
}

function getPostInfo(post) {
    const info = {};

    const postAuthor = $post.find("a>strong").text();

    info.author = postAuthor;

    return info;
}

function hidePost($post) {
    if(isMobile()) {
        /*
        const postHeight = $post.attr("data-actual-height");
        const nextHeight = $post.find(".showhide-container").outerHeight();
        $post
            .css("height", nextHeight)
            .attr("data-actual-height", nextHeight)
            .attr("data-h-previous-height", postHeight);

        $post.find(".fbh-sug-u").css("display", "none");
        */
        $post.find(">div:not(.showhide-container)").css("visibility", "hidden");
    } else {
        const $postContentWrapper = $post.children(":not(.showhide-container)").first();
        $postContentWrapper.css("display", "none");
    }

}

function showPost($post) {
    if(isMobile()) {
        /*
        const prevHeight = $post.attr("data-h-previous-height");
        $post
            .css("height", prevHeight)
            .attr("data-actual-height", prevHeight);

        $post.find(".fbh-sug-u").css("display", "");
        */
        $post.find(">div:not(.showhide-container)").css("visibility", "visible");
    } else {
        const $postContentWrapper = $post.children(":not(.showhide-container)").first();
        $postContentWrapper.css("display", '');
    }
}

function processPost(node) {
    if(!node)
        return;

    //console.log("processPost", node);

    const $post = $(node);
    const $postContentWrapper = $post.children().first();

    const postAuthor = $post.find("a>strong").text();

    const postText = $post.text();
    //console.log(postText);

    if(postText.indexOf(SUGGESTED_FOR_YOU_TEXT) > -1) {
        const labelText = SHOW_POST_LABEL_TEXT.replace("__POST_USERNAME__", postAuthor);
        const $showContainer = $(`<div class='showhide-container'>
          <div class='showhide-inner'>
            <div class='showhide-label'>
              ${labelText}
            </div>
            <div class='showhide-button'>
              ${SHOW_POST_BUTTON_TEXT}
            </div>
          </div>
        </div>`).prependTo($post);

        $showContainer.css({
            background: "gray",
            borderRadius: isMobile() ? "0px" : "6px",
            display: "flex",
            //justifyContent: "space-between",
            alignContent: "center",
            marginBottom: "15px"
        });

        $showContainer.find(".showhide-inner").css({
            display: "flex",
            alignContent: "center",
            width: "100%"
        });

        $showContainer.find(".showhide-label").css({
            padding: "15px",
            fontSize: "15px"
        });

        hidePost($post);

        const $button = $showContainer.find(".showhide-button");
        $button.css({
            background: "#676666",
            cursor: "pointer",
            borderRadius: "6px",
            fontWeight: 500,
            padding: "10px 15px",
            alignSelf: "center",
            marginBottom: "1px",
            zIndex: 0,
            position: "relative",
            pointerEvents: "all",
            marginLeft: "auto",
            marginRight: "10px",
        })
        .click(function() {
            showPost($post);
            $showContainer.remove();
        });

        if(isMobile()) {
            $showContainer.css({
                background: "#a7a7a7",
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%"
            })
            .find(".showhide-inner").css({
                width: "auto",
                margin: "0 auto",
                height: "fit-content",
                flexDirection: "column",
                placeSelf: "center"
            })
            .find(".showhide-button").css({
                background: "#858585",
                marginRight: "auto"
            });
        }
    }
}

function attachNewsfeedChildrenListener() {
    const $wrapper = getNewsfeedWrapper();

    console.log("isMobile", isMobile());
    console.log("newsfeed", $wrapper);
    $wrapper.children().each(function() {
        processPost(this);
    });

    const observer = observe($wrapper.get(0), function(mutations) {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => processPost(node));
        });
    }, {
        childList: true
    });
}

waitForNewPostUserAvatarElement(() => {

    setTimeout(function() {
        attachNewsfeedChildrenListener();
    }, 2000);
});

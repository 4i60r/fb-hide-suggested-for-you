// ==UserScript==
// @name         FB Hide Suggested for You
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
const SHOW_POST_LABEL_TEXT = "Proponowany post użytkownika <b>__POST_USERNAME__</b> ukryty.";
const SHOW_POST_BUTTON_TEXT = "Pokaż";

const NEW_POST_USER_AVATAR_SELECTOR = "h3 + a[aria-label][href]";
const NEWSFEED_HEADER_SELECTOR = "h3[dir=auto]";

function getNewPostWrapper() {
    return $(NEW_POST_USER_AVATAR_SELECTOR).parents("div[aria-label]").parents(2).eq(2);
}

function getNewsfeedWrapper() {
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
  <div class='showhide-label'>
    ${labelText}
  </div>
  <div class='showhide-button'>
    ${SHOW_POST_BUTTON_TEXT}
  </div>
        </div>`).prependTo($post);

        $showContainer.css({
            background: "gray",
            borderRadius: "6px",
            display: "flex",
            //justifyContent: "space-between",
            alignContent: "center",
            marginBottom: "15px"
        });

        $showContainer.find(".showhide-label").css({
            padding: "15px",
            fontSize: "15px"
        });

        const $button = $showContainer.find(".showhide-button");

        $postContentWrapper.css("display", "none");

        const containerHeight = $showContainer.outerHeight();
        $button.css({
            background: "#676666",
            cursor: "pointer",
            borderRadius: "6px",
            fontWeight: 500,
            padding: "10px 15px",
            alignSelf: "center",
            marginBottom: "1px"
        })
        .click(function() {
            $postContentWrapper.css("display", '');
            $showContainer.remove();
        });
    }
}

function attachNewsfeedChildrenListener() {
    const $wrapper = getNewsfeedWrapper();
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

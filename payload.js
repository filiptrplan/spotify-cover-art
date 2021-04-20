const redirectUri = "https://spotify-cover-art.pages.dev/";
const clientID = "2163afaa51b446fba4b6afc9c681747a";

let imageCache = new Map();
let oldSize = 0;
let refreshing = false;
let toFetch = [];
let imageSize = getCookie("imageSize") == null ? 32 : parseInt(getCookie("imageSize"));

function setCookie(name, value, seconds) {
    var expires = "";
    if (seconds) {
        var date = new Date();
        date.setTime(date.getTime() + (seconds * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// dec2hex :: Integer -> String
// i.e. 0-255 -> '00'-'ff'
function dec2hex(dec) {
    return dec.toString(16).padStart(2, "0");
}

// generateId :: Integer -> String
function generateId(len) {
    var arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
}

function sha256(plain) {
    // returns promise ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
    // Convert the ArrayBuffer to string using Uint8 array.
    // btoa takes chars from 0-255 and base64 encodes.
    // Then convert the base64 encoded to base64url encoded.
    // (replace + with -, replace / with _, trim trailing =)
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkce_challenge_from_verifier(v) {
    hashed = await sha256(v);
    base64encoded = base64urlencode(hashed);
    return base64encoded;
}


function replacer(key, value) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}

function reviver(key, value) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}

function JSON_to_URLEncoded(element, key, list) {
    var list = list || [];
    if (typeof (element) == 'object') {
        for (var idx in element)
            JSON_to_URLEncoded(element[idx], key ? key + '[' + idx + ']' : idx, list);
    } else {
        list.push(key + '=' + encodeURIComponent(element));
    }
    return list.join('&');
}

async function postData(url = '', data = {}, contentType = "application/json") {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': contentType,
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: contentType == "application/x-www-form-urlencoded" ? JSON_to_URLEncoded(data) : JSON.stringify(data)
    });
    return response.json();
}

function fetchToken() {
    postData("https://accounts.spotify.com/api/token", {
        client_id: clientID,
        grant_type: "authorization_code",
        code: getCookie("userToken"),
        redirect_uri: redirectUri,
        code_verifier: getCookie("codeVerifier")
    }, "application/x-www-form-urlencoded").then((res) => {
        if (res.error) return;
        setCookie("accessToken", res.access_token, res.expires_in);
        setCookie("refreshToken", res.refresh_token);
    });
}

async function refreshToken() {
    if (refreshing) return;
    refreshing = true;
    const res = await postData("https://accounts.spotify.com/api/token", {
        client_id: clientID,
        grant_type: "refresh_token",
        refresh_token: getCookie("refreshToken"),
    }, "application/x-www-form-urlencoded");
    refreshing = false;
    if (res.error_description == "Refresh token revoked") {
        clearTokens();
        displayTokenInput();
    }
    if (res.error) return;
    setCookie("accessToken", res.access_token, res.expires_in);
    toFetch.forEach((row) => {
        getCoverArt(row);
    });
}

async function getToken() {
    const codeVerifier = generateId(80);
    setCookie("codeVerifier", codeVerifier, 9999 * 24 * 60 * 60);
    const codeChallenge64 = await pkce_challenge_from_verifier(codeVerifier);
    const url = `https://accounts.spotify.com/authorize?code_challenge=${codeChallenge64}&code_challenge_method=S256&client_id=${clientID}&response_type=code&redirect_uri=${redirectUri}`;
    window.open(url);
}

function setToken() {
    const token = document.querySelector("#tokenInput").value;
    if (token == "") return;
    setCookie("userToken", token, 9999 * 24 * 60 * 60);
    fetchToken();
    document.querySelector("#warning").remove();
}

function clearTokens() {
    eraseCookie("userToken");
    eraseCookie("accessToken");
    eraseCookie("refreshToken");
    alert("Please completely exit out of the app and relaunch.");
}

function displayTokenInput() {
    const viewContent = document.querySelector("#main");
    const warning = document.createElement("div");
    warning.style = "margin: auto";
    warning.id = "warning";
    warning.innerHTML = `<button class="myButton" onclick="setToken();" id="setButton">Set token</button>
    <input class="myInput" type="text" id="tokenInput" name="tokenInput" placeholder="Input token here...">
    <button class="myButton" onclick="getToken();" id="getButton">Get token</button>`;
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
        .myButton {
        background-color: #44c767;
        border-radius: 16px;
        display: inline-block;
        cursor: pointer;
        color: #ffffff;
        font-family: Arial;
        font-size: 16px;
        padding: 7px 15px;
        text-decoration: none;
        border: 0;
    }
    #tokenInput {
        color: black;
        font-size: 16px;
        padding: 5px;
        border: 0;
        outline: 0;
        border-radius: 16px;
        padding: 5px 10px;
    }`;
    viewContent.prepend(styleTag);
    viewContent.prepend(warning);
}

const listObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            getCoverArt(mutation.addedNodes[0]);
        }
    });
});
const containerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            if (mutation.addedNodes[0].classList.contains("tracklist-playlist")) {
                listObserver.observe(mutation.addedNodes[0].querySelector("tbody"), { childList: true });
            }
        }
    });
});
const mainObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            if (mutation.addedNodes[0].id == "app-collection-songs" || mutation.addedNodes[0].id == "app-playlist") {
                const iframe = mutation.addedNodes[0];
                const id = mutation.addedNodes[0].id;
                iframe.onload = () => {
                    const iframe = document.getElementById(id);
                    attachToIframe(iframe);
                };
            }
        }
    });
});

function initObserver() {
    mainObserver.observe(document.querySelector("#view-content"), { childList: true, attributes: true });

    const collectionSongs = document.querySelector("#app-collection-songs");
    const playlist = document.querySelector("#app-playlist");
    console.log(collectionSongs, playlist);
    if (collectionSongs != null) {
        attachToIframe(collectionSongs);
    }
    if (playlist != null) {
        attachToIframe(playlist);
    }
}

function attachToIframe(iframe) {
    console.log(iframe);
    const innerDoc = (iframe.contentDocument) ? iframe.contentDocument : iframe.contentWindow.document;
    console.log(innerDoc);
    const checkInterval = setInterval(() => {
        const container = iframe.id == "app-collection-songs" ? innerDoc.querySelector("#list-placeholder") : innerDoc.querySelector("#tracklist");
        if (container == null) return;
        containerObserver.observe(container, { childList: true, attributes: true });
        listObserver.observe(container.querySelector(".tracklist-playlist > tbody"), { childList: true });
        clearInterval(checkInterval);
    }, 100);
}


function initCache() {
    if (window.localStorage.getItem("imageCache") != null) {
        imageCache = JSON.parse(window.localStorage.getItem("imageCache"), reviver);
        oldSize = imageCache.size;
    } else {
        writeCache(true);
    }
}

function writeCache(force = false) {
    if (oldSize != imageCache.size || force) {
        window.localStorage.setItem("imageCache", JSON.stringify(imageCache, replacer));
        oldSize = imageCache.size;
    }
}

function getCoverArt(row) {
    let image = row.querySelector(".cover-art");
    if (image != null) {
        if (image.width != imageSize) {
            image.remove();
        } else {
            return;
        }
    }
    // if (typeof (imageCache) == "undefined") imageCache = new Map();

    const uri = row.dataset.uri;
    if (typeof (uri) == "undefined") return;

    const trackId = uri.match(/spotify:track:(\w+)/)[1];
    if (imageCache.has(trackId)) {
        addCover(row, imageCache.get(trackId));
        return;
    }

    const accessToken = getCookie("accessToken");
    fetch(`https://api.spotify.com/v1/tracks/${trackId}`,
        {
            headers: {
                "Authorization": "Bearer " + accessToken
            }
        }).then((res) => {
            if (res.status == 401) {
                refreshToken();
                toFetch.push(row);
            } else if (res.status == 429) {
                const delay = res.headers.get("retry-after");
                setTimeout(() => {
                    getCoverArt(row);
                }, delay * 1000 + 100);
            } else if (res.status == 200) {
                res.json().then((data) => {
                    addCover(row, data.album.images[2].url);
                    imageCache.set(trackId, data.album.images[2].url);
                });
            }
        });
}

function addCover(row, url) {
    const spanNode = row.querySelector(".tl-name__title.tl-cell__content");
    const nameNode = spanNode.parentElement;
    let image = row.ownerDocument.createElement("img");
    image.src = url;
    image.width = imageSize;
    image.height = imageSize;
    image.className = "cover-art";
    image.style = "vertical-align: middle;";
    spanNode.style = `line-height: ${imageSize}px; margin-left: 5px;`;
    nameNode.prepend(image);
}

function setImageSize() {
    let size = prompt("Image size in pixels(px)", imageSize.toString());
    if (size == "" || size == null || isNaN(size)) return;
    imageSize = parseInt(size);
    setCookie("imageSize", size);
}

function addProfileButtons() {
    addProfileButton("Clear Tokens", clearTokens);
    addProfileButton("Set Cover Size", setImageSize);
}

function addProfileButton(name, fn) {
    const container = document.querySelector(".Menu__root-items");
    let button = document.createElement("button");
    button.className = "MenuItem";
    button.innerHTML = name;
    button.setAttribute("role", "menuitem");
    button.setAttribute("data-submenu", "false");
    button.setAttribute("tabindex", "-1");
    button.setAttribute("data-ta-id", "");
    container.append(button);
    button.addEventListener("click", fn);
}


function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

function init() {
    if (getCookie("refreshToken") == null) {
        fetchToken();
    }

    if (getCookie("userToken") == null) {
        displayTokenInput();
    }

    initObserver();
    initCache();

    document.querySelector("#profile-menu-toggle").addEventListener("click", addProfileButtons);

    setInterval(writeCache, 1000);
}







docReady(init);










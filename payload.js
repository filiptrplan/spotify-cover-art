// let iframe = document.querySelector("#app-collection-songs");
// let innerDoc = (iframe.contentDocument) ? iframe.contentDocument : iframe.contentWindow.document;
// let table = innerDoc.querySelector(".tracklist-playlist");
// let rows = table.querySelectorAll("tr");

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
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

function getToken() {
    const clientID = "2163afaa51b446fba4b6afc9c681747a";
    const url = `https://accounts.spotify.com/authorize?client_id=${clientID}&response_type=code&redirect_uri=https://spotify-cover-art.pages.dev/index.html`;
    window.open(url);
}

function setToken() {

}

let urlParams = new URLSearchParams(window.location.search);
let myParam = urlParams.get('code');
console.log(myParam);

if (getCookie("accessToken") == null) {
    const viewContent = document.querySelector("#main");
    const warning = document.createElement("div");
    warning.style = "margin: auto";
    warning.innerHTML = `<button onclick="setToken();" id="setButton">Set token</button>
    <input type="text" id="tokenInput" name="tokenInput" placeholder="Input token here...">
    <button onclick="getToken();" id="getButton">Get token</button>`;
    viewContent.prepend(warning);
}

rows.forEach(row => {
    const uri = row.dataset.uri;
    if (typeof (uri) == "undefined") return;
    const trackId = uri.match(/spotify:track:(\w+)/)[1];
    fetch(`https://api.spotify.com/v1/tracks/${trackId}`).then(res => {
        console.log(res);
    }).then(data => {
        console.log(data);
    });
});



















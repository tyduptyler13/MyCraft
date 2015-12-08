var results = [];
function onGoogleLoad() {
    gapi.client.setApiKey('AIzaSyBTEZZpbrLR-DQfbbWiKNz33Tyf3zpjGes');
    gapi.client.load('youtube', 'v3', function() {

        loadlist("", function() {
            for (var i = 0; i < results.length; i++) {
                songkeys[i] = results[i].snippet.resourceId.videoId;
                songnames[i] = results[i].snippet.title;
            }
            updatemusic();
        });

    });
}
function loadlist(token, finished) {

    var request = gapi.client.youtube.playlistItems.list({
        part: 'snippet',
        playlistId: 'PLRBp0Fe2GpgnIh0AiYKh7o7HnYAej-5ph',
        maxResults: 50,
        pageToken: token
    });

    request.execute(function(response) {
        results = results.concat(response.items);
        if (!response.nextPageToken)
            finished();
        else
            loadlist(response.nextPageToken, finished);
    });
}
var songkeys = [];
var songnames = [];
function updatemusic() {
    var song = Math.floor(Math.random() * songkeys.length);
    document.getElementById('audioplayer').innerHTML = "<p>" + songnames[song] + "</p></img><audio id='musicplayer' controls autoplay><source src='http://youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v=" + songkeys[song] + "' type='audio/mpeg'></audio><button onclick='updatemusic();'>></button>";
    document.getElementById('musicplayer').addEventListener("ended", function() {
        updatemusic();
    });
}
var results = [];
function onGoogleLoad() {
	
	document.getElementById('audioplayer').innerHTML = "<button onclick='startmusic();'><i class='fa fa-music'></i></button>";
	document.getElementById('musicTitle').innerHTML = "You can play music by clicking the note in the bottom right corner.";
	$("#musicTitle").delay(4000).fadeOut(1000);
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
    document.getElementById('audioplayer').innerHTML = "<i class='fa fa-music'></i> Current Song: " + songnames[song] + " <audio id='musicplayer' controls autoplay><source src='http://youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v=" + songkeys[song] + "' type='audio/mpeg'></audio><button onclick='updatemusic();'><i class='fa fa-step-forward'></i></button>";
    document.getElementById('musicplayer').addEventListener("ended", function() {
        updatemusic();
    });
	document.getElementById('musicTitle').innerHTML = songnames[song];
	$("#musicTitle").fadeIn(200).delay(10000).fadeOut(200);
}

function startmusic(){
	gapi.client.setApiKey('AIzaSyBTEZZpbrLR-DQfbbWiKNz33Tyf3zpjGes');
    gapi.client.load('youtube', 'v3', function() {

        loadlist("", function() {
            var itfix = 0;
            for (var i = 0; i < results.length; i++) {
                if (results[i].snippet.title != "Private video") {
                    songkeys[i - itfix] = results[i - itfix].snippet.resourceId.videoId;
                    songnames[i - itfix] = results[i - itfix].snippet.title;
                } else
                    itfix++;
            }
            updatemusic();
        });

    });
}
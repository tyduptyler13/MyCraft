function onGoogleLoad() {
            gapi.client.setApiKey('AIzaSyBTEZZpbrLR-DQfbbWiKNz33Tyf3zpjGes');
            gapi.client.load('youtube', 'v3', function() {

                var request = gapi.client.youtube.playlistItems.list({
                    part: 'snippet',
                    playlistId: 'PLP9bTe3zpmVmFKcb0u7v9ROYjV_21JTsF',
                    maxResults: 50
                });

                request.execute(function(response) {
                    for (var i = 0; i < response.items.length; i++) {
						songkeys[i] = response.items[i].snippet.resourceId.videoId;
						songnames[i] = response.items[i].snippet.title;
                    }
					updatemusic();
                });
            });
}
var songkeys = [];
var songnames = [];
function updatemusic()
{
var song = Math.floor(Math.random()*songkeys.length);
document.getElementById('audioplayer').innerHTML = songnames[song]+"<audio id='musicplayer' controls autoplay><source src='http://youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v="+songkeys[song]+"' type='audio/mpeg'></audio>'";
document.getElementById('musicplayer').addEventListener("ended",function(){
updatemusic();
});
}
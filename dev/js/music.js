"use strict";

function onGoogleLoad() {
    console.log("Google API Loaded");
}
$(function() {
    $('#audioplayer').html("<button id='musicButton'><i class='fa fa-music'></i></button>");
    $('#musicTitle').html("You can play music by clicking the note in the bottom right corner.");
    $("#musicTitle").delay(4000).fadeOut(1000);
});
$(function() {
    var results = [];
    $("#musicButton").click(function() {
        startmusic();
    })

    function loadlist(token, finished) {
        /*var request = gapi.client.youtube.playlistItems.list({
            part: 'snippet',
            playlistId: 'UU5nc_ZtjKW1htCVZVRxlQAQ',
            maxResults: 50,
            pageToken: token
        });

        request.execute(function(response) {
            results = results.concat(response.items);
            if (!response.nextPageToken) {
                finished();
            } else {
                loadlist(response.nextPageToken, finished);
            }
        });*/
		$.getJSON('http://rebel.hgtti.com/prj/mc/music/cache.php', function(data) {
			results = data;
					finished();
		});
    }
    var songkeys = [];
    var songnames = [];
    var ytplayer;

    function updatemusic() {
        var song = Math.floor(Math.random() * songkeys.length);
        $('#audioplayer').html("<i class='fa fa-music'></i> <span style='opacity: 1.0;'> Current Song: " + songnames[song] + " </span><div id='ytplayer'></div><button style='opacity: 1.0;background-color: transparent;color: white;' id='controlbutton'><i class='fa fa-pause'></i></button></div><button id='musicSkip'style='opacity: 1.0;background-color: transparent;color: white;'><i class='fa fa-step-forward'></i></button>");
        $("#controlbutton").click(function() {
            toggleMusic();
        })
        $("#musicSkip").click(function() {
            updatemusic();
        })
        ytplayer = new YT.Player('ytplayer', {
            height: '0',
            width: '0',
            videoId: songkeys[song],
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });


        $('#musicTitle').html(songnames[song]);
        $("#musicTitle").fadeIn(200).delay(10000).fadeOut(200);
    }

    function startmusic() {
        $('#musicTitle').html("Starting up the Music Player. This may take a few moments... <i class='fa fa-cog fa-spin'></i>");
        $("#musicTitle").fadeIn(100);
        gapi.client.setApiKey('AIzaSyBTEZZpbrLR-DQfbbWiKNz33Tyf3zpjGes');
        gapi.client.load('youtube', 'v3', function() {

            loadlist("", function() {
                var itfix = 0;
                for (var i = 0; i < results.length; i++) {
                    if (results[i].snippet.title != "Private video" && results[i].snippet.title.toLowerCase().indexOf(" mix") === -1) {
                        songkeys[i - itfix] = results[i - itfix].snippet.resourceId.videoId;
                        songnames[i - itfix] = results[i - itfix].snippet.title;
                    } else
                        itfix++;
                }
                updatemusic();
            });

        });
    }

    var isplayingmusic = false;

    function onYouTubePlayerAPIReady() {
        updatemusic();
    }

    var eventtarget;

    function onPlayerReady(event) {
        event.target.playVideo();
        eventtarget = event.target;
    }

    function onPlayerStateChange(event) {
        if (event.data === 0) {
            updatemusic();
        } else if (event.data == 1) {
            isplayingmusic = true;
        } else if (event.data == 2) {
            isplayingmusic = false;
        }
    }

    function toggleMusic() {
        if (isplayingmusic) {
            eventtarget.pauseVideo();
            $('#controlbutton').html("<i class='fa fa-play'></i>");
        } else {
            eventtarget.playVideo();
            $('#controlbutton').html("<i class='fa fa-pause'></i>");
        }
    }
});
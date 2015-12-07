document.getElementById('musicplayer').addEventListener("ended",function(){
updatemusic();
});
function updatemusic()
{
var songkeys = ["p7ZsBPK656s","x_OwcYTNbHs"];
var songnames = ["Disfigure - Blank","Jim Yosef - Firefly"];
var song = Math.floor(Math.random()*songkeys.length);
document.getElementById('audioplayer').innerHTML = songnames[song]+"<audio id='musicplayer' controls autoplay><source src='http://youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v="+songkeys[song]+"' type='audio/mpeg'></audio>'";
document.getElementById('musicplayer').addEventListener("ended",function(){
updatemusic();
});
}
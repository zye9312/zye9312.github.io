// video js player region
/////////////////////////

var currentSourceIndex = -1;

var autoplayNext = true;

// """
// Understanding Video-JS Library (2/5) - YouTube

// https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwjM27T3q9X8AhU5L0QIHcyiDIUQtwJ6BAgqEAI&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DEIPvq9n4noM&usg=AOvVaw1xyTfNTl4MJdVWu_5qAXE4

// """

// add playbackRates control
var videoElement = document.getElementById('my-video');
videoElement.setAttribute('data-setup', '{ "playbackRates": [0.75, 1, 1.25, 1.5, 2.0] }');

var player = videojs("my-video");
// player.airPlay(); // initializes the AirPlay plugin


// Add keyboard shortcuts
player.ready(function () {
  player.hotkeys({
    seekStep: 10, // Set the seek step to 5 seconds
    volumeStep: 0.1, // Set the volume step to 10%
    enableModifiersForNumbers: false, // Disable modifier keys for number shortcuts
  });
});

// html contents
var videoSelect = document.getElementById("video-select");
for (var i = 0; i < sources.length; i++) {
  var option = document.createElement("option");
  option.value = i.toString();
  option.text = sources[i].title;
  videoSelect.appendChild(option);
}

// videoSelect value change event
videoSelect.addEventListener("change", function () {
  saveTimestampCookie(player.currentTime());
  document.title = sources[parseInt(videoSelect.value)].title.replace(/\s+/g, "_");
  currentSourceIndex = parseInt(videoSelect.value);
  if (currentSourceIndex >= 0) {
    var selectedSrc = sources[currentSourceIndex].src;
    var selectedType = "application/x-mpegURL";
    player.src({ src: selectedSrc, type: selectedType });
    player.play();
  }
  saveIndexCookie();
});

//opening and ending events
// skip head and end

player.on("ended", function () {
  saveTimestampCookie(0);
  if (currentSourceIndex >= 0 && autoplayNext) {
    currentSourceIndex = Math.min(currentSourceIndex + 1, sources.length);
    var selectedSrc = sources[currentSourceIndex].src;
    var selectedType = "application/x-mpegURL";
    player.src({ src: selectedSrc, type: selectedType });
    player.play();
    videoSelect.value = currentSourceIndex.toString();
    currentSourceIndex = parseInt(videoSelect.value);
  }
});

player.on("loadedmetadata", function () {
  player.currentTime(startTime);
  loadTimestampCookie();
});

// Add a timeupdate event listener to the player
player.on("timeupdate", function () {
  // Get the current playback position
  var currentTime = player.currentTime();
  // Check if the current time is equal to 30 seconds
  if (currentTime >= player.duration() - endTime) {
    // Trigger an event
    player.trigger("ended");
  }
});

// close event, save episode cookie
window.onbeforeunload = function () {
  saveIndexCookie();
  saveTimestampCookie(player.currentTime());
};

loadIndexCookie();

videoSelect.dispatchEvent(new Event("change"));

////// a button link back to index file
// create a button element
const button = document.createElement("button");

// set the button's text and attributes
button.innerText = "Home";
button.setAttribute("id", "myButton");
button.setAttribute("class", "button-style");

// add an event listener to the button
button.addEventListener("click", function () {
  saveIndexCookie();
  window.location.href = "../index.html";
});

// append the button to the DOM
document.body.appendChild(button);

///// timeout

// Set the number of minutes the user can spend on the site
// const maxTime = 5; // 5 minutes

// // Convert minutes to milliseconds
// const maxTimeInMs = maxTime * 60 * 1000;

// // Set a timer to redirect to another page after the specified time
// const timeoutId = setTimeout(() => {
//   window.location.href = 'https://google.com';
// }, maxTimeInMs);

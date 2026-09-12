// video js player region
/////////////////////////

var currentSourceIndex = -1;

var autoplayNext = true;

// Video.js and Safari's native fullscreen controls operate on the same media
// element. Keep source changes and automatic episode changes single-flight so
// native seeking cannot race with a synthetic player transition.
var sourceLoadId = 0;
var restoredSourceLoadId = -1;
var sourceIsChanging = false;
var episodeChangeHandled = false;
var seekInProgress = false;
var suppressEndingUntil = 0;

// The values embedded in each generated HTML page remain the defaults.
// Browser-local overrides are stored per video and never leave this device.
var pageDefaultStartTime = Number(startTime) || 0;
var pageDefaultEndTime = Number(endTime) || 0;

function validSkipTime(value) {
  return Number.isFinite(value) && value >= 0;
}

function loadSkipTimes() {
  var saved = playbackState.skip;
  if (saved && validSkipTime(Number(saved.startTime))) {
    startTime = Number(saved.startTime);
  }
  if (saved && validSkipTime(Number(saved.endTime))) {
    endTime = Number(saved.endTime);
  }
}

loadSkipTimes();

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
    enableVolumeScroll: false,
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

// Download the currently selected playlist.  This intentionally downloads the
// M3U8 file itself; merging HLS segments into a video requires a server-side
// tool such as ffmpeg and is not reliable in a static, cross-origin page.
var downloadButton = document.createElement("a");
downloadButton.id = "download-m3u8";
downloadButton.className = "player-action-button";
downloadButton.textContent = "下载 M3U8";
downloadButton.target = "_blank";
downloadButton.rel = "noopener";
downloadButton.download = "";
downloadButton.setAttribute("aria-label", "下载当前 M3U8 播放列表");
downloadButton.title = "下载当前选集的 M3U8 播放列表";
videoSelect.parentNode.appendChild(downloadButton);

function updateDownloadButton(index) {
  var source = sources[index];
  if (!source) {
    downloadButton.removeAttribute("href");
    downloadButton.classList.add("is-disabled");
    return;
  }

  downloadButton.href = source.src;
  downloadButton.download = (source.title || "video")
    .replace(/[\\/:*?"<>|]/g, "_") + ".m3u8";
  downloadButton.classList.remove("is-disabled");
}

function playWithWarning() {
  var playPromise = player.play();
  if (playPromise) {
    playPromise.catch(function (error) {
      console.warn("Playback could not start automatically:", error);
    });
  }
}

function loadEpisodeSource(index, shouldPlay) {
  var source = sources[index];
  if (!source) {
    return;
  }

  sourceLoadId += 1;
  sourceIsChanging = true;
  episodeChangeHandled = true;
  seekInProgress = false;
  suppressEndingUntil = Date.now() + 1500;

  player.src({ src: source.src, type: "application/x-mpegURL" });
  updateDownloadButton(index);

  // Calling play during the user's gesture is important on mobile Safari.
  if (shouldPlay) {
    playWithWarning();
  }
}

function advanceToNextEpisode() {
  if (
    episodeChangeHandled ||
    sourceIsChanging ||
    currentSourceIndex < 0 ||
    currentSourceIndex >= sources.length - 1 ||
    !autoplayNext
  ) {
    return;
  }

  episodeChangeHandled = true;
  saveTimestampCookie(0);
  currentSourceIndex += 1;
  videoSelect.value = currentSourceIndex.toString();
  document.title = sources[currentSourceIndex].title.replace(/\s+/g, "_");
  saveIndexCookie();
  loadEpisodeSource(currentSourceIndex, true);
}

var skipPanel = document.createElement("div");
skipPanel.id = "skip-settings-panel";
skipPanel.className = "vjs-skip-settings-panel is-hidden";

var startLabel = document.createElement("label");
startLabel.textContent = "Skip intro (seconds) ";
var startInput = document.createElement("input");
startInput.type = "number";
startInput.min = "0";
startInput.step = "1";
startInput.value = startTime;
startLabel.appendChild(startInput);

var endLabel = document.createElement("label");
endLabel.textContent = "Skip ending (seconds) ";
var endInput = document.createElement("input");
endInput.type = "number";
endInput.min = "0";
endInput.step = "1";
endInput.value = endTime;
endLabel.appendChild(endInput);

var saveSkipButton = document.createElement("button");
saveSkipButton.type = "button";
saveSkipButton.textContent = "Save";

var resetSkipButton = document.createElement("button");
resetSkipButton.type = "button";
resetSkipButton.textContent = "Defaults";

var skipStatus = document.createElement("span");
skipStatus.id = "skip-status";

saveSkipButton.addEventListener("click", function () {
  var newStartTime = Number(startInput.value);
  var newEndTime = Number(endInput.value);
  if (!validSkipTime(newStartTime) || !validSkipTime(newEndTime)) {
    skipStatus.textContent = " Enter non-negative numbers.";
    return;
  }

  startTime = newStartTime;
  endTime = newEndTime;
  playbackState.skip = { startTime: startTime, endTime: endTime };
  playbackState = storePlaybackState(playbackState);
  skipStatus.textContent = "Saved in this browser.";
  setTimeout(function () {
    skipPanel.classList.add("is-hidden");
  }, 500);
});

resetSkipButton.addEventListener("click", function () {
  playbackState.skip = null;
  playbackState = storePlaybackState(playbackState);
  startTime = pageDefaultStartTime;
  endTime = pageDefaultEndTime;
  startInput.value = startTime;
  endInput.value = endTime;
  skipStatus.textContent = "Restored page defaults.";
});

skipPanel.appendChild(startLabel);
skipPanel.appendChild(endLabel);
skipPanel.appendChild(saveSkipButton);
skipPanel.appendChild(resetSkipButton);
skipPanel.appendChild(skipStatus);
player.el().appendChild(skipPanel);

var skipControlButton = document.createElement("button");
skipControlButton.type = "button";
skipControlButton.className = "vjs-control vjs-button vjs-skip-control";
skipControlButton.title = "Skip settings";
skipControlButton.setAttribute("aria-label", "Skip settings");
skipControlButton.innerHTML = '<span aria-hidden="true">Skip</span>';
skipControlButton.addEventListener("click", function (event) {
  event.stopPropagation();
  skipPanel.classList.toggle("is-hidden");
  if (!skipPanel.classList.contains("is-hidden")) {
    startInput.focus();
  }
});
player.getChild("controlBar").el().appendChild(skipControlButton);

player.el().addEventListener("click", function (event) {
  if (
    !skipPanel.classList.contains("is-hidden") &&
    !skipPanel.contains(event.target) &&
    !skipControlButton.contains(event.target)
  ) {
    skipPanel.classList.add("is-hidden");
  }
});

// videoSelect value change event
videoSelect.addEventListener("change", function (event) {
  saveTimestampCookie(player.currentTime());
  document.title = sources[parseInt(videoSelect.value)].title.replace(/\s+/g, "_");
  currentSourceIndex = parseInt(videoSelect.value);
  if (currentSourceIndex >= 0) {
    // Browsers block audible autoplay triggered by a synthetic event. On the
    // initial dispatch, load the source and let the user press Play. A real
    // selection change is a user gesture, so playback can start immediately.
    loadEpisodeSource(currentSourceIndex, event.isTrusted);
  }
  saveIndexCookie();
});

//opening and ending events
// skip head and end

player.on("ended", function () {
  if (currentSourceIndex >= sources.length - 1 || !autoplayNext) {
    saveTimestampCookie(0);
    return;
  }
  advanceToNextEpisode();
});

player.on("loadedmetadata", function () {
  // Safari may emit metadata events again while entering/leaving its native
  // fullscreen player. Restore progress only once for each explicit source
  // load so those events never overwrite a native seek.
  if (restoredSourceLoadId !== sourceLoadId) {
    var savedTime = Number(
      playbackState.progress[String(currentSourceIndex)]
    );
    var resumeTime =
      Number.isFinite(savedTime) && savedTime > 0 ? savedTime : startTime;
    var duration = player.duration();

    if (Number.isFinite(duration) && duration > 0) {
      resumeTime = Math.min(resumeTime, Math.max(0, duration - 0.25));
    }
    if (validSkipTime(resumeTime) && Math.abs(player.currentTime() - resumeTime) > 0.25) {
      player.currentTime(resumeTime);
    }
    restoredSourceLoadId = sourceLoadId;
  }
  sourceIsChanging = false;
  episodeChangeHandled = false;
});

player.on("seeking", function () {
  seekInProgress = true;
  // Never let skip-ending logic change sources while Safari is resolving a
  // native 10-second seek. Rapid taps can keep this state active for a while.
  suppressEndingUntil = Date.now() + 1500;
});

player.on("seeked", function () {
  seekInProgress = false;
  suppressEndingUntil = Date.now() + 1500;
  saveTimestampCookie(player.currentTime());
});

player.on("pause", function () {
  if (!sourceIsChanging) {
    saveTimestampCookie(player.currentTime());
  }
});

// iPhone Safari temporarily presents its own fullscreen controls. It still
// controls this same video element, so do not copy time back and forth. On
// return, only ask Video.js to redraw from the native element's current state.
videoElement.addEventListener("webkitendfullscreen", function () {
  seekInProgress = false;
  suppressEndingUntil = Date.now() + 1500;
  saveTimestampCookie(videoElement.currentTime);
  player.trigger("timeupdate");
});

// Add a timeupdate event listener to the player
player.on("timeupdate", function () {
  var currentTime = player.currentTime();
  var duration = player.duration();

  if (
    endTime > 0 &&
    Number.isFinite(duration) &&
    !sourceIsChanging &&
    !seekInProgress &&
    !player.seeking() &&
    Date.now() >= suppressEndingUntil &&
    currentTime >= duration - endTime
  ) {
    // Do not synthesize an `ended` event. Safari owns the native media event;
    // an explicit, guarded transition keeps both control surfaces consistent.
    advanceToNextEpisode();
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

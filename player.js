// video js player region
/////////////////////////

var currentSourceIndex = -1;

var autoplayNext = true;

// The values embedded in each generated HTML page remain the defaults.
// Browser-local overrides are stored per video and never leave this device.
var pageDefaultStartTime = Number(startTime) || 0;
var pageDefaultEndTime = Number(endTime) || 0;
var skipStorageKey = "skip_times_" + video_id;

function validSkipTime(value) {
  return Number.isFinite(value) && value >= 0;
}

function loadSkipTimes() {
  try {
    var saved = JSON.parse(localStorage.getItem(skipStorageKey));
    if (saved && validSkipTime(Number(saved.startTime))) {
      startTime = Number(saved.startTime);
    }
    if (saved && validSkipTime(Number(saved.endTime))) {
      endTime = Number(saved.endTime);
    }
  } catch (error) {
    console.warn("Could not load browser skip settings; using page defaults.", error);
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
  try {
    localStorage.setItem(
      skipStorageKey,
      JSON.stringify({ startTime: startTime, endTime: endTime })
    );
    skipStatus.textContent = "Saved in this browser.";
    setTimeout(function () {
      skipPanel.classList.add("is-hidden");
    }, 500);
  } catch (error) {
    skipStatus.textContent = " Browser storage is unavailable.";
    console.warn("Could not save browser skip settings.", error);
  }
});

resetSkipButton.addEventListener("click", function () {
  try {
    localStorage.removeItem(skipStorageKey);
  } catch (error) {
    console.warn("Could not clear browser skip settings.", error);
  }
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
    var selectedSrc = sources[currentSourceIndex].src;
    var selectedType = "application/x-mpegURL";
    player.src({ src: selectedSrc, type: selectedType });
    // Browsers block audible autoplay triggered by a synthetic event. On the
    // initial dispatch, load the source and let the user press Play. A real
    // selection change is a user gesture, so playback can start immediately.
    if (event.isTrusted) {
      var playPromise = player.play();
      if (playPromise) {
        playPromise.catch(function (error) {
          console.warn("Playback could not start automatically:", error);
        });
      }
    }
  }
  saveIndexCookie();
});

//opening and ending events
// skip head and end

player.on("ended", function () {
  saveTimestampCookie(0);
  if (
    currentSourceIndex >= 0 &&
    currentSourceIndex < sources.length - 1 &&
    autoplayNext
  ) {
    currentSourceIndex += 1;
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

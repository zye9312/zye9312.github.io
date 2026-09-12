var videoElement = document.getElementById("my-video");
var videoSelect = document.getElementById("video-select");

function loadEpisode(index) {
  var source = sources[index];
  if (!source) {
    videoElement.removeAttribute("src");
    return;
  }

  document.title = source.title;
  // Assigning src is the only interaction with the media element. Playback,
  // seeking, fullscreen, buffering, and controls remain browser-native.
  videoElement.src = source.src;
}

for (var i = 0; i < sources.length; i++) {
  var option = document.createElement("option");
  option.value = i.toString();
  option.textContent = sources[i].title;
  videoSelect.appendChild(option);
}

videoSelect.addEventListener("change", function () {
  loadEpisode(Number(videoSelect.value));
});

videoElement.addEventListener("ended", function () {
  var nextIndex = Number(videoSelect.value) + 1;
  if (nextIndex >= sources.length) {
    return;
  }

  videoSelect.value = nextIndex.toString();
  loadEpisode(nextIndex);

  var playPromise = videoElement.play();
  if (playPromise) {
    playPromise.catch(function (error) {
      console.warn("下一集无法自动播放，请手动点击播放。", error);
    });
  }
});

if (sources.length > 0) {
  videoSelect.value = "0";
  loadEpisode(0);
}

var homeButton = document.createElement("button");
homeButton.type = "button";
homeButton.id = "myButton";
homeButton.textContent = "Home";
homeButton.addEventListener("click", function () {
  window.location.href = "../index.html";
});
document.body.appendChild(homeButton);

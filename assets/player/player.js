(function () {
  var videoElement = document.getElementById("my-video");
  var videoSelect = document.getElementById("video-select");
  var playerToolbar = document.getElementById("player-toolbar");
  if (!videoElement || !videoSelect || !Array.isArray(sources)) {
    return;
  }
  playerToolbar = playerToolbar || videoSelect.parentNode;

  var storageKey = "tv2html:native-state:" + window.location.pathname;
  var playerMachine = {
    phase: "idle",
    wantsToPlay: false,
    switchingSource: false,
    sourceRevision: 0,
    activeSource: "",
    episodeIndex: -1,
    ignoredPauseEvents: 0,
  };
  var statusTimer = null;
  var progressTick = 0;

  function nonNegativeNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function loadState() {
    var raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch (error) {
      console.warn("无法读取本地播放记录。", error);
    }

    raw = raw && typeof raw === "object" ? raw : {};
    var episode = Number(raw.currentEpisode);
    return {
      version: 1,
      currentEpisode:
        Number.isInteger(episode) && episode >= 0 && episode < sources.length
          ? episode
          : 0,
      progress:
        raw.progress && typeof raw.progress === "object" ? raw.progress : {},
      skip: {
        intro: nonNegativeNumber(raw.skip && raw.skip.intro),
        outro: nonNegativeNumber(raw.skip && raw.skip.outro),
      },
    };
  }

  var playbackState = loadState();

  function storeState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(playbackState));
    } catch (error) {
      console.warn("无法保存本地播放记录。", error);
    }
  }

  function formatTime(seconds) {
    var wholeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    var hours = Math.floor(wholeSeconds / 3600);
    var minutes = Math.floor((wholeSeconds % 3600) / 60);
    var remainder = wholeSeconds % 60;
    var minuteText = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    var result = minuteText + ":" + String(remainder).padStart(2, "0");
    return hours > 0 ? hours + ":" + result : result;
  }

  function createButton(text, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className || "player-action";
    button.textContent = text;
    return button;
  }

  var controls = document.createElement("section");
  controls.className = "native-player-tools";

  var playerStatus = document.createElement("div");
  playerStatus.className = "player-status";
  playerStatus.setAttribute("role", "status");
  playerStatus.setAttribute("aria-live", "polite");

  var actionRow = document.createElement("div");
  actionRow.className = "player-actions";

  var resumeButton = createButton("继续播放");
  var skipIntroButton = createButton("跳过片头");
  var skipOutroButton = createButton("跳过片尾");
  resumeButton.hidden = true;
  skipIntroButton.hidden = true;
  skipOutroButton.hidden = true;

  actionRow.appendChild(resumeButton);
  actionRow.appendChild(skipIntroButton);
  actionRow.appendChild(skipOutroButton);

  var settings = document.createElement("details");
  settings.className = "player-settings";
  var settingsSummary = document.createElement("summary");
  settingsSummary.textContent = "播放设置";

  var settingsFields = document.createElement("div");
  settingsFields.className = "player-settings-fields";

  var introLabel = document.createElement("label");
  introLabel.textContent = "片头结束（秒）";
  var introInput = document.createElement("input");
  introInput.type = "number";
  introInput.min = "0";
  introInput.step = "1";
  introInput.value = playbackState.skip.intro;
  introLabel.appendChild(introInput);

  var outroLabel = document.createElement("label");
  outroLabel.textContent = "片尾长度（秒）";
  var outroInput = document.createElement("input");
  outroInput.type = "number";
  outroInput.min = "0";
  outroInput.step = "1";
  outroInput.value = playbackState.skip.outro;
  outroLabel.appendChild(outroInput);

  var saveSettingsButton = createButton("保存设置", "player-settings-save");
  var settingsStatus = document.createElement("span");
  settingsStatus.className = "player-settings-status";

  settingsFields.appendChild(introLabel);
  settingsFields.appendChild(outroLabel);
  settingsFields.appendChild(saveSettingsButton);
  settingsFields.appendChild(settingsStatus);
  settings.appendChild(settingsSummary);
  settings.appendChild(settingsFields);

  controls.appendChild(playerStatus);
  controls.appendChild(actionRow);
  controls.appendChild(settings);
  playerToolbar.appendChild(controls);

  function setStatus(message, autoHide) {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    playerStatus.textContent = message;
    playerStatus.hidden = !message;
    if (message && autoHide) {
      statusTimer = setTimeout(function () {
        playerStatus.hidden = true;
      }, autoHide);
    }
  }

  function transitionTo(phase, message, autoHide) {
    playerMachine.phase = phase;
    controls.setAttribute("data-player-state", phase);
    controls.setAttribute(
      "aria-busy",
      phase === "loading" || phase === "buffering" ? "true" : "false"
    );
    if (typeof message === "string") {
      setStatus(message, autoHide);
    }
  }

  function eventMatchesActiveSource() {
    if (!playerMachine.activeSource) {
      return false;
    }
    var currentSource = videoElement.currentSrc || videoElement.src;
    return currentSource === playerMachine.activeSource;
  }

  function savedProgress(index) {
    var value = Number(playbackState.progress[String(index)]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function clearProgress(index) {
    delete playbackState.progress[String(index)];
    storeState();
  }

  function saveCurrentProgress() {
    if (
      playerMachine.episodeIndex < 0 ||
      playerMachine.switchingSource ||
      videoElement.ended ||
      videoElement.seeking
    ) {
      return;
    }

    var currentTime = Number(videoElement.currentTime);
    var duration = Number(videoElement.duration);
    if (!Number.isFinite(currentTime) || currentTime <= 0) {
      return;
    }

    if (Number.isFinite(duration) && duration > 0 && currentTime >= duration - 10) {
      delete playbackState.progress[String(playerMachine.episodeIndex)];
    } else {
      playbackState.progress[String(playerMachine.episodeIndex)] = Math.floor(currentTime);
    }
    storeState();
  }

  function updateResumeButton() {
    var progress = savedProgress(playerMachine.episodeIndex);
    var duration = Number(videoElement.duration);
    var canResume =
      progress >= 3 &&
      Number.isFinite(duration) &&
      duration > 0 &&
      progress < duration - 10;

    resumeButton.hidden = !canResume;
    if (canResume) {
      resumeButton.textContent = "继续播放 " + formatTime(progress);
    }
  }

  function updateSkipButtons() {
    var currentTime = Number(videoElement.currentTime) || 0;
    var duration = Number(videoElement.duration);
    var intro = playbackState.skip.intro;
    var outro = playbackState.skip.outro;

    skipIntroButton.hidden = !(intro > 0 && currentTime < intro);
    if (!skipIntroButton.hidden) {
      skipIntroButton.textContent = "跳过片头（到 " + formatTime(intro) + "）";
    }

    var remaining = Number.isFinite(duration) ? duration - currentTime : Infinity;
    var hasNextEpisode = playerMachine.episodeIndex < sources.length - 1;
    skipOutroButton.hidden = !(outro > 0 && remaining >= 0 && remaining <= outro && hasNextEpisode);
    if (!skipOutroButton.hidden) {
      skipOutroButton.textContent = "跳过片尾（剩余 " + formatTime(remaining) + "）";
    }
  }

  function playCurrentEpisode(expectedRevision) {
    var revision =
      typeof expectedRevision === "number"
        ? expectedRevision
        : playerMachine.sourceRevision;
    playerMachine.wantsToPlay = true;
    var playPromise;
    try {
      playPromise = videoElement.play();
    } catch (error) {
      handlePlayFailure(error, revision);
      return;
    }
    if (playPromise) {
      playPromise.catch(function (error) {
        handlePlayFailure(error, revision);
      });
    }
  }

  function handlePlayFailure(error, revision) {
    if (revision !== playerMachine.sourceRevision) {
      return;
    }
    playerMachine.wantsToPlay = false;
    playerMachine.switchingSource = false;
    transitionTo("paused", "无法自动播放，请点击原生播放按钮。", 5000);
    console.warn("视频无法自动播放。", error);
  }

  function loadEpisode(index, shouldPlay) {
    var source = sources[index];
    if (!source) {
      videoElement.removeAttribute("src");
      playerMachine.activeSource = "";
      playerMachine.wantsToPlay = false;
      playerMachine.switchingSource = false;
      transitionTo("idle", "没有可用的视频源。");
      return false;
    }

    playerMachine.sourceRevision += 1;
    var revision = playerMachine.sourceRevision;
    playerMachine.wantsToPlay = Boolean(shouldPlay);
    playerMachine.switchingSource = true;
    playerMachine.episodeIndex = index;
    playbackState.currentEpisode = index;
    storeState();
    resumeButton.hidden = true;
    skipIntroButton.hidden = true;
    skipOutroButton.hidden = true;
    transitionTo("loading", "正在连接视频源……");
    document.title = source.title;

    // Explicitly settle the previous native resource before assigning the new
    // one. The new source then inherits the user's play/pause intent.
    if (!videoElement.paused) {
      playerMachine.ignoredPauseEvents += 1;
      videoElement.pause();
    }
    videoElement.src = source.src;
    playerMachine.activeSource = videoElement.src;
    if (playerMachine.wantsToPlay) {
      playCurrentEpisode(revision);
    }
    return true;
  }

  function moveToNextEpisode(shouldPlay) {
    var nextIndex = playerMachine.episodeIndex + 1;
    if (nextIndex >= sources.length) {
      return false;
    }

    clearProgress(playerMachine.episodeIndex);
    videoSelect.value = nextIndex.toString();
    loadEpisode(nextIndex, shouldPlay);
    return true;
  }

  for (var i = 0; i < sources.length; i++) {
    var option = document.createElement("option");
    option.value = i.toString();
    option.textContent = sources[i].title;
    videoSelect.appendChild(option);
  }

  videoSelect.addEventListener("change", function () {
    var shouldContinuePlaying =
      !videoElement.ended &&
      (playerMachine.wantsToPlay || !videoElement.paused);
    saveCurrentProgress();
    loadEpisode(Number(videoSelect.value), shouldContinuePlaying);
  });

  resumeButton.addEventListener("click", function () {
    var progress = savedProgress(playerMachine.episodeIndex);
    if (progress > 0 && Number.isFinite(videoElement.duration)) {
      videoElement.currentTime = Math.min(progress, videoElement.duration - 0.25);
      resumeButton.hidden = true;
      playCurrentEpisode();
    }
  });

  skipIntroButton.addEventListener("click", function () {
    var intro = playbackState.skip.intro;
    var duration = Number(videoElement.duration);
    if (intro > 0 && Number.isFinite(duration) && videoElement.currentTime < intro) {
      videoElement.currentTime = Math.min(intro, duration - 0.25);
      updateSkipButtons();
    }
  });

  skipOutroButton.addEventListener("click", function () {
    moveToNextEpisode(true);
  });

  saveSettingsButton.addEventListener("click", function () {
    var intro = Number(introInput.value);
    var outro = Number(outroInput.value);
    if (!Number.isFinite(intro) || intro < 0 || !Number.isFinite(outro) || outro < 0) {
      settingsStatus.textContent = "请输入非负数。";
      return;
    }

    playbackState.skip = { intro: intro, outro: outro };
    storeState();
    settingsStatus.textContent = "已保存在此浏览器。";
    updateSkipButtons();
  });

  videoElement.addEventListener("loadstart", function () {
    if (eventMatchesActiveSource()) {
      transitionTo("loading", "正在连接视频源……");
    }
  });

  videoElement.addEventListener("loadedmetadata", function () {
    if (!eventMatchesActiveSource()) {
      return;
    }
    playerMachine.switchingSource = false;
    transitionTo(
      playerMachine.wantsToPlay ? "loading" : "ready",
      playerMachine.wantsToPlay ? "正在准备播放……" : "已读取视频信息"
    );
    updateResumeButton();
    updateSkipButtons();
  });

  videoElement.addEventListener("canplay", function () {
    if (!eventMatchesActiveSource()) {
      return;
    }
    playerMachine.switchingSource = false;
    if (!playerMachine.wantsToPlay) {
      transitionTo("ready", "可以播放", 2000);
    } else if (videoElement.paused) {
      transitionTo("loading", "正在准备播放……");
    } else {
      transitionTo("playing", "正在播放", 1200);
    }
    updateResumeButton();
  });

  videoElement.addEventListener("play", function () {
    if (!eventMatchesActiveSource()) {
      return;
    }
    playerMachine.wantsToPlay = true;
    transitionTo("loading", "正在准备播放……");
  });

  videoElement.addEventListener("waiting", function () {
    if (eventMatchesActiveSource() && !videoElement.paused) {
      playerMachine.wantsToPlay = true;
      transitionTo("buffering", "正在缓冲……");
    }
  });

  videoElement.addEventListener("stalled", function () {
    if (
      eventMatchesActiveSource() &&
      playerMachine.wantsToPlay &&
      !videoElement.paused
    ) {
      transitionTo("buffering", "视频数据加载较慢，正在等待……");
    }
  });

  videoElement.addEventListener("playing", function () {
    if (!eventMatchesActiveSource()) {
      return;
    }
    playerMachine.wantsToPlay = true;
    playerMachine.switchingSource = false;
    transitionTo("playing", "正在播放", 1200);
    resumeButton.hidden = true;
  });

  videoElement.addEventListener("pause", function () {
    if (playerMachine.ignoredPauseEvents > 0) {
      playerMachine.ignoredPauseEvents -= 1;
      return;
    }
    if (
      !eventMatchesActiveSource() ||
      videoElement.ended
    ) {
      return;
    }
    playerMachine.wantsToPlay = false;
    transitionTo("paused", "已暂停", 2000);
    saveCurrentProgress();
  });

  videoElement.addEventListener("error", function () {
    if (!eventMatchesActiveSource()) {
      return;
    }
    playerMachine.wantsToPlay = false;
    playerMachine.switchingSource = false;
    transitionTo("error", "视频加载失败，请尝试其他选集或稍后重试。");
  });

  videoElement.addEventListener("ended", function () {
    if (!eventMatchesActiveSource()) {
      return;
    }
    playerMachine.wantsToPlay = false;
    transitionTo("ended", "本集播放结束，正在切换下一集……");
    if (!moveToNextEpisode(true)) {
      clearProgress(playerMachine.episodeIndex);
      transitionTo("ended", "已播放完最后一集。");
    }
  });

  window.addEventListener("pagehide", saveCurrentProgress);

  setInterval(function () {
    updateSkipButtons();
    progressTick += 1;
    if (progressTick >= 15) {
      progressTick = 0;
      if (!videoElement.paused) {
        saveCurrentProgress();
      }
    }
  }, 1000);

  if (sources.length > 0) {
    videoSelect.value = playbackState.currentEpisode.toString();
    loadEpisode(playbackState.currentEpisode, false);
  }

  var homeButton = createButton("首页");
  homeButton.id = "myButton";
  homeButton.addEventListener("click", function () {
    saveCurrentProgress();
    window.location.href = "../index.html";
  });
  playerToolbar.appendChild(homeButton);
})();

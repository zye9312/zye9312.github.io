// Playback state is local to this browser. The function names are retained so
// older generated pages can keep using the same player.js API.
var playbackStorageKey = "tv2html:state:" + video_id;
var playbackStateVersion = 1;

function createPlaybackState() {
  return {
    version: playbackStateVersion,
    currentEpisode: 0,
    progress: {},
    skip: null,
    updatedAt: null,
  };
}

function normalizePlaybackState(value) {
  var state = value && typeof value === "object" ? value : {};
  var currentEpisode = Number(state.currentEpisode);

  return {
    version: playbackStateVersion,
    currentEpisode:
      Number.isInteger(currentEpisode) && currentEpisode >= 0
        ? currentEpisode
        : 0,
    progress:
      state.progress && typeof state.progress === "object"
        ? state.progress
        : {},
    skip: state.skip && typeof state.skip === "object" ? state.skip : null,
    updatedAt: Number.isFinite(Number(state.updatedAt))
      ? Number(state.updatedAt)
      : null,
    legacyMigrated: Boolean(state.legacyMigrated),
  };
}

function loadPlaybackState() {
  try {
    var saved = localStorage.getItem(playbackStorageKey);
    return normalizePlaybackState(saved ? JSON.parse(saved) : null);
  } catch (error) {
    console.warn("Could not load playback state.", error);
    return createPlaybackState();
  }
}

function storePlaybackState(state) {
  var normalized = normalizePlaybackState(state);
  normalized.updatedAt = Date.now();
  try {
    localStorage.setItem(playbackStorageKey, JSON.stringify(normalized));
  } catch (error) {
    console.warn("Could not save playback state.", error);
  }
  return normalized;
}

function readLegacyCookie(name) {
  var cookies = document.cookie ? document.cookie.split(";") : [];
  for (var i = 0; i < cookies.length; i++) {
    var parts = cookies[i].trim().split("=");
    if (parts.shift() === name) {
      return parts.join("=");
    }
  }
  return null;
}

function removeLegacyCookie(name) {
  document.cookie =
    name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
}

function migrateLegacyPlaybackState() {
  var state = loadPlaybackState();
  if (state.legacyMigrated) {
    return state;
  }

  var legacyEpisodeValue = readLegacyCookie(video_id);
  if (legacyEpisodeValue !== null) {
    var legacyEpisode = Number(legacyEpisodeValue);
    if (Number.isInteger(legacyEpisode) && legacyEpisode >= 0) {
      state.currentEpisode = legacyEpisode;
    }
    removeLegacyCookie(video_id);
  }

  var progressPrefix = video_id + "_episode_";
  var cookies = document.cookie ? document.cookie.split(";") : [];
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    var equalsIndex = cookie.indexOf("=");
    var name = equalsIndex >= 0 ? cookie.slice(0, equalsIndex) : cookie;
    if (!name.startsWith(progressPrefix)) {
      continue;
    }

    var episodeIndex = Number(name.slice(progressPrefix.length));
    var timestamp = Number(cookie.slice(equalsIndex + 1));
    if (
      Number.isInteger(episodeIndex) &&
      episodeIndex >= 0 &&
      Number.isFinite(timestamp) &&
      timestamp >= 0
    ) {
      state.progress[String(episodeIndex)] = timestamp;
    }
    removeLegacyCookie(name);
  }

  // Migrate the first localStorage implementation of skip settings too.
  try {
    var legacySkipKey = "skip_times_" + video_id;
    var legacySkipValue = localStorage.getItem(legacySkipKey);
    if (!state.skip && legacySkipValue) {
      var legacySkip = JSON.parse(legacySkipValue);
      var legacyStart = Number(legacySkip.startTime);
      var legacyEnd = Number(legacySkip.endTime);
      if (
        Number.isFinite(legacyStart) &&
        legacyStart >= 0 &&
        Number.isFinite(legacyEnd) &&
        legacyEnd >= 0
      ) {
        state.skip = { startTime: legacyStart, endTime: legacyEnd };
      }
    }
    localStorage.removeItem(legacySkipKey);
  } catch (error) {
    console.warn("Could not migrate legacy skip settings.", error);
  }

  state.legacyMigrated = true;
  return storePlaybackState(state);
}

var playbackState = migrateLegacyPlaybackState();

function saveTimestampCookie(timeStamp) {
  var timestamp = Number(timeStamp);
  if (
    currentSourceIndex < 0 ||
    !Number.isFinite(timestamp) ||
    timestamp < 0
  ) {
    return;
  }
  playbackState.progress[String(currentSourceIndex)] = timestamp;
  playbackState = storePlaybackState(playbackState);
}

function loadTimestampCookie() {
  var timestamp = Number(playbackState.progress[String(currentSourceIndex)]);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    player.currentTime(timestamp);
  }
}

function saveIndexCookie() {
  if (currentSourceIndex < 0) {
    return;
  }
  playbackState.currentEpisode = currentSourceIndex;
  playbackState = storePlaybackState(playbackState);
}

function loadIndexCookie() {
  var savedIndex = Number(playbackState.currentEpisode);
  if (
    Number.isInteger(savedIndex) &&
    savedIndex >= 0 &&
    savedIndex < sources.length
  ) {
    videoSelect.value = savedIndex.toString();
  } else {
    videoSelect.value = "0";
  }
}

var cookie_preserve_time = 3600 * 1000 * 12 * 7;

function saveTimestampCookie(timeStamp) {
  document.cookie =
    video_id +
    "_episode_" +
    currentSourceIndex +
    "=" +
    timeStamp +
    "; expires=" +
    new Date(new Date().getTime() + cookie_preserve_time) +
    "; path=/";
}

function checkCookie(name) {
  // Split document.cookie by semicolons into an array of individual cookies
  var cookies = document.cookie.split(";");

  // Loop through the cookies array to find the cookie with the specified name
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    // If the cookie starts with the name we're looking for, return true
    if (cookie.startsWith(name + "=")) {
      return true;
    }
  }

  // If we haven't found the cookie, return false
  return false;
}

function loadTimestampCookie() {
  var cookieName = video_id + "_episode_" + currentSourceIndex;

  if (checkCookie(cookieName)) {
    var cookie_time = parseFloat(
      document.cookie.replace(
        new RegExp(
          "(?:(?:^|.*;\\s*)" + cookieName + "\\s*\\=\\s*([^;]*).*$)|^.*$"
        ),
        "$1"
      )
    );
    if (cookie_time !== "") {
      player.currentTime(cookie_time);
    }
  }
}

function saveIndexCookie() {
  document.cookie =
    video_id +
    "=" +
    currentSourceIndex +
    "; expires=" +
    new Date(new Date().getTime() + cookie_preserve_time) +
    "; path=/";
}

function loadIndexCookie() {
  var cookie_index = document.cookie.replace(
    new RegExp("(?:(?:^|.*;\\s*)" + video_id + "\\s*\\=\\s*([^;]*).*$)|^.*$"),
    "$1"
  );

  // Set the selected option and trigger a change event
  if (cookie_index !== "") {
    videoSelect.value = parseInt(cookie_index);
  } else {
    videoSelect.value = 0;
  }
}

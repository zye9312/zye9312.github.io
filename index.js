/// youtube links
var sources = [
  "https://www.youtube.com/embed/kOA9h8YdZAI",
  "https://www.youtube.com/embed/0Iwr1arwtbU",
  "https://www.youtube.com/watch?v=php8vmPvzsA",
  "https://www.youtube.com/watch?v=a_oqcg0hvpo",
  "https://www.youtube.com/watch?v=o_nxIQTM_B0",
];

function changeVideo() {
  var randomIndex = Math.floor(Math.random() * sources.length);
  var randomSource = sources[randomIndex].replace("watch?v=", "embed/");
  var iframe = document.getElementById("video-iframe");
  iframe.src = randomSource;
}

///////////// videos

function redirectToRandomPage() {
  const links = document.querySelectorAll("#nav-menu a");
  const randomIndex = Math.floor(Math.random() * links.length);
  window.location.href = links[randomIndex];
}

const button = document.getElementById("random-button");
button.addEventListener("click", redirectToRandomPage);

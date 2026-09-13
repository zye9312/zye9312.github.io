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
  const links = document.querySelectorAll(".library-grid a, .resource-grid a");
  const randomIndex = Math.floor(Math.random() * links.length);
  window.location.href = links[randomIndex];
}

const button = document.getElementById("random-button");
button.addEventListener("click", redirectToRandomPage);

// iOS home-screen apps do not show Safari's reload controls. Add a manual
// cache-busting reload so a newly generated index.html can be fetched from
// GitHub Pages without requiring the user to remove and re-add the app.
const refreshButton = document.getElementById("refresh-button");
refreshButton.addEventListener("click", function () {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("refresh", Date.now().toString());
  window.location.replace(url.toString());
});

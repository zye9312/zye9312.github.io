////// a button link back to index file
// create a button element
const button = document.createElement("button");

// set the button's text and attributes
button.innerText = "Home";
button.setAttribute("id", "myButton");
button.setAttribute("class", "button-style");

// add an event listener to the button
button.addEventListener("click", function () {
  window.location.href = "../index.html";
});

// append the button to the DOM
document.body.appendChild(button);
window.addEventListener("scroll", reveal);
function reveal() {
  var reveals = document.querySelectorAll(".reveal");

  for (var i = 0; i < reveals.length; i++) {
    var windowHeight = window.innerHeight;
    var revealtop = reveals[i].getBoundingClientRect().top;
    var revealPoint = 150;

    if (revealtop < windowHeight - revealPoint) {
      reveals[i].classList.add("active");
    } else {
      reveals[i].classList.remove("active");
    }
  }
}

var modal = document.getElementById("myModal");
var btn = document.getElementById("first");
var span = document.getElementsByClassName("close")[0];
btn.onclick = function () {
  modal.style.display = "block";
};
span.onclick = function () {
  modal.style.display = "none";
};
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

function quan() {
  var a = document.getElementsByName("filling");
  var p, i;

  for (i = 0; i < a.length; i++) {
    if (a[i].checked) {
      switch (a[i].value) {
        case "Buff":
          p = 120;
          break;
        case "Chicken":
          p = 150;
          break;
        case "Veg":
          p = 110;
          break;
        case "Pork":
          p = 150;
      }
    }
  }

  var x = Number(document.getElementById("fquan").value);
  var total = x * p;
  if (isNaN(x) == 0) {
    document.getElementById("steam-price").innerHTML = "Rs. " + total;
  } else {
    document.getElementById("steam-price").innerHTML = "Invalid Quantity.";
  }
}

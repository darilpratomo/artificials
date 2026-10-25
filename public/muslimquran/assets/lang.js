// Shows the page in Indonesian or English: the visitor's earlier choice, else the browser language.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("mq-lang"); } catch (e) {}
  var prefers = (navigator.language || "en").toLowerCase();
  var lang = saved || (prefers.indexOf("id") === 0 || prefers.indexOf("in") === 0 ? "id" : "en");

  function apply(next) {
    lang = next;
    root.classList.add("js");
    root.classList.remove("show-en", "show-id");
    root.classList.add("show-" + lang);
    root.setAttribute("lang", lang);
    document.querySelectorAll("[data-lang]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-lang") === lang));
    });
    var title = document.querySelector("meta[name='title-" + lang + "']");
    if (title) document.title = title.getAttribute("content");
  }

  apply(lang);
  document.addEventListener("DOMContentLoaded", function () {
    apply(lang);
    document.querySelectorAll("[data-lang]").forEach(function (button) {
      button.addEventListener("click", function () {
        apply(button.getAttribute("data-lang"));
        try { localStorage.setItem("mq-lang", lang); } catch (e) {}
      });
    });
  });
})();

document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("js-ready");

    var toggle = document.querySelector("[data-menu-toggle]");
    var nav = document.querySelector("[data-site-nav]");

    if (toggle && nav) {
        toggle.addEventListener("click", function () {
            var expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            nav.classList.toggle("is-open");
        });
    }

    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
        items.forEach(function (item) {
            item.classList.add("is-visible");
        });
        return;
    }

    var observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.18,
            rootMargin: "0px 0px -32px 0px"
        }
    );

    items.forEach(function (item, index) {
        if (index < 2) {
            item.classList.add("is-visible");
        }

        observer.observe(item);
    });
});

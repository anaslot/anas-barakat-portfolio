"use strict";

const year = document.getElementById("year");
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
const navigation = document.getElementById("mainNavigation");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navigation && window.bootstrap) {
  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 992 && navigation.classList.contains("show")) {
        window.bootstrap.Collapse.getOrCreateInstance(navigation).hide();
      }
    });
  });
}

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const data = new FormData(contactForm);
    const name = String(data.get("name")).trim();
    const email = String(data.get("email")).trim();
    const subject = String(data.get("subject")).trim();
    const message = String(data.get("message")).trim();
    const body = `Bonjour Anas,\n\n${message}\n\nCordialement,\n${name}\n${email}`;
    const mailto = `mailto:anasbarfeel28@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    formStatus.classList.remove("is-error");
    formStatus.textContent = "Votre messagerie va s’ouvrir avec le message préparé. Il vous restera à l’envoyer.";
    window.location.href = mailto;
  });
}

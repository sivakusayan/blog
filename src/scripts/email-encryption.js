// Make it harder for bots to scrape our email.
var encEmail = "c2l2YWt1c2F5YW5AZ21haWwuY29t";
const emailLink = document.getElementById("contact");
if (emailLink) {
    emailLink.tagName = "a";
    emailLink.setAttribute("href", "mailto:".concat(atob(encEmail)));
}
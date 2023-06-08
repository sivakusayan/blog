/* Copied and modified from Adrian Roselli's "Links list for print styles" post
https://adrianroselli.com/2018/09/links-list-for-print-styles.html
*/

let linksContainerInitialized = false;

function getLinks() {
    try {
        // Get all the links
        const links = document.querySelectorAll("main a[href]:not(.header-anchor,.back-to-top)");

        // Create emtpy arrays for later population.
        const linkHrefs = [];
        const linkNums = [];

        // If there is already a links box, remove it.
        const node = document.getElementById("LinkContainer");
        if (node) {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        }

        // Define the links container.
        const mainRegion = document.querySelector("main");
        const aside = document.createElement("aside");
        aside.id = "LinkContainer";

        // Define its heading.
        const h2 = document.createElement("h2");
        h2.innerText = "Links in This Page";

        // Define the list container.
        const orderedlist = document.createElement("ol");
        orderedlist.id = "LinkList";

        // Insert the new elements.
        mainRegion.appendChild(aside);
        const LinkContainer = document.getElementById("LinkContainer");
        LinkContainer.appendChild(h2);
        LinkContainer.appendChild(orderedlist);

        // Loop through the links
        for (let i = 0; i < links.length; i++) {
            // Create the superscript footnote reference
            const noteNum = document.createElement("sup");
            noteNum.setAttribute("class", "footnote");
            noteNum.innerText = i + 1;

            // Add it as a following sibling to the link
            links[i].parentNode.insertBefore(noteNum, links[i].nextSibling);

            // Get each link and replace the URL scheme identifier
            //const url = links[i].href.substr(links[i].href.indexOf('://')+3);
            const schemeMatch = /^mailto:|(https?|ftp):\/\//;
            const url = links[i].href.replace(schemeMatch, "");

            // Add a list item for each link.
            const li = document.createElement("li");
            li.innerText = url;
            document.getElementById("LinkList").appendChild(li);
        }

        // Add a class to the body to undo default link print styles
        const thisBody = document.querySelector("body");
        thisBody.setAttribute("class", "linklist");

        // Done
    } catch (e) {
        console.log("getLinks(): " + e);
    }
}

addEventListener("beforeprint", (event) => {
    if (!linksContainerInitialized) {
        getLinks();
        linksContainerInitialized = true;
    }
    document.body.querySelectorAll('details').forEach(detail => detail.setAttribute('open', true));
});
addEventListener("afterprint", (event) => {
    document.body.querySelectorAll('details').forEach(detail => detail.removeAttribute('open'));
})
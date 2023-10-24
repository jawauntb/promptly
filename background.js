function getPageContent() {
    return document.body.innerText; // or any other way to extract the content you need
}

function sendSelectedTextToContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const activeTab = tabs[0];
        if (!activeTab) {
            console.error('No active tab found');
            return;
        }
        chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: getSelectionText // Pass the function directly, not as a string
        }, function(results) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            const selection = results && results[0] && results[0].result;
            console.log("Retrieved selection:", selection);
            if (selection) {
                console.log("Sending message with selected text");
                if (activeTab.status === "complete") {
                    chrome.tabs.sendMessage(activeTab.id, { type: "highlightedText", text: selection });
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError.message);
                    } else {
                        console.log("Message sent successfully");
                    }
                }
            }
        });
    });
}

function getSelectionText() {
    return window.getSelection().toString();
}


function sendContent() {
    const contentLength = content.length;
    if (contentLength >= 2100) {
        const firstSlice = content.slice(0, 700);
        const middleSlice = content.slice(Math.floor(contentLength / 2) - 350, Math.floor(contentLength / 2) + 350);
        const lastSlice = content.slice(contentLength - 700);
        const truncatedContent = link + firstSlice + middleSlice + lastSlice;
        sendResponse({ content: truncatedContent });
    } else {
        sendResponse({ content: content });
    }
}

chrome.commands.onCommand.addListener(function(command) {
    if (command === "_execute_action") {
        // Open the popup (if it doesn't open by default)
        chrome.action.openPopup();
    } else if (command === "add_to_notenit") {
        sendSelectedTextToContentScript();
    }
});

chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
        id: "add_to_notenit_menu",
        title: "Add to NoteNit",
        contexts: ["selection"]
    });
});


chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "add_to_notenit_menu") {
        sendSelectedTextToContentScript();
    }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentPageContent") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const link = "url: " + activeTab.url + ", content: ";
            if (!activeTab) {
                console.error('No active tab found');
                return;
            }
            chrome.scripting.executeScript({
                target: {tabId: activeTab.id},
                function: getPageContent
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                const content = results && results[0] && results[0].result;
                if (content) {
                    sendContent(content)
                } else {
                    console.error('No content found');
                }

            });
        });
        return true;  // Keeps the message channel open for sendResponse
    }
});
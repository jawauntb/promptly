function getPageContent() {
    return document.body.innerText; // or any other way to extract the content you need
}

// function sendContent(content, link) {
//     const contentLength = content.length;
//     if (contentLength >= 2100) {
//         const firstSlice = content.slice(0, 700);
//         const middleSlice = content.slice(Math.floor(contentLength / 2) - 350, Math.floor(contentLength / 2) + 350);
//         const lastSlice = content.slice(contentLength - 700);
//         const truncatedContent = link + firstSlice + middleSlice + lastSlice;
//         sendResponse({ content: truncatedContent });
//     } else {
//         sendResponse({ content: content });
//     }
// }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentPageContent") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const link = "url: " + activeTab.url + ", content: ";
            if (!activeTab) {
                console.error('No active tab found');
                return;
            }
            console.log(message, sender);
            chrome.scripting.executeScript({
                target: {tabId: activeTab.id},
                function: getPageContent
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.log('err', results);
                    console.error(chrome.runtime.lastError);
                    return;
                }

                const content = results && results[0] && results[0].result;
                if (content) {
                    const contentLength = content.length;
                    if (contentLength >= 2700) {
                        const firstSlice = content.slice(0, 900);
                        const middleSlice = content.slice(Math.floor(contentLength / 2) - 450, Math.floor(contentLength / 2) + 450);
                        const lastSlice = content.slice(contentLength - 900);
                        const truncatedContent = link + firstSlice + middleSlice + lastSlice;
                        sendResponse({ content: truncatedContent });
                    } else {
                        sendResponse({ content: content });
                    }
                } else {
                    console.error('No content found');
                }

            });
        });
        return true;  // Keeps the message channel open for sendResponse
    }
});


// This event is triggered when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu once during the extension's installation
    chrome.contextMenus.create({
        id: "add_to_notenit_menu",
        title: "Add to NoteNit",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add_to_notenit_menu") {
        sendSelectedTextToContentScript(info.selectionText);
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "_execute_action") {
        chrome.action.openPopup();
    } else if (command === "add_to_notenit") {
        // In case of keyboard shortcut, we don't have the selected text immediately
        sendSelectedTextToContentScript();
    }
});

function sendSelectedTextToContentScript(selectedText) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab) return;

        if (selectedText) {
            chrome.tabs.sendMessage(activeTab.id, { type: "highlightedText", text: selectedText }, response => {
                if(chrome.runtime.lastError){
                    console.error("Error sending message:", chrome.runtime.lastError);
                } else {
                    console.log("Confirmation received:", response);
                }
            });
        } else {
            chrome.tabs.sendMessage(activeTab.id, { type: "getSelectedText" }, response => {
                if(chrome.runtime.lastError){
                    console.error("Error sending message:", chrome.runtime.lastError);
                } else {
                    console.log("Selected text received:", response.text);
                    // Send the text back to the content script as a "highlightedText" message
                    chrome.tabs.sendMessage(activeTab.id, { type: "highlightedText", text: response.text });
                }
            });
        }
    });
}

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "add_to_notenit_menu") {
        sendSelectedTextToContentScript();
    }
});

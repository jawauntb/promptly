function getPageContent() {
    return document.body.innerText; // or any other way to extract the content you need
}

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
                    console.log('site has content')
                    const contentLength = content.length;
                    if (contentLength >= 2100) {
                        const firstSlice = content.slice(0, 700);
                        const middleSlice = content.slice(Math.floor(contentLength / 2) - 350, Math.floor(contentLength / 2) + 350);
                        const lastSlice = content.slice(contentLength - 700);
                        const truncatedContent = link + firstSlice + middleSlice + lastSlice;
                        sendResponse({ content: truncatedContent });
                    } else {
                        console.log("Content is not long enough, sending as is:", content);
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

const stopWords = new Set([
    "the", "and", "in", "of", "to", "a",
    "is", "on", "for", "with", "as", "by",
    "an", "at", "that", "it", "this", "are",
    "be", "or", "but", "not", "have", "which",
    "from", "can", "has", "will", "was", "if",
    "they", "their", "you", "all", "we", "about",
    "would", "when", "so", "there", "more", "one",
    "what", "who", "them", "some", "other", "these",
    "been", "may", "like", "than", "out", "into", "up",
    "do", "any", "your", "how", "just", "those", "he", "she",
    "its", "our", "also", "because", "could", "only", "even", "most",
    "over", "under", "between", "such", "being", "many", "through", "after",
    "before", "during", "against", "without", "while", "below", "above", "around",
    "across", "off", "his", "her", "their", "its", "my", "your", "our", "his", "her",
    "its", "my", "your", "our"
]);

function preprocessGoals(goals) {
    const keywords = [];
    goals.forEach(goal => {
        const words = goal.split(' ');
        const filteredWords = words.filter(word => !stopWords.has(word.toLowerCase()));
        keywords.push(...filteredWords);
    });
    return [...new Set(keywords)]; // Using Set to remove duplicates and then converting back to array
}

function extractRelevantText(text, keywords) {
    let relevantSections = [];

    keywords.forEach(keyword => {
        let index = text.indexOf(keyword);
        if (index !== -1) {
            let start = Math.max(0, index - 200);
            let end = Math.min(text.length, index + 200 + keyword.length);
            relevantSections.push(text.substring(start, end));
        }
    });

    if (relevantSections.length === 0) {  // No keyword matches
        relevantSections.push(text.substring(0, 500));
        let middleStart = Math.floor(text.length / 2) - 150;
        relevantSections.push(text.substring(middleStart, middleStart + 300));
        let endStart = text.length - 700;
        relevantSections.push(text.substring(endStart, endStart + 200));
    }

    return relevantSections.join(' ');
}


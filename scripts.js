const goalList = document.getElementById("goalList");
let isLoading = false;
let selectedGoals = [];

function storeGoals(goals, callback) {
    chrome.storage.sync.set({ userGoals: goals }, function() {
        if (chrome.runtime.lastError) {
            console.error('Error in chrome.storage.sync.set:', chrome.runtime.lastError.message);
        } else {
            console.log('Data is stored in Chrome storage, executing callback...');
            if (callback) {
                callback();
            };
        }
    });
}

function updateGoal(index, newGoalText) {
    retrieveGoals(goals => {
        goals[index] = newGoalText;
        storeGoals(goals, ()=>{});
    });
}

// goal | item list functionality
function retrieveGoals(callback) {
    chrome.storage.sync.get("userGoals", function(data) {
        callback(data.userGoals || []);
    });
}

function loadGoals() {
    retrieveGoals(goals => {
        goalList.innerHTML = "";
        goals.forEach((goal, index) => {
            const li = createGoalElement(goal, index);
            goalList.appendChild(li);
        });
    });
}

function saveGoal(goal, callback) {
    retrieveGoals(goals => {
        goals.push(goal);
        storeGoals(goals, callback);
    });
}

function deleteGoal(index) {
    retrieveGoals(goals => {
        goals.splice(index, 1);
        storeGoals(goals, ()=>{});
        loadGoals();
    });
}

function createGoalElement(goal, index) {
    // Create a div as the container for each goal item
    const div = document.createElement("div");
    div.className = "goal-item";
    div.id = "goal-item-" + index; // Assign a unique id to each goal item

    // Create another div to hold the goal text and delete button
    const goalItemContent = document.createElement("div");
    goalItemContent.className = "goal-item-content";
    goalItemContent.id = "goal-item-content" + index

    // Create and append the goal text span to goalItemContent
    const goalTextContainer = document.createElement("div");
    goalTextContainer.className = "text-container";
    goalTextContainer.id = "text-container-" + index;

    const goalText = document.createElement("span");
    goalText.className = "list-text";
    goalText.id = "list-text-" + index;
    goalText.textContent = goal;
    goalText.setAttribute('contenteditable', 'true');

    // Add event listener to persist changes
    goalText.addEventListener('blur', function() {
        updateGoal(index, this.textContent);
    });

    goalTextContainer.appendChild(goalText);
    goalItemContent.appendChild(goalTextContainer);

    const buttonsBox = document.createElement("div");
    buttonsBox.className = "list-button-box"
    buttonsBox.id = "list-button-box-" + index;

    // Create and append the check button to the buttonBox
    const checkButton = createCheckButton(index, goal);
    buttonsBox.appendChild(checkButton);

    // Create and append the play button to the buttonBox
    const playButton = createPlayButton(goal, index);
    buttonsBox.appendChild(playButton);

    // Create and append the copy button to the buttonBox
    const copyButton = createCopyButton(goal, index);
    buttonsBox.appendChild(copyButton);

    const deleteButton = createDeleteButton(index);
    buttonsBox.appendChild(deleteButton);

    // Append the delete button to goalItemContent
    goalItemContent.appendChild(buttonsBox);

    // Append goalItemContent to the main div
    div.appendChild(goalItemContent);

    const explanationTray = document.createElement("div");
    explanationTray.className = "explanation-tray";
    div.appendChild(explanationTray);

    return div;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getSelectedText") {
        // When background requests the selected text, send it back as a direct response
        const selectedText = window.getSelection().toString();
        if (selectedText) {
            sendResponse({ type: "highlightedText", text: selectedText });
        }
    }
    if (message.type === "highlightedText") {
        saveGoal(message.text, loadGoals);
    }
    // Required for async response: keep the message channel open until sendResponse is called
    return true;
});

function createDeleteButton(index) {
    // Create a div for the delete button
    const deleteButton = document.createElement("div");
    deleteButton.className = "delete-button";

    // Create a div for the "x" text inside the delete button
    const xText = document.createElement("i");
    xText.className = "fa-solid fa-x";
    xText.style.color = "white"
    deleteButton.appendChild(xText);

    deleteButton.addEventListener("click", () => deleteGoal(index));
    return deleteButton;
}

function createCopyButton(goal, index) {
    // Create a div for the copy button
    const copyButton = document.createElement("div");
    copyButton.className = "copy-button";

    // Create an icon element for the copy symbol
    const copyIcon = document.createElement("i");
    copyIcon.className = "fa-regular fa-copy"; // Using the Font Awesome class for the copy icon
    // Append the copy icon to the copy button
    copyButton.appendChild(copyIcon);

    // Add event listener to the copy button to handle the copy action
    copyButton.addEventListener("click", function() {
        // Copy the goal content to clipboard
        const textArea = document.createElement("textarea");
        textArea.value = goal;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    });

    return copyButton;
}

function createPlayButton(goal, index) {
    // Create a div for the play button
    const playButton = document.createElement("div");
    playButton.className = "play-button";

    // Create an icon element for the play symbol
    const playIcon = document.createElement("i");
    playIcon.className = "fa-solid fa-play";
    playIcon.style.color = "#ffffff";
    playButton.appendChild(playIcon);

    playButton.addEventListener("click", function () {
        isLoading = true;
        document.getElementById('check-site-button').classList.add('loading');
        document.getElementById('brand-area').classList.add('loading');
        playButton.classList.add('loading');
        makeAPIRequest({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: goal }
            ]
        }, function(response) {
            playButton.classList.remove('loading'); // Remove loading animation

            // Create and display the expand tray similar to the site check function
            const feedback = response;
            const expandTray = expandGoal(index, feedback);
            const goalContentBox = document.getElementById("goal-item-content" + index);
            goalContentBox.parentElement.appendChild(expandTray); 

            const existingExpandButton = document.getElementById("expand-button-" + index);
            if (!existingExpandButton) {
                const expandButton = createExpandButton(index);
                expandButton.style.display = "flex";
                const buttonBox = document.getElementById("list-button-box-" + index);
                buttonBox.appendChild(expandButton);
            }
            document.getElementById('brand-area').classList.remove('loading');
            document.getElementById('check-site-button').classList.remove('loading');
            playButton.classList.remove('loading');
            isLoading = false;
            // Automatically open the tray
            toggleExpandTray(index);
        });
    });
    return playButton;
}

function createCheckButton(index, goal) {
    const checkButton = document.createElement("div");
    checkButton.className = "check-button";

    const checkIcon = document.createElement("i");
    checkIcon.className = "fa-solid fa-check";
    checkIcon.style.color = "white";
    checkButton.appendChild(checkIcon);

    // Extract the goal text using the index
    const goalText = goal

    if (selectedGoals.includes(goalText)) {
        checkButton.classList.add('selected');
    }

    checkButton.addEventListener("click", function() {
        if (selectedGoals.includes(goalText)) {
            // If the goal is already selected, deselect it
            selectedGoals.splice(selectedGoals.indexOf(goalText), 1);
            checkIcon.style.color = "white";
            checkButton.classList.remove('selected');
        } else {
            // Otherwise, select the goal
            selectedGoals.push(goalText);
            checkIcon.style.color = "black";
            checkButton.classList.add('selected');
        }
        updateMetaItem();
    });

    return checkButton;
}
// expand tray functionality

function createExpandButton(index) {
    // Create a div for the delete button
    const expandButton = document.createElement("div");
    expandButton.className = "expand-button";
    expandButton.id = "expand-button-" + index;
    expandButton.style.display = "none"; // Initially hidden

    const plusText = document.createElement("i");
    plusText.id = "plus-text-" + index
    plusText.className = "fa-solid fa-plus";
    plusText.style.color = "white";
    expandButton.appendChild(plusText);

    expandButton.addEventListener("click", () => toggleExpandTray(index));
    return expandButton;
}

function expandGoal(index, feedback) {
    const expandTray = document.createElement("div");
    expandTray.className = "expand-tray";
    expandTray.id = "expand-tray-" + index;
    expandTray.style.display = "none"; // Set initial display to none
    expandTray.style.boxShadow = "0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset";
    expandTray.style.background = "#FFFF";
    expandTray.textContent = feedback; // Append the feedback
    return expandTray;
}


function toggleExpandTray(identifier) {
    const expandTray = document.getElementById("expand-tray-" + identifier);
    let targetElement;
    const expandButton = document.getElementById("expand-button-" + identifier);
    const plusText = document.getElementById("plus-text-" + identifier);
    // If identifier is a number, it's a goal item; otherwise, it's a custom element (like "meta-item-response")
    if (typeof identifier === "number") {
        targetElement = document.getElementById("goal-item-content" + identifier);
    } else {
        targetElement = document.getElementById(identifier);
    }

    if (expandTray.style.display === "none" || !expandTray.style.display) {
        expandButton.classList.add('selected');
        // plusText.className = "fa-solid fa-plus";
        plusText.classList.remove('fa-plus');
        plusText.classList.add('fa-minus');
        expandTray.style.display = "block";
        targetElement.style.borderBottomLeftRadius = "0px";
        targetElement.style.borderBottomRightRadius = "0px";
    } else {
        expandButton.classList.remove('selected');
        plusText.classList.remove('fa-minus');
        plusText.classList.add('fa-plus');
        expandTray.style.display = "none";
        targetElement.style.borderRadius = "10px";
    }
}

// display feedback functionality
function displayFeedback(feedbackList) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.visibility = 'visible';
    feedbackDiv.innerHTML = '';
    if (!feedbackList.length) {
        const p = document.createElement("p");
        p.textContent = "This site does not appear to be relevant to any of your stated goals"
        feedbackDiv.appendChild(p);
    }
}
// meta item functionality
function storeSelectedGoals() {
    chrome.storage.sync.set({ metaGoals: selectedGoals }, function() {
        if (chrome.runtime.lastError) {
            console.error('Error in chrome.storage.sync.set:', chrome.runtime.lastError.message);
        }
    });
}

function retrieveSelectedGoals(callback) {
    chrome.storage.sync.get("metaGoals", function(data) {
        callback(data.metaGoals || []);
    });
}

function updateMetaItem() {
    const metaItemContent = document.getElementById("meta-item-content");
    metaItemContent.innerHTML = ""; // Clear previous content
    selectedGoals.forEach((goalText, index) => {
        const span = document.createElement("span");
        span.className = "meta-item-span";
        span.textContent = goalText.length > 15 ? goalText.substring(0, 15) + "..." : goalText;

        const deleteButton = document.createElement("div");
        deleteButton.className = "meta-delete-button";
        const xText = document.createElement("i");
        xText.className = "fa-solid fa-x fa-xs";
        deleteButton.appendChild(xText);
        deleteButton.addEventListener("click", () => deleteMetaItem(goalText)); // We pass goalText instead of index
        span.appendChild(deleteButton);

        metaItemContent.appendChild(span);
    });
    // Add the check here:
    const metaItem = document.getElementById("meta-item");
    if (!selectedGoals.length) {
        metaItem.style.display = "none";
    } else {
        metaItem.style.display = "flex";
    }
}

function initializeMetaItem() {
    // Retrieve stored meta items and display them
    retrieveSelectedGoals(storedMetaGoals => {
        selectedGoals = storedMetaGoals;
        updateMetaItem();
    });
}


const clearButton = document.querySelector(".meta-item-clear");
clearButton.addEventListener("click", function() {
    selectedGoals = [];

    // Unselect checkmarks on all goal items
    const goalList = document.getElementById("goalList");

    Array.from(goalList.children).forEach(goalItem => {
        const checkButton = goalItem.querySelector(".check-button");
        checkButton.classList.remove('selected');
    });

    updateMetaItem();
    storeSelectedGoals();
    }
);

// Reference to the meta-item-copy button
const copyButton = document.querySelector(".meta-item-copy");

// Event listener to handle the copy action
copyButton.addEventListener("click", function() {
    const combinedText = selectedGoals.join(" ");

    // Using Clipboard API to copy text
    navigator.clipboard.writeText(combinedText).then(function() {
        console.log('Text successfully copied to clipboard!');
        // TODO: Add any visual feedback for successful copy here if needed
    }).catch(function(err) {
        console.error('Unable to copy text: ', err);
        // TODO: Handle the error, maybe inform the user about the failure
    });
});

// Run button: Combine texts and send to API
const runButton = document.querySelector(".meta-item-run");
runButton.addEventListener("click", function() {
    const combinedText = selectedGoals.join(" ");

    // Start loading animation
    isLoading = true;
    document.getElementById('brand-area').classList.add('loading');
    document.getElementById('check-site-button').classList.add('loading');
    runButton.classList.add('loading');

    // Make API request
    makeAPIRequest({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "user", content: combinedText }
        ]
    }, function(response) {
        // Stop loading animation
        runButton.classList.remove('loading');
        document.getElementById('brand-area').classList.remove('loading');
        isLoading = false;

        // Display the response in an expand tray beneath the meta item
        const feedback = response;
        const expandTray = createExpandTrayForElement("meta-item", feedback);
        const parent = document.getElementById('meta-item')
        parent.appendChild(expandTray);
        // If no existing expand button, create one
        const existingExpandButton = document.getElementById("expand-button-meta-item");
        if (!existingExpandButton) {
            const expandButton = createExpandButton("meta-item");
            expandButton.style.display = "flex";
            expandButton.style.width = '30px';
            expandButton.style.height = '30px';
            const buttonBox = document.getElementById("meta-item-buttons");
            buttonBox.appendChild(expandButton);
        }
        document.getElementById('brand-area').classList.remove('loading');
        document.getElementById('check-site-button').classList.remove('loading');
        runButton.classList.remove('loading');
        isLoading = false;
        // Automatically open the tray
        toggleExpandTray("meta-item");
    });
});

function deleteMetaItem(goalText) {
    const idx = selectedGoals.indexOf(goalText);
    if (idx > -1) {
        selectedGoals.splice(idx, 1); // Remove the goal from the array

        const goalList = document.getElementById("goalList");
        // Find the goal item with this text and reset its checkmark
        Array.from(goalList.children).forEach(goalItem => {
            const itemText = goalItem.querySelector(".list-text").textContent;
            if (itemText === goalText) {
                const checkButton = goalItem.querySelector(".check-button");
                checkButton.classList.remove('selected');
            }
        });

        updateMetaItem(); // Refresh the meta item
    }
}
// expand tray for meta items
function createExpandTrayForElement(elementId, feedback) {
    // Create the expand tray with the given feedback
    const expandTray = document.createElement("div");
    expandTray.className = "expand-tray";
    expandTray.id = "expand-tray-" + elementId;
    expandTray.style.display = "none"; // Set initial display to none
    expandTray.style.boxShadow = "0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset";
    expandTray.style.background = "#FFFDFA";
    expandTray.textContent = feedback; // Append the feedback
    return expandTray; // Return the expand tray in case further manipulation is needed
}

// api request stuff
async function summarizeContent(fulltext, callback) {
    const summaryRequestPayload = {
        model: "gpt-3.5-turbo",
        messages: [
            { role: "user", content: `Summarize the following site content for me: ${fulltext.content}` }
        ]
    };
    makeAPIRequest(summaryRequestPayload, (response) => {
        const summary = response;
        // console.log(`Summary: ${summary ? ` ${summary}` : ''}`);
        callback(summary);
    });
}

async function isContentRelevantToGoal(content, goal, callback) {
    // console.log('isContentRelevantToGoal', content, goal);
    const relevanceRequestPayload = {
        model: "gpt-3.5-turbo",
        messages: [
            // { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: `Is this text "${content}" relevant to my goal of "${goal}"? answer in this format: <yes/no>, <explanation>` }
        ]
    };

    makeAPIRequest(relevanceRequestPayload, (response) => {
        // console.log('relevanceRequestPayload', response)
        const [relevance, explanation] = response.split(', ');
        const isRelevant = relevance.toLowerCase() === 'yes';
        // const relevanceResponse = response
        console.log("isRelevant", isRelevant)
        // console.log(`relevance: ${relevanceResponse ? ` ${relevanceResponse}` : 'no answer'}`);
        callback({ isRelevant, explanation});;
    });
}

async function makeAPIRequest(payload, callback) {
    fetch('https://emojipt-jawaunbrown.replit.app/promptly', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payload })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data, 'data');
        if (data  && data.choices && data.choices.length > 0) {
            const result = data.choices[0].message.content;
            callback(result); // Send back the generated text
        } else {
            console.error('Unexpected API response:', data);
        }
    })
    .catch(error => console.error('Error:', error));
}

function attachResponse(relevanceResponse, feedbackList, index){
    const answer = relevanceResponse.isRelevant ? 'Yes' : 'No';
    const fullResponse = `${answer}, ${relevanceResponse.explanation}`
    // Select the goal item using its unique id and change its background color to green
    const matchingGoal = document.getElementById("list-text-" + index)
    matchingGoal.parentElement.classList.add("matched-item")

    const feedback = fullResponse;
    const expandTray = expandGoal(index, feedback);
    const goalContentBox = document.getElementById("goal-item-content" + index);
    goalContentBox.parentElement.appendChild(expandTray); // Append the expand tray to the parent of the matching goal

    const expandButton = createExpandButton(index);
    expandButton.style.display = "flex"; // Make the expand button visible
    const buttonBox = document.getElementById("list-button-box-" + index)
    buttonBox.appendChild(expandButton); // Append the expand button to the parent of the matching goal

    feedbackList.push(fullResponse);
}


document.addEventListener("DOMContentLoaded", function () {
    loadGoals();
    initializeMetaItem();
    const goalInput = document.getElementById("goalInput");
    document.getElementById('analyzeButton').addEventListener("click", async function() {
        if (isLoading) return; // Prevent multiple clicks while loading
        // console.log("this.classList",this.classList)
        chrome.runtime.sendMessage({ action: "getCurrentPageContent" }, (response) => {
            isLoading = true;
            document.getElementById('check-site-button').classList.add('loading');
            document.getElementById('brand-area').classList.add('loading');
            // const shortenedContent = response// Taking the first 1.5k characters
            summarizeContent(response, function (summary) {
                // console.log("response", response)
                retrieveGoals(goals => {
                    let feedbackList = [];
                    let completedGoals = 0;

                    if(goals.length === 0) {
                        displayFeedback(["No goals to analyze against."]);
                        return;
                    }
                    goals.forEach((goal, index) => {
                        isContentRelevantToGoal(summary, goal, function(relevanceResponse) {
                            console.log('isContentRelevantToGoal response isRelevant, explanation', relevanceResponse.isRelevant, relevanceResponse.explanation)
                            completedGoals++;

                            // Check if the relevanceResponse indicates a match
                            if (relevanceResponse.isRelevant) {
                                attachResponse(relevanceResponse, feedbackList, index)
                            }
                            // console.log('feedbackList', feedbackList, "completedGoals",completedGoals )
                            if (completedGoals === goals.length) {
                                displayFeedback(feedbackList);
                            }
                            document.getElementById('brand-area').classList.remove('loading');
                            document.getElementById('check-site-button').classList.remove('loading');
                            isLoading = false;
                        });
                    });
                    console.log('feedbackList', feedbackList)
                });
            });
        });
    });

    goalInput.addEventListener("keypress", function(e) {
        if (e.key === 'Enter') {  // Check if the 'Enter' key was pressed
            const goal = goalInput.value.trim();
            if (goal) {
                saveGoal(goal, () => {
                    goalInput.value = "";  // Clear the input field
                    loadGoals();
                });
            }
            e.preventDefault();  // Prevent the default behavior of the 'Enter' key (e.g., form submission)
        }
    });

    // Event listener for editing goal text
    goalList.addEventListener("click", function(e) {
        if (e.target.classList.contains("goalText")) {
            const goalTextElement = e.target;
            goalTextElement.contentEditable = true;
            goalTextElement.focus();
        }
    });

    goalList.addEventListener("click", function(e) {
        if (e.target.classList.contains("checkmark")) {
            const goalText = e.target.previousElementSibling.textContent;
            selectedGoals.push(goalText);
            updateMetaItem();
            storeSelectedGoals();
        }
    });

    // Event listener for when user stops typing in the goal text
    goalList.addEventListener("input", function(e) {
        if (e.target.classList.contains("goalText")) {
            const goalTextElement = e.target;
            // Here, you can update the goal text wherever you're storing it
            // For this example, let's just log the updated text
            // console.log(goalTextElement.innerText);
        }
    });

});
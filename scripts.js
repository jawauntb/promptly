const notesList = document.getElementById("notesList");

let isLoading = false;
let selectedNotes = [];

function storeNotes(notes, callback) {
    chrome.storage.local.set({ userNotes: notes }, function() {
        if (chrome.runtime.lastError) {
            console.error('Error in chrome.storage.local.set:', chrome.runtime.lastError.message);
        } else {
            console.log('Data is stored in local Chrome storage, executing callback...');
            if (callback) {
                callback();
            };
        }
    });
}


function updateNote(index, newNoteText) {
    retrieveNotes(notes => {
        notes[index] = newNoteText;
        storeNotes(notes, ()=>{});
    });
}


// Note | Item list functionality
function retrieveNotes(callback) {
    chrome.storage.local.get("userNotes", function(data) {
        callback(data.userNotes || []);
    });
}

function loadNotes() {
    retrieveNotes(notes => {
        notesList.innerHTML = "";
        notes.forEach((note, index) => {
            const li = createNoteElement(note, index);
            notesList.appendChild(li);
        });
    });
}

function saveNote(note, callback) {
    retrieveNotes(notes => {
        notes.push(note);
        storeNotes(notes, callback);
    });
}

function deleteNote(index) {
    retrieveNotes(notes => {
        notes.splice(index, 1);
        storeNotes(notes, ()=>{});
        loadNotes();
    });
}

function createNoteElement(note, index) {
    // Create a div as the container for each note item
    const div = document.createElement("div");
    div.className = "note-item";
    div.id = "note-item-" + index; // Assign a unique id to each note item

    // Create another div to hold the note text and delete button
    const noteItemContent = document.createElement("div");
    noteItemContent.className = "note-item-content";
    noteItemContent.id = "note-item-content" + index

    // Create and append the note text span to noteItemContent
    const noteTextContainer = document.createElement("div");
    noteTextContainer.className = "text-container";
    noteTextContainer.id = "text-container-" + index;

    const noteText = document.createElement("span");
    noteText.className = "list-text";
    noteText.id = "list-text-" + index;
    noteText.textContent = note;
    noteText.setAttribute('contenteditable', 'true');

    // Add event listener to persist changes
    noteText.addEventListener('blur', function() {
        updateNote(index, this.textContent);
    });

    noteTextContainer.appendChild(noteText);
    noteItemContent.appendChild(noteTextContainer);

    const buttonsBox = document.createElement("div");
    buttonsBox.className = "list-button-box"
    buttonsBox.id = "list-button-box-" + index;

    // Create and append the check button to the buttonBox
    const checkButton = createCheckButton(index, note);
    buttonsBox.appendChild(checkButton);

    // Create and append the play button to the buttonBox
    const playButton = createPlayButton(note, index);
    buttonsBox.appendChild(playButton);

    // Create and append the copy button to the buttonBox
    const copyButton = createCopyButton(note, index);
    buttonsBox.appendChild(copyButton);

    const deleteButton = createDeleteButton(index);
    buttonsBox.appendChild(deleteButton);

    // Append the delete button to noteItemContent
    noteItemContent.appendChild(buttonsBox);

    // Append noteItemContent to the main div
    div.appendChild(noteItemContent);

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
        saveNote(message.text, loadNotes);
    }
    // Required for async response: keep the message channel open until sendResponse is called
    return true;
});
// <div className="delete-button"><i className="fa solid fa-x"></i></div>
function createDeleteButton(index) {
    // Create a div for the delete button
    const deleteButton = document.createElement("div");
    deleteButton.className = "delete-button";

    // Create a div for the "x" text inside the delete button
    const xText = document.createElement("i");
    xText.className = "fa-solid fa-x";
    xText.style.color = "white"
    deleteButton.appendChild(xText);

    deleteButton.addEventListener("click", () => deleteNote(index));
    return deleteButton;
}

function createCopyButton(note, index) {
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
        // Copy the note content to clipboard
        const textArea = document.createElement("textarea");
        textArea.value = note;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    });

    return copyButton;
}

function createPlayButton(note, index) {
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
            model: "gpt-4-1106-preview",
            messages: [
                { role: "user", content: note }
            ]
        }, function(response) {
            // Create and display the expand tray similar to the site check function
            const feedback = response;
            const expandTray = expandNote(index, feedback);
            const noteContentBox = document.getElementById("note-item-content" + index);
            noteContentBox.parentElement.appendChild(expandTray);

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

function createCheckButton(index, note) {
    const checkButton = document.createElement("div");
    checkButton.className = "check-button";

    const checkIcon = document.createElement("i");
    checkIcon.className = "fa-solid fa-check";
    checkIcon.style.color = "white";
    checkButton.appendChild(checkIcon);

    // Extract the note text using the index
    const noteText = note

    if (selectedNotes.includes(noteText)) {
        checkButton.classList.add('selected');
    }

    checkButton.addEventListener("click", function() {
        if (selectedNotes.includes(noteText)) {
            // If the note is already selected, deselect it
            selectedNotes.splice(selectedNotes.indexOf(noteText), 1);
            checkIcon.style.color = "white";
            checkButton.classList.remove('selected');
        } else {
            // Otherwise, select the note
            selectedNotes.push(noteText);
            checkIcon.style.color = "black";
            checkButton.classList.add('selected');
        }
        updateComposition();
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

// function expandNote(index, feedback) {
//     const expandTray = document.createElement("div");
//     expandTray.className = "expand-tray";
//     expandTray.id = "expand-tray-" + index;
//     expandTray.style.display = "none"; // Set initial display to none
//     expandTray.style.boxShadow = "0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset";
//     expandTray.style.background = "#FFFF";
//     expandTray.textContent = feedback; // Append the feedback
//     return expandTray;
// }

function addToNotes(text) {
    saveNote(text, loadNotes)
}

function createAddToNotesButton(text) {
     // Create a div for the copy button
    const addButton = document.createElement("span");
    addButton.className = "add-button";

    // Create an icon element for the copy symbol
    const addIcon = document.createElement("i");
    addIcon.className = "fa-solid fa-notes-medical"; // Using the Font Awesome class for the copy icon
    // Append the copy icon to the copy button
    addButton.appendChild(addIcon);

    // Add event listener to the copy button to handle the copy action
    addButton.addEventListener("click", function() {
        // Copy the note content to clipboard
      addToNotes(text)
    });

    return addButton;
}

function createCopyAndAddButtonsForExpandTray(text, parent, index) {
    const copyButton = createCopyButton(text, index)
    const addButton = createAddToNotesButton(text, index)
    const expandButtons = document.createElement("div");
    expandButtons.className = "expand-button-box"
    expandButtons.id = "expand-buttons-"+ index
    expandButtons.appendChild(copyButton);
    expandButtons.appendChild(addButton);
    parent.appendChild(expandButtons);
}

// expand tray for compositions
function createExpandTrayForElement(elementId, feedback) {
    // Create the expand tray with the given feedback
    // const expandTray = document.createElement("div");
    // expandTray.className = "expand-tray";
    // expandTray.id = "expand-tray-" + elementId;
    // expandTray.style.display = "none"; // Set initial display to none
    // expandTray.style.boxShadow = "0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset";
    // expandTray.style.background = "#FFFDFA";
    // expandTray.textContent = feedback; // Append the feedback
    // return expandTray; // Return the expand tray in case further manipulation is needed
    return expandNote(elementId, feedback)
}

function expandNote(index, feedback) {
  const expandTray = document.createElement("div");
  expandTray.className = "expand-tray";
  expandTray.id = "expand-tray-" + index;
  expandTray.style.display = "none"; // Set initial display to none
  expandTray.style.boxShadow = "0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset";
  expandTray.style.background = "#FFFF";

  // Split the feedback into parts based on the code block syntax
  const parts = feedback.split(/(```.*?```)/gs);

  // Loop through each part and append it appropriately
  parts.forEach(part => {
    if (part.startsWith('```') && part.endsWith('```')) {
        // It's a code block, remove the backticks and create a preformatted element
        const codeContent = part.replace(/```/g, '').trim();
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        // Add text content to the code element
        code.textContent = codeContent;
        pre.appendChild(code);
        createCopyAndAddButtonsForExpandTray(codeContent.toString(), pre, index)
        expandTray.appendChild(pre);
    } else {
      // It's normal text, create a text node and append it
      expandTray.appendChild(document.createTextNode(part));
    }
  });
    createCopyAndAddButtonsForExpandTray(feedback, expandTray, index)
  return expandTray;
};


function toggleExpandTray(identifier) {
    const expandTray = document.getElementById("expand-tray-" + identifier);
    let targetElement;
    const expandButton = document.getElementById("expand-button-" + identifier);
    const plusText = document.getElementById("plus-text-" + identifier);
    // If identifier is a number, it's a note item; otherwise, it's a custom element (like "composition-response")
    if (typeof identifier === "number") {
        targetElement = document.getElementById("note-item-content" + identifier);
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
        p.textContent = "This site does not appear to be relevant to any of your stated notes"
        feedbackDiv.appendChild(p);
    }
}
// // composition item functionality
// function storeSelectedNotes() {
//     chrome.storage.sync.set({ composition: selectedNotes }, function() {
//         if (chrome.runtime.lastError) {
//             console.error('Error in chrome.storage.sync.set:', chrome.runtime.lastError.message);
//         }
//     });
// }

// Composition functionality
function storeSelectedNotes() {
    chrome.storage.local.set({ composition: selectedNotes }, function() {
        if (chrome.runtime.lastError) {
            console.error('Error in chrome.storage.local.set:', chrome.runtime.lastError.message);
        }
    });
}

// function retrieveSelectedNotes(callback) {
//     chrome.storage.sync.get("composition", function(data) {
//         callback(data.composition || []);
//     });
// }


function retrieveSelectedNotes(callback) {
    chrome.storage.local.get("composition", function(data) {
        callback(data.composition || []);
    });
}

function updateComposition() {
    const compositionContent = document.getElementById("composition-content");
    compositionContent.innerHTML = ""; // Clear previous content
    selectedNotes.forEach((noteText, index) => {
        const span = document.createElement("span");
        span.className = "composition-span";
        span.textContent = noteText.length > 15 ? noteText.substring(0, 15) + "..." : noteText;

        const deleteButton = document.createElement("div");
        deleteButton.className = "composition-delete-button";
        const xText = document.createElement("i");
        xText.className = "fa-solid fa-x fa-xs";
        deleteButton.appendChild(xText);
        deleteButton.addEventListener("click", () => deleteComposition(noteText)); // We pass noteText instead of index
        span.appendChild(deleteButton);

        compositionContent.appendChild(span);
    });
    // Add the check here:
    const composition = document.getElementById("composition");
    if (!selectedNotes.length) {
        composition.style.display = "none";
    } else {
        composition.style.display = "flex";
    }
}

function initializeComposition() {
    // Retrieve stored composition items and display them
    retrieveSelectedNotes(storedComposition => {
        selectedNotes = storedComposition;
        updateComposition();
    });
}


const clearButton = document.querySelector(".composition-clear");
clearButton.addEventListener("click", function() {
    selectedNotes = [];

    // Unselect checkmarks on all note items
    const notesList = document.getElementById("notesList");

    Array.from(notesList.children).forEach(noteItem => {
        const checkButton = noteItem.querySelector(".check-button");
        checkButton.classList.remove('selected');
    });

    updateComposition();
    storeSelectedNotes();
    }
);

// Reference to the composition-copy button
const copyButton = document.querySelector(".composition-copy");

// Event listener to handle the copy action
copyButton.addEventListener("click", function() {
    const combinedText = selectedNotes.join(" ");

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
const runButton = document.querySelector(".composition-run");
runButton.addEventListener("click", function() {
    const combinedText = selectedNotes.join(";\n ");

    // Start loading animation
    isLoading = true;
    document.getElementById('brand-area').classList.add('loading');
    document.getElementById('check-site-button').classList.add('loading');
    runButton.classList.add('loading');

    // Make API request
    makeAPIRequest({
        model: "gpt-4-1106-preview",
        messages: [
            { role: "user", content: combinedText }
        ]
    }, function(response) {
        // Stop loading animation
        runButton.classList.remove('loading');
        document.getElementById('brand-area').classList.remove('loading');
        isLoading = false;

        // Display the response in an expand tray beneath the composition item
        const feedback = response;
        const expandTray = createExpandTrayForElement("composition", feedback);
        const parent = document.getElementById('composition')
        parent.appendChild(expandTray);
        // If no existing expand button, create one
        const existingExpandButton = document.getElementById("expand-button-composition");
        if (!existingExpandButton) {
            const expandButton = createExpandButton("composition");
            expandButton.style.display = "flex";
            expandButton.style.width = '30px';
            expandButton.style.height = '30px';
            const buttonBox = document.getElementById("composition-buttons");
            buttonBox.appendChild(expandButton);
        }
        document.getElementById('brand-area').classList.remove('loading');
        document.getElementById('check-site-button').classList.remove('loading');
        runButton.classList.remove('loading');
        isLoading = false;
        // Automatically open the tray
        toggleExpandTray("composition");
    });
});

function deleteComposition(noteText) {
    const idx = selectedNotes.indexOf(noteText);
    if (idx > -1) {
        selectedNotes.splice(idx, 1); // Remove the note from the array

        const notesList = document.getElementById("notesList");
        // Find the note item with this text and reset its checkmark
        Array.from(notesList.children).forEach(noteItem => {
            const itemText = noteItem.querySelector(".list-text").textContent;
            if (itemText === noteText) {
                const checkButton = noteItem.querySelector(".check-button");
                checkButton.classList.remove('selected');
            }
        });

        updateComposition(); // Refresh the composition
    }
}


// api request stuff
async function summarizeContent(fulltext, callback) {
    const summaryRequestPayload = {
        model: "gpt-4-1106-preview",
        messages: [
            { role: "user", content: `Summarize the following site content for me: ${fulltext.content}` }
        ]
    };
    makeAPIRequest(summaryRequestPayload, (response) => {
        const summary = response;
        callback(summary);
    });
}

async function isContentRelevantToNote(content, note, callback) {
    const relevanceRequestPayload = {
        model: "gpt-4-1106-preview",
        messages: [
            // { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: `Is this text "${content}" relevant to my note: "${note}"? answer in this format: <yes/no>, <explanation>` }
        ]
    };

    makeAPIRequest(relevanceRequestPayload, (response) => {
        const [relevance, explanation] = response.split(', ');
        const isRelevant = relevance.toLowerCase() === 'yes';
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
        if (data  && data.choices && data.choices.length > 0) {
            const result = data.choices[0].message.content;
            callback(result); // Send back the generated text
        } else {
            console.error('Unexpected API response:', data);
        }
    })
    .catch(error => console.error('Error:', error));
}

function extractCodeBlock(response) {
  // This regular expression matches all instances of content within triple backticks
  const matches = response.match(/```(.*?)```/gs);
  if (!matches) return '';

  // Process each match to extract the content and wrap it in a code block
  return matches.map(match => {
    // Remove the backticks and trim whitespace
    const code = match.replace(/```/g, '').trim();
    // Return the code wrapped in a <pre><code> block for HTML rendering
    return `<pre><code>${code}</code></pre>`;
  }).join('\n'); // Join multiple code blocks with a newline if necessary
}


function attachResponse(relevanceResponse, feedbackList, index){
    const answer = relevanceResponse.isRelevant ? 'Yes' : 'No';
    const fullResponse = `${answer}, ${relevanceResponse.explanation}`
    // Select the note item using its unique id and change its background color to green
    const matchingNote = document.getElementById("list-text-" + index)
    matchingNote.parentElement.classList.add("matched-item")

    const feedback = fullResponse;
    const expandTray = expandNote(index, feedback);
    const noteContentBox = document.getElementById("note-item-content" + index);
    noteContentBox.parentElement.appendChild(expandTray); // Append the expand tray to the parent of the matching note

    const expandButton = createExpandButton(index);
    expandButton.style.display = "flex"; // Make the expand button visible
    const buttonBox = document.getElementById("list-button-box-" + index)
    buttonBox.appendChild(expandButton); // Append the expand button to the parent of the matching note

    feedbackList.push(fullResponse);
}


document.addEventListener("DOMContentLoaded", function () {
    loadNotes();
    initializeComposition();
    var inputElement = document.getElementById('noteInput');
    if(inputElement) {
        inputElement.focus();
    }
    const noteInput = document.getElementById("noteInput");
    document.getElementById('analyzeButton').addEventListener("click", async function() {
        if (isLoading) return; // Prevent multiple clicks while loading
        chrome.runtime.sendMessage({ action: "getCurrentPageContent" }, (response) => {
            isLoading = true;
            document.getElementById('check-site-button').classList.add('loading');
            document.getElementById('brand-area').classList.add('loading');
            // const shortenedContent = response// Taking the first 1.5k characters
            summarizeContent(response, function (summary) {
                retrieveNotes(notes => {
                    let feedbackList = [];
                    let completedNotes = 0;

                    if(notes.length === 0) {
                        displayFeedback(["No notes to analyze against."]);
                        return;
                    }
                    notes.forEach((note, index) => {
                        isContentRelevantToNote(summary, note, function(relevanceResponse) {
                            completedNotes++;

                            // Check if the relevanceResponse indicates a match
                            if (relevanceResponse.isRelevant) {
                                attachResponse(relevanceResponse, feedbackList, index)
                            }
                            if (completedNotes === notes.length) {
                                displayFeedback(feedbackList);
                            }
                            document.getElementById('brand-area').classList.remove('loading');
                            document.getElementById('check-site-button').classList.remove('loading');
                            isLoading = false;
                        });
                    });
                });
            });
        });
    });

    noteInput.addEventListener("keypress", function(e) {
        if (e.key === 'Enter') {  // Check if the 'Enter' key was pressed
            const note = noteInput.value.trim();
            if (note) {
                saveNote(note, () => {
                    noteInput.value = "";  // Clear the input field
                    loadNotes();
                });
            }
            e.preventDefault();  // Prevent the default behavior of the 'Enter' key (e.g., form submission)
        }
    });

    // Event listener for editing note text
    notesList.addEventListener("click", function(e) {
        if (e.target.classList.contains("noteText")) {
            const noteTextElement = e.target;
            noteTextElement.contentEditable = true;
            noteTextElement.focus();
        }
    });

    notesList.addEventListener("click", function(e) {
        if (e.target.classList.contains("checkmark")) {
            const noteText = e.target.previousElementSibling.textContent;
            selectedNotes.push(noteText);
            updateComposition();
            storeSelectedNotes();
        }
    });

    // Event listener for when user stops typing in the note text
    notesList.addEventListener("input", function(e) {
        if (e.target.classList.contains("noteText")) {
            const noteTextElement = e.target;
            // Here, you can update the note text wherever you're storing it
            // For this example, let's just log the updated text
        }
    });

});
import React { useState, useEffect } from 'react';
import './styles.css'; // Import your CSS file here

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

function App() {
    const [notes, setNotes] = useState(['Goal 1', 'Goal 2', 'Goal 3']);
    const [selectedNotes, setSelectedNotes] = useState([]);
    const notesList = document.getElementById("notesList");
    const [isLoading, setIsLoading] = useState(false);
    const [showExpandedTray, setShowExpandedTray] = useState(false);
    const noFeedbackResponse = "This site does not appear to be relevant to any of your stated notes"
    const [currentNote, setCurrentNote] = useState('');

    const handleEnterPress = (e) => {
        if (e.key === 'Enter') {
            const trimmedNote = note.trim();
            if (trimmedNote) {
                setNotes([...notes, trimmedNote]);
            }
        }
        e.preventDefault();
    }

    useEffect(() => {
        loadGoals();
        retrieveSelectedNotes(storedComposition => {
            selectedNotes = storedComposition;
            updateComposition();
        });
    }, [notes, selectedNotes]);

    // storage for notes
    function storeNotes(notes, callback) {
        chrome.storage.local.set({ userNotes: note }, function() {
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

    function retrieveNotes(callback) {
        chrome.storage.local.get("userNotes", function(data) {
            callback(data.userNotes || []);
        });
    }

    function updateNote(index, newNoteText) {
        retrieveNotes(notes => {
            notes[index] = newNoteText;
            storeNotes(notes, ()=>{});
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

    function copyNote(note) {
        const textArea = document.createElement("textarea");
        textArea.value = note;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    }


    function toggleLoading(loadingState) {
        setIsLoading(!loadingState);
    }

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
    async function isContentRelevantToNote(content, note, callback) {
        // console.log('isContentRelevantToNote', content, note);
        const relevanceRequestPayload = {
            model: "gpt-3.5-turbo",
            messages: [
                // { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: `Is this text "${content}" relevant to my note: "${note}"? answer in this format: <yes/no>, <explanation>` }
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

    function sendNoteToAI(note) {
        toggleLoading(isLoading);
        makeAPIRequest({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: note }
            ]
        }, function (response) {
            const feedback = response;
            const expandTray = expandNote(index, feedback);
            // then attach expandTray and button, then stop loading
            setShowExpandedTray(true);
        })
    }

    function sendCompositionToAI() {
        const combinedText = selectedNotes.join(";\n ");
        sendNoteToAI(combinedText);
    }

    const showLoadingBubbles = () => {
        return (
            <>
                <div class="bubble" id="bubble1"></div>
                <div class="bubble" id="bubble2"></div>
                <div class="bubble" id="bubble3"></div>
                <div class="bubble" id="bubble4"></div>
            </>
        )
    }
    const showCheckSiteButton = () => {
        return (
            <button id="analyzeButton" class="ellipse">Check Site</button>
        )
    }
    const showLoadingLogoSpinner = () => {
        return (
            <div class="spinning-logo"></div>
        )
    }
    const showLogo = () => {
        return (
            <img src="/images/todo3.png" alt="Promptly Logo" class="logo"/>
        )
    }

    function toggleNoteSelected(note, index) {
        let updatedSelectedNotes = ''
        if (selectedNotes.includes(note)) {
            // remove note from selected notes
            updatedSelectedNotes = selectedNotes.filter(selectedNote => note !== selectedNote)
        } else {
            updatedSelectedNotes = [...selectedNotes, note]
        }
        setSelectedNotes([...updatedSelectedNotes])
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
            deleteButton.addEventListener("click", () => deleteCompositionItem(noteText)); // We pass noteText instead of index
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

    function deleteCompositionItem(noteText) {
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

  return (
    <div className="container">
        <header class="header">
            <div class="brand-area" id="brand-area">
                <div class="logo-area">
                    {isLoading? showLoadingLogoSpinner() : showLogo()}
                </div>
                <a href="https://www.notenit.com/" target="_blank" style="text-decoration:none">
                    <h1>NoteNit</h1>
                </a>
            </div>
              <div id="check-site-button" class="check-site-button">
                  {isLoading ? showLoadingBubbles() : showCheckSiteButton()}
            </div>
        </header>

        <main class="main">
            <div class="input-area">
                  <input
                      type="text"
                      id="noteInput"
                      placeholder="Type something & press 'enter'..."
                      className="text-input"
                      onChange={(e) => setCurrentNote(e.target.value)}
                      onKeyPress={handleEnterPress}
                  />
            </div>
        </main>
        <div style={{ visibility: 'hidden' }} id="feedback"></div>
          {selectedNotes.length &&
                <section id="composition" class="composition">
                    <div class="composition-content" id="composition-content">
                        {
                            selectedNotes.map((selectedNote, index) => (
                                <span className="composition-span">
                                    {selectedNote.length > 15 ? selectedNote.substring(0, 15) + "..." : selectedNote}
                                    <div className="composition-delete-button"><i className="fa-solid fa-x fa-xs" onClick={deleteCompositionItem(selectedNote)}></i></div>
                                </span>
                            ))
                        }
                    </div>
                    <div class="composition-buttons" id="composition-buttons">
                        <div class="composition-run"><i class="fa-solid fa-play" onClick={sendCompositionToAI()}></i></div>
                        <div class="composition-clear"><i class="fa-solid fa-x" onClick={clearComposition()}></i></div>
                        <div class="composition-copy"><i class="fa-regular fa-copy" onClick={copyComposition()}></i></div>
                        <div class="composition-expand-button" id={`expand-button-${index}`} style={{ display: 'none' }}><i class="fa-regular fa-copy" onClick={copyComposition()}></i></div>
                  </div>
                  <div className="expand-tray"
                            style={{
                                display: 'flex',
                                boxShadow: '0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset',
                                background: '#FFFDFA',
                                width: '30px',
                                height: '30px',
                            }}
                            id={`expand-tray-${index}`}
                        >
                            {feedback}
                        </div>
                </section>
          }
        <section id="notesList" class="note-items">
            {notes.map((note, index) => (
                <div className="note-item" key={index}>
                    <div className="note-item-content">
                        <div className="text-container">
                            <span className="list-text" contentEditable={true} onBlur={updateNote(index, text)}>
                                {text}
                            </span>
                        </div>
                        <div className="list-button-box">
                            <div className={`check-button ${selectedNotes.includes(note) ? 'selected' : ''}`}
                                onClick={toggleNoteSelected(note, index)}
                            >
                                <i className="fa-solid fa-check" style={{ color: selectedNotes.includes(noteText) ? 'black' : 'white' }}></i>
                            </div>
                            <div className={`play-button ${isLoading ? 'loading' : ''}`}
                                onClick={sendNoteToAI(note)}
                            >
                                <i className="fa-solid fa-play" style={{ color: "#ffffff" }}></i>
                            </div>
                            <div className="copy-button" onClick={copyNote(note)}>
                                <i className="fa-regular fa-copy"></i>
                            </div>
                            <div className="delete-button" onClick={deleteNote(index)}>
                                <i className="fa solid fa-x"></i>
                            </div>
                            <div className="expand-button" id={`expand-button-${index}`} style={{ display: 'none' }} onClick={setShowExpandedTray(!showExpandedTray)}>
                                <i id={`plus-text-${index}`} className={isExpanded? "fa-solid fa-minus": "fa-solid fa-plus"} style={{ color: 'white' }} />
                            </div>
                        </div>
                        <div className="expand-tray"
                            style={{
                                display: 'none',
                                boxShadow: '0px 4px 4px 2px rgba(0, 0, 0, 0.25) inset',
                                background: '#FFFDFA',
                            }}
                            id={`expand-tray-${index}`}
                        >
                            {feedback}
                        </div>
                    </div>
                </div>
              ))}
        </section>
    </div>
  );
}

export default App;